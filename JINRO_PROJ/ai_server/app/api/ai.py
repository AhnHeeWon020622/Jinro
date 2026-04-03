from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form, FastAPI
from fastapi.responses import FileResponse
from app.schemas.ai import (
    VideoAnalyze, SummaryRequest, VideoTask, AnalysisRequest, DeleteRequest
)
from app.services.stt_service import speech_to_text
from app.services.summary_service import summarize_text
from app.services.interest_analyze import analyze_video_with_face_crop
from app.services.focuse_service import analyze_video_to_json
from datetime import datetime
import shutil
import os
import requests
import ollama
import torch
import torch.nn as nn
from torchvision import models, transforms
import mediapipe as mp
from typing import Dict, Any
import cv2
import tensorflow as tf
import numpy as np
import tf_keras as keras
from app.services.focuse_service import FrameMobileNetV2
import httpx
import asyncio
import logging
import aiofiles



# =====================================================================
# ⭐ 로거 설정 추가
# =====================================================================
logger = logging.getLogger("ai_server.router")

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

UPLOAD_DIR = "audio_uploads"
UPLOAD_VIDEO = "videos"
DOWNLOAD_MODEL = 'model'
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(UPLOAD_VIDEO, exist_ok=True)
os.makedirs(DOWNLOAD_MODEL, exist_ok=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# =====================================================================
# 🧠 1. 디바이스 및 흥미도 예측 모델 설정
# =====================================================================

# 디바이스 설정

device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
logger.info(f"디바이스 설정 완료: {device}")

class_names = ['interested', 'not_interested']

test_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# 흥미도 모델
model = models.resnet50(pretrained=False)
num_ftrs = model.fc.in_features
model.fc = nn.Linear(num_ftrs, len(class_names))

# 저장된 모델 가중치 불러오기
model_path = os.path.join(BASE_DIR, '..', 'model', 'interest_classifier_best.pth')
if os.path.exists(model_path):
    model.load_state_dict(torch.load(model_path, map_location=device))
    logger.info(f"흥미도 예측 모델 가중치 로드 완료: {model_path}")
else:
    logger.warning(f"⚠️ 모델 파일을 찾을 수 없습니다: {model_path}")
    
model = model.to(device)
model.eval()

# 미디어파이프 얼굴 인식 모듈 초기화
mp_face_detection = mp.solutions.face_detection
face_detector = mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)
logger.info("MediaPipe 얼굴 인식 모듈 초기화 완료")

# =====================================================================
# 🧠 2. 집중도 예측 모델 설정 (전역 로드)
# =====================================================================
logger.info(f"💻 AI 서버 집중도 모델 로드 중... 디바이스: {device}")
focus_model_path = os.path.join(BASE_DIR, '..', 'model', 'best_focus_model_frame.pth')
# focus 모델 
focus_model = FrameMobileNetV2(num_classes=2).to(device)

if os.path.exists(focus_model_path):
    focus_model.load_state_dict(torch.load(focus_model_path, map_location=device))
    logger.info("✅ 집중도 모델 로드 완료!")
else:
    logger.warning(f"⚠️ 집중도 모델 파일을 찾을 수 없습니다: {focus_model_path}")
    
focus_model.eval()

# =====================================================================
# ⭐ [핵심 설정] GPU OOM 방지용 Semaphore (동시 분석 개수 제한)
# =====================================================================
MAX_CONCURRENT_JOBS = 1  
analysis_semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)
logger.info(f"GPU OOM 방지용 세마포어 설정 완료 (최대 동시 작업 수: {MAX_CONCURRENT_JOBS})")

# =====================================================================
# 🧠 2. 집중도 예측 모델 설정 (전역 로드)
# =====================================================================
print(f"💻 AI 서버 집중도 모델 로드 중... 디바이스: {device}")
focus_model_path = os.path.join(BASE_DIR, '..', 'model', 'best_focus_model_frame.pth')
focus_model = FrameMobileNetV2(num_classes=2).to(device)
focus_model.load_state_dict(torch.load(focus_model_path, map_location=device))
focus_model.eval()
print("✅ 집중도 모델 로드 완료!")

# =====================================================================
# ⭐ [핵심 설정] GPU OOM 방지용 Semaphore (동시 분석 개수 제한)
# =====================================================================
MAX_CONCURRENT_JOBS = 1  
analysis_semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)

router = APIRouter(prefix="/ai", tags=["Client (내담자)"])

@router.get("/")
def get_client_list():
    logger.debug("AI 서버 루트 엔드포인트 호출됨")
    return {"message": "AI 부분 입니다."}


# =====================================================================
# 🎤 3. 오디오 및 STT, 요약 기능 (기존 유지)
# =====================================================================
@router.post("/audio/stt")
async def audio_stt(data: dict):
    audio_path = data["audio_path"]
    logger.info(f"오디오 STT 변환 요청 수신: {audio_path}")
    text = await asyncio.to_thread(speech_to_text, audio_path)
    logger.info(f"오디오 STT 변환 완료: {audio_path}")
    return {"success": True, "text": text}

@router.post("/audio/analyze")
async def audio_analyze(data: dict):
    audio_path = data["audio_path"]
    logger.info(f"오디오 STT 분석 요청 수신: {audio_path}")
    text = await asyncio.to_thread(speech_to_text, audio_path)
    logger.info(f"오디오 STT 분석 완료: {audio_path}")
    return {"success": True, "stt_text": text}

@router.post("/audio/upload/{counseling_id}")
async def upload_audio(counseling_id: int, file: UploadFile = File(...), ai_report: str = Form(...)):
    logger.info(f"[{counseling_id}] 오디오 업로드 및 STT/요약 요청 수신")
    counseling_dir = os.path.join(UPLOAD_DIR, str(counseling_id))
    os.makedirs(counseling_dir, exist_ok=True)    

    ext = os.path.splitext(file.filename)[1]
    filename = f"counseling_{counseling_id}{ext}"
    file_path = os.path.join(counseling_dir, filename)


    # 병목 해결: 비동기 파일 저장
    async with aiofiles.open(file_path, "wb") as buffer:
        while content := await file.read(1024 * 1024):
            await buffer.write(content)
            
    logger.debug(f"[{counseling_id}] 오디오 파일 저장 완료: {file_path}")

    logger.info(f"[{counseling_id}] STT 변환 시작")
    # 병목 해결: 무거운 연산 스레드 분리
    stt_result = await asyncio.to_thread(speech_to_text, file_path)
    stt_text = stt_result["text"]
    
    logger.info(f"[{counseling_id}] STT 텍스트 요약 시작")
    summary = await asyncio.to_thread(summarize_text, stt_result, ai_report)

    try:
        logger.info(f"[{counseling_id}] 백엔드로 STT 및 요약 결과 전송 중...")
        # 병목 해결: httpx 비동기 통신
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{BACKEND_URL}/counselor/report/con/{counseling_id}/stt-result",
                json={
                    "stt_text": stt_text,
                    "summary": summary["summary"],
                    "analysis": summary
                },
                timeout=30.0
            )
            if res.status_code != 200:
                logger.error(f"[{counseling_id}] 백엔드 STT 저장 실패: {res.text}")
            else:
                logger.info(f"[{counseling_id}] 백엔드 STT 저장 성공")
    except Exception as e:
        logger.error(f"[{counseling_id}] 백엔드 API 호출 실패: {str(e)}")

    return {"success": True, "stt_text": stt_text}

@router.post("/api/summarize", summary="긴 글 구조화 요약")
async def summarize_api(summaryRequest: SummaryRequest):
    logger.info(f"Ollama 긴 글 구조화 요약 요청 (모델: {summaryRequest.model})")
    try:
        client = ollama.AsyncClient()
        response = await client.chat(
            model=summaryRequest.model,
            messages=[
                {'role': 'system', 'content': summaryRequest.system_prompt}, 
                {'role': 'user', 'content': summaryRequest.text}    
            ]
        )
        logger.info("Ollama 요약 완료")

        return {
            "success": True,
            "model": summaryRequest.model,
            "summary": response.message['content']
        }
    except Exception as e:
        logger.error(f"Ollama 요약 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/audio/load/{counseling_id}", summary="음성파일 가져오기")
async def audio_load(counseling_id: int):
    logger.debug(f"[{counseling_id}] 음성파일 다운로드 요청")
    counseling_dir = os.path.join(UPLOAD_DIR, str(counseling_id), f"counseling_{counseling_id}.webm")
    if not os.path.exists(counseling_dir):
        logger.warning(f"[{counseling_id}] 음성파일을 찾을 수 없음: {counseling_dir}")
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=counseling_dir, media_type="audio/mpeg")


# =====================================================================
# 🎬 4. 비디오 업로드 로직 (기존 유지)
# =====================================================================
def run_ai_analysis(counseling_id: int, client_id: int, report_id: int):
    # 이 부분은 이제 쓰이지 않을 수 있으나 (백엔드가 통합 지시를 내리므로)
    # 기존 코드와의 호환성을 위해 유지합니다.
    logger.info(f"AI 분석 시작 트리거 (레거시 호출) - Counseling: {counseling_id}, Client: {client_id}, Report: {report_id}")


@router.post("/upload-video")
async def ai_upload_video(
    background_tasks: BackgroundTasks,
    counseling_id: int = Form(...),
    client_id: int = Form(...),
    report_id: int = Form(...),
    c_id: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        logger.info(f"[{c_id}] 비디오 청크 업로드 요청 수신 (Counseling ID: {counseling_id})")
        counseling_folder = os.path.join(UPLOAD_VIDEO, str(counseling_id))
        os.makedirs(counseling_folder, exist_ok=True)

        files = os.listdir(counseling_folder)
        numbers = [
            int(f.split("_")[1].replace(".webm", "")) 
            for f in files if f.startswith(f"{c_id}_") and f.endswith(".webm") and f.split("_")[1].replace(".webm", "").isdigit()
        ]

        next_number = max(numbers, default=0) + 1
        filename = f"{c_id}_{next_number}.webm"
        file_path = os.path.join(counseling_folder, filename)

        # 병목 해결: aiofiles를 사용하여 비동기적으로 청크 단위 쓰기
        async with aiofiles.open(file_path, "wb") as buffer:
            while content := await file.read(1024 * 1024):
                await buffer.write(content)
            
        logger.info(f"[{c_id}] 비디오 청크 저장 완료: {filename} (번호: {next_number})")

        # 기존 로직 유지
        if next_number >= 3:
            logger.info(f"[{c_id}] 비디오 청크 3개 이상 도달 - 레거시 분석 백그라운드 등록")
            background_tasks.add_task(
                run_ai_analysis,
                counseling_id,
                client_id,
                report_id
            )

        return {
            "success": True,
            "message": "AI 서버 저장 성공",
            "filename": filename,
            "next_number": next_number
        }
    except Exception as e:
        logger.error(f"[{c_id}] 비디오 업로드 중 에러 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

# =====================================================================
# 🚀 5. 대망의 '웹훅 + 비동기 + 스레드 분리 + 세마포어' 통동 분석 엔진
# =====================================================================
async def run_full_analysis(request: AnalysisRequest):
    counseling_id = request.counseling_id
    c_id = request.c_id
    
    results = []
    max_retries = 24  # 5초 간격 * 24번 = 최대 2분 대기
    
    logger.info(f"📥 [AI 서버] {c_id} 학생의 영상 분석 요청 접수 완료! (대기열 진입) - 영상 {len(request.videos)}개")

    
    for task in request.videos:
        idx = task.idx
        sample_video_path = os.path.join(UPLOAD_VIDEO, str(counseling_id), f"{c_id}_{idx}.webm")
        
        # 💡 백엔드 대신 AI 서버가 파일이 올 때까지 5초씩 기다립니다 (가벼운 작업이라 메인 스레드에서 대기)
        file_ready = False
        logger.debug(f"[{c_id}] {idx}번째 영상 파일 대기 시작: {sample_video_path}")
        
        for attempt in range(max_retries):
            if os.path.exists(sample_video_path):
                file_ready = True
                logger.debug(f"[{c_id}] {idx}번째 영상 파일 감지됨! ({attempt+1}회 시도)")
                break
            await asyncio.sleep(5)
            
        if not file_ready:
            logger.error(f"❌ [AI 서버] 타임아웃: {sample_video_path} 파일이 없습니다. 0점 처리합니다.")
            results.append({
                "ai_v_erp_id": task.ai_v_erp_id,
                "survey_score": task.survey_score,
                "interest": 0.0,
                "focused": 0.0
            })
            continue
        

        logger.info(f"⏳ [AI 서버] {c_id} 학생의 {idx}번째 영상 - 입장권(GPU 세마포어) 대기 중...")
        
        # ⭐ 입장권을 획득해야만 분석 진입 (서버 터짐 방지)
        async with analysis_semaphore:
            logger.info(f"🚀 [AI 서버] {c_id} 학생의 {idx}번째 영상 - 분석 시작!")
            
            try:
                # ⭐ [핵심] 무거운 PyTorch 연산을 메인 카운터 직원에게서 빼앗아 뒷방(Thread)으로 던집니다!
                # 1) 흥미도 분석 
                logger.info(f"[{c_id}-{idx}] 흥미도 분석 모델(Face Crop) 가동 중...")
                df_results, interest_stats = await asyncio.to_thread(
                    analyze_video_with_face_crop,
                    sample_video_path, model, test_transforms, class_names, device, face_detector, 5, 0.3
                )
                interest_score = interest_stats["Interested_Percentage"] if interest_stats else 0.0
                logger.info(f"[{c_id}-{idx}] 흥미도 분석 완료: {interest_score}%")
                
                # 2) 집중도 분석
                logger.info(f"[{c_id}-{idx}] 집중도 분석 모델(MobileNetV2) 가동 중...")
                focus_stats = await asyncio.to_thread(
                    analyze_video_to_json,
                    sample_video_path, focus_model, device, 'test_img', 5
                )
                focus_score = focus_stats.get("focus_rate", 0.0)
                logger.info(f"[{c_id}-{idx}] 집중도 분석 완료: {focus_score}%")
                
                logger.info(f"🏁 [AI 서버] {c_id} 학생의 {idx}번째 영상 - 분석 완료! (입장권 반납)")
                
                results.append({
                    "ai_v_erp_id": task.ai_v_erp_id,
                    "survey_score": task.survey_score,
                    "interest": interest_score,
                    "focused": focus_score
                })
            
            except Exception as e:
                logger.error(f"❌ [AI 서버] {c_id} 학생의 {idx}번째 영상 분석 중 치명적 에러 발생: {e}", exc_info=True)
                results.append({
                    "ai_v_erp_id": task.ai_v_erp_id,
                    "survey_score": task.survey_score,
                    "interest": 0.0,
                    "focused": 0.0
                })
        
    # 💡 모든 영상 분석이 끝나면 백엔드로 웹훅(콜백) 전송!
    callback_payload = {
        "status": "success",
        "results": results
    }
    
    logger.info(f"[{c_id}] 모든 영상 분석 완료. 백엔드로 웹훅 전송 시도...")
    try:
        async with httpx.AsyncClient() as cl:
            callback_url = f"{BACKEND_URL}/client/analysis/callback"
            await cl.post(callback_url, json=callback_payload, timeout=10.0)
        logger.info(f"✅ [AI 서버] 백엔드로 {c_id} 학생의 최종 분석 결과(웹훅) 전송 완료!")
    except Exception as e:
        logger.error(f"❌ [AI 서버] 콜백 전송 실패: {e}")

# =====================================================================
# ⭐ 백엔드가 지시서를 던지는 통로
# =====================================================================
@router.post("/start-analysis")
async def start_analysis_endpoint(request: AnalysisRequest, background_tasks: BackgroundTasks):
    logger.info(f"📡 백엔드로부터 /start-analysis 지시서 수신 (Counseling ID: {request.counseling_id})")

    # 지시서를 받자마자 내부 큐에 넘기고 바로 응답 (다른 API도 즉시 처리 가능)
    background_tasks.add_task(run_full_analysis, request)
    
    logger.info(f"✅ 분석 작업 백그라운드 큐 등록 완료. 백엔드에 즉시 응답 반환됨.")
    return {"message": "분석 작업이 AI 서버 큐에 등록되었습니다."}


@router.post("/delete")
def video_delete(request: DeleteRequest):
    audio_path = os.path.join(UPLOAD_DIR, str(request.counseling_id))
    video_path = os.path.join(UPLOAD_VIDEO, str(request.counseling_id))

    if os.path.exists(audio_path):
        shutil.rmtree(audio_path)

    if os.path.exists(video_path):
        shutil.rmtree(video_path)

    return {
        "success": True
    }