from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from fastapi.responses import JSONResponse

import os
import cv2
import math
import numpy as np
import requests
import json  # 추가된 부분
from typing import List, Dict, Any, Optional

from app.schemas.ai import AnalyzeRequest

import mediapipe as mp

router = APIRouter(prefix="/focus-rule", tags=["focus (집중도)"])

# -----------------------------
# Landmark index for head pose & Eyes
# -----------------------------
LANDMARK_INDEX = {
    "nose_tip": 1,
    "chin": 199,
    "left_eye_outer": 33,   
    "right_eye_outer": 263,
    "mouth_left": 61,
    "mouth_right": 291,
}

LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]


# -----------------------------
# Utility (수학 및 기하학 연산)
# -----------------------------
def clamp(value: float, min_value: float = 0.0, max_value: float = 100.0) -> float:
    return max(min_value, min(max_value, value))

def normalized_to_pixel(landmark, image_width: int, image_height: int) -> tuple[float, float]:
    return landmark.x * image_width, landmark.y * image_height

def calculate_ear(eye_points: List[tuple[float, float]]) -> float:
    A = math.dist(eye_points[1], eye_points[5])
    B = math.dist(eye_points[2], eye_points[4])
    C = math.dist(eye_points[0], eye_points[3])
    if C == 0:
        return 0.0
    return (A + B) / (2.0 * C)

def rotation_matrix_to_euler_angles(rotation_matrix: np.ndarray) -> tuple[float, float, float]:
    sy = math.sqrt(rotation_matrix[0, 0] ** 2 + rotation_matrix[1, 0] ** 2)
    singular = sy < 1e-6
    if not singular:
        x = math.atan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
        y = math.atan2(-rotation_matrix[2, 0], sy)
        z = math.atan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
    else:
        x = math.atan2(-rotation_matrix[1, 2], rotation_matrix[1, 1])
        y = math.atan2(-rotation_matrix[2, 0], sy)
        z = 0
    return math.degrees(x), math.degrees(y), math.degrees(z)

def get_camera_matrix(image_width: int, image_height: int) -> np.ndarray:
    focal_length = image_width
    center = (image_width / 2, image_height / 2)
    return np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1],
    ], dtype=np.float64)

def get_face_center(face_landmarks, image_width: int, image_height: int) -> tuple[float, float]:
    xs = [normalized_to_pixel(lm, image_width, image_height)[0] for lm in face_landmarks.landmark]
    ys = [normalized_to_pixel(lm, image_width, image_height)[1] for lm in face_landmarks.landmark]
    return float(np.mean(xs)), float(np.mean(ys))

def normalize_angle(angle: float) -> float:
    while angle > 180: angle -= 360
    while angle < -180: angle += 360
    return angle

def calibrate_pitch(pitch: float) -> float:
    pitch = normalize_angle(pitch)
    if pitch < -90: pitch += 180
    elif pitch > 90: pitch -= 180
    return pitch

def estimate_head_pose(face_landmarks, image_width: int, image_height: int):
    image_points = np.array([
        normalized_to_pixel(face_landmarks.landmark[LANDMARK_INDEX["nose_tip"]], image_width, image_height),
        normalized_to_pixel(face_landmarks.landmark[LANDMARK_INDEX["chin"]], image_width, image_height),
        normalized_to_pixel(face_landmarks.landmark[LANDMARK_INDEX["left_eye_outer"]], image_width, image_height),
        normalized_to_pixel(face_landmarks.landmark[LANDMARK_INDEX["right_eye_outer"]], image_width, image_height),
        normalized_to_pixel(face_landmarks.landmark[LANDMARK_INDEX["mouth_left"]], image_width, image_height),
        normalized_to_pixel(face_landmarks.landmark[LANDMARK_INDEX["mouth_right"]], image_width, image_height),
    ], dtype=np.float64)

    model_points = np.array([
        (0.0, 0.0, 0.0),          
        (0.0, -63.6, -12.5),      
        (-43.3, 32.7, -26.0),     
        (43.3, 32.7, -26.0),      
        (-28.9, -28.9, -24.1),    
        (28.9, -28.9, -24.1),     
    ], dtype=np.float64)

    camera_matrix = get_camera_matrix(image_width, image_height)
    dist_coeffs = np.zeros((4, 1), dtype=np.float64)

    success, rotation_vector, translation_vector = cv2.solvePnP(
        model_points, np.ascontiguousarray(image_points), camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE
    )
    if not success:
        return None, None, None

    rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
    pitch, yaw, roll = rotation_matrix_to_euler_angles(rotation_matrix)

    return calibrate_pitch(pitch), normalize_angle(yaw), normalize_angle(roll)

# -----------------------------
# 프레임 분석 (성능 최적화 & EAR 추가)
# -----------------------------
def extract_frames_features(video_path: str, max_faces: int = 1) -> List[Dict[str, Any]]:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"영상을 열 수 없습니다: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    results_list = []
    
    skip_frames = max(1, int(fps / 5)) # 1초당 5프레임

    with mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False, max_num_faces=max_faces, refine_landmarks=True,
        min_detection_confidence=0.5, min_tracking_confidence=0.5
    ) as face_mesh:
        frame_index = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_index % skip_frames != 0:
                frame_index += 1
                continue

            timestamp = frame_index / fps
            image_height, image_width = frame.shape[:2]
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_result = face_mesh.process(rgb_frame)

            if not mp_result.multi_face_landmarks:
                results_list.append({
                    "timestamp": round(timestamp, 3), "frame_index": frame_index,
                    "face_detected": False, "is_eyes_closed": False
                })
                frame_index += 1
                continue

            face_landmarks = mp_result.multi_face_landmarks[0]
            face_center_x, face_center_y = get_face_center(face_landmarks, image_width, image_height)
            pitch, yaw, roll = estimate_head_pose(face_landmarks, image_width, image_height)

            left_eye_pts = [normalized_to_pixel(face_landmarks.landmark[i], image_width, image_height) for i in LEFT_EYE_INDICES]
            right_eye_pts = [normalized_to_pixel(face_landmarks.landmark[i], image_width, image_height) for i in RIGHT_EYE_INDICES]
            ear = (calculate_ear(left_eye_pts) + calculate_ear(right_eye_pts)) / 2.0

            results_list.append({
                "timestamp": round(timestamp, 3),
                "frame_index": frame_index,
                "face_detected": True,
                "face_center_x": face_center_x,
                "face_center_y": face_center_y,
                "yaw": yaw,
                "pitch": pitch,
                "ear": ear,
                "is_eyes_closed": ear < 0.22  
            })
            frame_index += 1

    cap.release()
    return results_list

def compute_frame_features(frames: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    results = []
    prev = None

    for frame in frames:
        if not frame["face_detected"]:
            frame.update({"movement": 0.0, "angle_change": 0.0})
            results.append(frame)
            prev = frame
            continue

        movement, angle_change = 0.0, 0.0
        if prev is not None and prev.get("face_detected"):
            movement = math.sqrt((frame["face_center_x"] - prev["face_center_x"])**2 + (frame["face_center_y"] - prev["face_center_y"])**2)
            angle_change = abs(frame["yaw"] - prev["yaw"]) + abs(frame["pitch"] - prev["pitch"])

        frame.update({"movement": movement, "angle_change": angle_change})
        results.append(frame)
        prev = frame

    return results

def calculate_focus_by_window(frames: List[Dict[str, Any]], window_seconds: int = 5) -> Dict[str, Any]:
    if not frames:
        return {"overall_focus_score": 0.0, "missing_ratio": 1.0, "dozing_ratio": 0.0}

    frame_features = compute_frame_features(frames)
    total_frames = len(frame_features)
    detected_frames = [f for f in frame_features if f["face_detected"]]
    detected_count = len(detected_frames)

    missing_ratio = (total_frames - detected_count) / total_frames if total_frames > 0 else 1.0

    if detected_count > 0:
        avg_movement = sum(f["movement"] for f in detected_frames) / detected_count
        avg_angle_change = sum(f["angle_change"] for f in detected_frames) / detected_count
        dozing_ratio = sum(1 for f in detected_frames if f["is_eyes_closed"]) / detected_count
    else:
        avg_movement, avg_angle_change, dozing_ratio = 0.0, 0.0, 0.0

    movement_penalty = min(20.0, (avg_movement / 8.0) * 20.0)      
    angle_penalty = min(20.0, (avg_angle_change / 12.0) * 20.0)    
    missing_penalty = min(40.0, missing_ratio * 50.0)              
    dozing_penalty = min(50.0, dozing_ratio * 60.0)                

    overall_focus_score = 100.0 - movement_penalty - angle_penalty - missing_penalty - dozing_penalty

    return {
        "overall_focus_score": clamp(round(overall_focus_score, 2)),
        "avg_movement": round(avg_movement, 2),
        "avg_angle_change": round(avg_angle_change, 2),
        "missing_ratio": round(missing_ratio, 2),
        "dozing_ratio": round(dozing_ratio, 2)
    }

# -----------------------------
# 2. 백그라운드 작업: 영상 분석 후 JSON 저장 함수
# -----------------------------
def process_and_save_json(counseling_id: str, client_id: str):
    # client_id가 튜플 형태 괄호('S2026099',)를 포함하고 있다면, 깔끔한 문자열로 정리합니다.
    clean_client_id = str(client_id).strip("()', ") 
    
    # 1. 현재 파일(data_ai.py)의 절대 위치를 기준으로 기준점(BASE_DIR)을 잡습니다.
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # 2. os.path.join을 사용해 안전하게 경로를 만듭니다.
    base_folder = os.path.join(BASE_DIR, "videos", str(counseling_id))
    result_folder = os.path.join(BASE_DIR, "test_video", str(counseling_id))
    
    os.makedirs(result_folder, exist_ok=True)
    
    analysis_results = []
    window_seconds = 5

    try:
        for i in range(1, 4):
            video_name = f"{clean_client_id}_{i}.webm"
            video_path = os.path.join(base_folder, video_name)

            if not os.path.exists(video_path):
                print(f"[경고] 영상 없음: {video_path}")
                analysis_results.append({
                    "video_number": i, "status": "not_found", "overall_focus_score": 0.0
                })
                continue
            
            frames = extract_frames_features(video_path)
            focus_result = calculate_focus_by_window(frames, window_seconds)

            analysis_results.append({
                "video_number": i,
                "status": "success",
                **focus_result
            })

        result_data = {
            "counseling_id": counseling_id,
            "client_id": clean_client_id, 
            "status": "completed",
            "results": analysis_results
        }
        
        json_file_path = os.path.join(result_folder, f"{clean_client_id}.json")
        with open(json_file_path, "w", encoding="utf-8") as f:
            json.dump(result_data, f, ensure_ascii=False, indent=4)
            
        print(f"[완료] 분석 성공! 결과가 {json_file_path} 에 저장되었습니다.")

    except Exception as e:
        print(f"[실패] 분석 중 에러 발생: {str(e)}")


# -----------------------------
# FastAPI 엔드포인트
# -----------------------------
@router.post("/start-analysis")
async def start_analysis(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    
    # 에러 방지를 위해 경로 검증(os.path.exists)은 주석 처리합니다.
    # (process_and_save_json 내부에서 개별 파일 존재 여부를 체크하므로 안전합니다.)
    
    background_tasks.add_task(
        process_and_save_json,
        counseling_id=request.counseling_id,
        client_id=request.client_id
    )

    return JSONResponse(content={
        "status": "processing",
        "counseling_id": request.counseling_id,
        "message": "영상이 정상적으로 접수되었습니다. 백그라운드에서 분석 후 JSON 파일로 저장합니다."
    })