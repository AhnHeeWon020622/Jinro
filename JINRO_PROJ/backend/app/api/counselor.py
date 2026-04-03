from fastapi import Request, APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import SessionLocal
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask

from app.schemas.counselor import (
    CounselorLoginRequest, CategoryCreateRequest,
    CounselorModifyInfo, ScheduleDetailResponse,
    ScheduleListResponse, ScheduleUpdateRequest,
    ReportConUpdateRequest, FinalReportSave,
    RecordingAnalyze
)
from sqlalchemy import func, or_, and_, case
from app.models.schema_models import (
    Counselor, Client, Category, Counseling,
    ReportAiV, AiAnalyze, ReCommentEnum,
    ReportFinal, ReportCon, ReportAiM
)

from datetime import datetime
from fastapi import BackgroundTasks # FastAPI가 제공하는 비동기 작업 실행

import requests, os, json
import httpx


router = APIRouter(prefix="/counselor", tags=["Counselor (상담사)"])

BACKEND_BASE_URL = os.getenv("BACKEND_URL")
AI_SERVER_BASE_URL = os.getenv("AI_SERVER_URL")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===============================
# 🔹 로그인
# ===============================
@router.post("/login")
def login(login_data: CounselorLoginRequest, request: Request, db: Session = Depends(get_db)):

    counselor_obj = db.query(Counselor).filter(
        Counselor.login_id == login_data.login_id
    ).first()

    if not counselor_obj:
        return {"success": False, "message": "존재하지 않는 아이디입니다."}
    if counselor_obj.pw != login_data.pw:
        return {"success": False, "message": "비밀번호가 일치하지 않습니다."}
    if counselor_obj.active_yn != 'Y':
        return {"success": False, "message": "비활성화된 계정입니다."}

    request.session['counselor_id']   = counselor_obj.counselor_id
    request.session['counselor_name'] = counselor_obj.name

    return {
        "success":     True,
        "message":     f"{counselor_obj.name}님 환영합니다!",
        "name":        counselor_obj.name,
        "counselor_id": counselor_obj.counselor_id
    }


# ===============================
# 🔹 카테고리 API
# ===============================
@router.post("/category")
def create_or_update_category(request: CategoryCreateRequest, db: Session = Depends(get_db)):
    try:
        existing = db.query(Category).filter(Category.title == request.title).first()
        if existing:
            existing.url    = request.url
            existing.kind   = request.kind
            existing.survey = request.survey
        else:
            db.add(Category(title=request.title, url=request.url, kind=request.kind, survey=request.survey))
        db.commit()
        return {"success": True, "message": "카테고리 저장 완료"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/category")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return {
        "success": True,
        "data": [{"c_id": c.c_id, "title": c.title, "url": c.url, "kind": c.kind, "survey": c.survey} for c in categories]
    }


@router.get("/category/kind/{kind}")        
def get_category_by_kind(kind: int, db: Session = Depends(get_db)):
    categories = db.query(Category).filter(Category.kind == kind).all()
    return {
        "success": True,
        "data": [{"c_id": c.c_id, "title": c.title, "url": c.url, "kind": c.kind, "survey": c.survey} for c in categories]
    }


@router.get("/category/detail/{c_id}")     
def get_category_detail(c_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.c_id == c_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다.")
    return {
        "success": True,
        "data": {"c_id": category.c_id, "title": category.title, "url": category.url,
                 "kind": category.kind, "survey": category.survey}
    }


@router.put("/category/{c_id}")
def update_category(c_id: int, request: CategoryCreateRequest, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.c_id == c_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다.")
    category.title = request.title
    category.url   = request.url
    category.kind  = request.kind
    category.survey = request.survey
    db.commit()
    return {"success": True, "message": "카테고리 수정 완료"}


# ===============================
# 🔹 영상 리스트 / 영상 URL
# ===============================
@router.get("/recording/dates/{client_id}")  
def get_video_list(client_id: int, db: Session = Depends(get_db)):
    try:
        counseling_by_client = db.query(Counseling).filter(
            Counseling.client_id == client_id,
            Counseling.datetime != None,
            ).order_by(Counseling.datetime.desc()).all()
        
        data = []
        if (len(counseling_by_client) > 0):
            for d in counseling_by_client:
                data.append({
                    "counseling_id": d.counseling_id,
                    "datetime": d.datetime,
                    "complete_yn": d.complete_yn,
                    "regdate": d.regdate.strftime("%Y-%m-%d"),
                    "client_id": d.client_id
                })
        
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"날짜 불러오기 오류: {str(e)}")

@router.post("/recording/analyze")
async def set_recording_analyze(record_analyze: RecordingAnalyze,  db: Session = Depends(get_db)):
    
    try:
        report_con = db.query(ReportCon).filter(
            ReportCon.counseling_id == record_analyze.counseling_id
        ).first()

        if not report_con:
            raise HTTPException(status_code=404, detail="report_con 없음")

        report_ai_m = db.query(ReportAiM).filter(
            ReportAiM.con_rep_id == report_con.con_rep_id
        ).first()

        if not report_ai_m:
            raise HTTPException(status_code=404, detail="AI 분석 데이터 없음")

        data = {}
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{AI_SERVER_BASE_URL}/ai/api/summarize',
                json={
                    "text": report_ai_m.stt_text,
                    record_analyze.prompt and "system_prompt": record_analyze.prompt,
                    },
                timeout=120.0,  # 120초 대기 (필요에 따라 조절)
                )
            data = response.json()

            print(data)
        
        if data["success"]:
            report_ai_m.prompt = record_analyze.prompt
            report_ai_m.ai_m_comment = data["summary"]

        db.commit()

        return {"success": True, "data": report_ai_m}       

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"대화 분석 오류: {str(e)}")


@router.get("/video/{ai_v_erp_id}")
def get_video(ai_v_erp_id: int, db: Session = Depends(get_db)):
    video = db.query(ReportAiV).filter(ReportAiV.ai_v_erp_id == ai_v_erp_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="영상 없음")
    return {"success": True, "url": video.url}


# ===============================
# 🔹 상담 리포트 목록
# ===============================
@router.get("/conversation/list/{counseling_id}")
def get_conversation_list(counseling_id: int, db: Session = Depends(get_db)):
    cons = db.query(ReportCon).filter(ReportCon.counseling_id == counseling_id).all()
    return {
        "success": True,
        "data": [{"id": c.con_rep_id, "date": c.reg_date.strftime("%Y-%m-%d")} for c in cons]
    }


# ===============================
# 🔹 상담 일지(REPOR_CON) 조회
#    GET /counselor/report/con/{counseling_id}
#    CCounseling.jsx useEffect에서 호출
#    → pComplete로 이미 생성된 레코드 조회
#    → 내담자 이름 함께 반환
# ===============================
@router.get("/report/con/{counseling_id}")
def get_report_con(counseling_id: int, db: Session = Depends(get_db)):

    report = db.query(ReportCon).filter(
        ReportCon.counseling_id == counseling_id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="상담 일지를 찾을 수 없습니다.")

    counseling = db.query(Counseling).filter(
        Counseling.counseling_id == counseling_id
    ).first()

    client_name = ""
    if counseling:
        client = db.query(Client).filter(Client.client_id == counseling.client_id).first()
        client_name = client.name if client else ""

    return {
        "success": True,
        "data": {
            "con_rep_id":      report.con_rep_id,
            "title":           report.title,
            "con_rep_comment": report.con_rep_comment,
            "complete_yn":     report.complete_yn,
            "client_name":     client_name,
        }
    }


# ===============================
# 🔹 상담 일지(REPOR_CON) 저장
#    PUT /counselor/report/con/{counseling_id}
#    CCounseling.jsx 작성완료 버튼에서 호출
#    → 기존 레코드 UPDATE (pComplete가 INSERT 했으므로)
# ===============================
@router.put("/report/con/{counseling_id}")
def update_report_con(counseling_id: int, data: ReportConUpdateRequest, db: Session = Depends(get_db)):

    report = db.query(ReportCon).filter(
        ReportCon.counseling_id == counseling_id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="상담 일지를 찾을 수 없습니다.")

    report.title           = data.title
    report.con_rep_comment = data.con_rep_comment
    report.complete_yn     = data.complete_yn

    counseling = db.query(Counseling).filter(
        Counseling.counseling_id == counseling_id
    ).first()

    if counseling and counseling.complete_yn == 2:
        counseling.complete_yn = 3

    db.commit()

    return {
        "success": True,
        "message": "작성 완료" if data.complete_yn == 'Y' else "임시 저장 완료",
        "data": {
            "con_rep_id":  report.con_rep_id,
            "complete_yn": report.complete_yn,
        }
    }

# ===============================
# 🔹 AI 서버 비동기 전송
# ===============================
def send_audio_to_ai(counseling_id, file_bytes, filename, content_type, ai_report):

    try:

        files = {
            "file": (filename, file_bytes, content_type)
        }

        res = requests.post(
            f"{AI_SERVER_BASE_URL}/ai/audio/upload/{counseling_id}",
            files=files,
            data={"ai_report": ai_report},
            timeout=120
        )

        if res.status_code != 200:
            print("AI 서버 처리 실패:", res.text)

    except Exception as e:
        print("AI 서버 요청 실패:", str(e))
        

# ===============================
# 🔹 녹음 파일 업로드 React → Backend
# ===============================
@router.post("/report/con/{counseling_id}/audio")
async def upload_audio(
    counseling_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    try:
        # report_con 없어도 STT 저장 가능
        report = db.query(ReportCon).filter(
            ReportCon.counseling_id == counseling_id
        ).first()

        if not report:

            report = ReportCon(
                title="AI 상담 기록",
                con_rep_comment="",
                counseling_id=counseling_id,
                complete_yn='N'
            )

            db.add(report)
            db.commit()
            db.refresh(report)

        
        file_bytes = await file.read() # Backend → file 읽기

        ai_analyze = db.query(
            AiAnalyze.attention_score,
            AiAnalyze.emotion_score,
            AiAnalyze.survey_score,
            AiAnalyze.final_score,
            ReportAiV.category,
        ).select_from(Counseling) \
        .join(ReportAiV, Counseling.counseling_id == ReportAiV.counseling_id) \
        .join(AiAnalyze, ReportAiV.ai_v_erp_id == AiAnalyze.ai_v_erp_id) \
        .where(Counseling.counseling_id == counseling_id).all()
        
        ai_report = ""
        for i, ai in enumerate(ai_analyze):
            ai_report += f"{i+1}. {ai.category}는 집중도:{ai.attention_score} 흥미도:{ai.emotion_score} 설문점수:{ai.survey_score} 최종점수:{ai.final_score}\n"


        # BackgroundTasks 등록
        background_tasks.add_task(
            send_audio_to_ai,
            counseling_id,
            file_bytes,
            file.filename,
            file.content_type,
            ai_report
        )
        
        return {
            "success": True,
            "message": "AI 서버 전송 시작"
        }

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ===============================
# 🔹 최종 리포트 API
# ===============================
@router.get("/report/final/comment/{counseling_id}")
def get_final_comment(counseling_id: int, db: Session = Depends(get_db)):

    report = (
        db.query(ReportFinal)
        .filter(ReportFinal.counseling_id == counseling_id)
        .order_by(ReportFinal.final_id.desc())
        .first()
    )

    if not report:
        return {
            "success": True,
            "personality_comment": "",
            "career_comment": "",
            "final_comment": "",
            "complete": "N"
        }

    return {
        "success": True,
        "personality_comment": report.personality_comment,
        "career_comment": report.career_comment,
        "final_comment": report.final_comment,
        "complete": report.complete_yn
    }

import traceback
# 분야별 비교표(?)
@router.get("/report/final/{counseling_id}")
def get_final_report(counseling_id: int, db: Session = Depends(get_db)):
    try:
        rows = (
            db.query(
                ReportAiV.ai_v_erp_id,
                ReportAiV.category,
                AiAnalyze.attention_score,
                AiAnalyze.emotion_score,
                AiAnalyze.survey_score,
                AiAnalyze.final_score
            )
            .join(
                AiAnalyze,
                AiAnalyze.ai_v_erp_id == ReportAiV.ai_v_erp_id
            )
            .filter(ReportAiV.counseling_id == counseling_id)
            .order_by(ReportAiV.update_date.asc())
            .all()
        )
        table_data = []
        for idx, r in enumerate(rows):
            table_data.append({
                "video_id": idx + 1,
                "category": r.category,
                "attention_score": r.attention_score,
                "emotion_score": r.emotion_score,
                "survey_score": r.survey_score,
                "final_score": r.final_score
            })

        return {
            "success": True,
            "table": table_data
        }

    except Exception as e:
        print("get_final_report 에러:", repr(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/report/final/save")
def save_final_report(data: FinalReportSave, db: Session = Depends(get_db)):

    report = db.query(ReportFinal).filter(
        ReportFinal.counseling_id == data.counseling_id
    ).first()

    counseling = db.query(Counseling).filter(
        Counseling.counseling_id == data.counseling_id
    ).first()

    if report:

        report.personality_comment = data.personality_comment
        report.career_comment = data.career_comment
        report.final_comment = data.final_comment

    else:

        report = ReportFinal(
            counseling_id=data.counseling_id,
            personality_comment=data.personality_comment,
            career_comment=data.career_comment,
            final_comment=data.final_comment,
            complete_yn='N'
        )

        db.add(report)

    if counseling and counseling.complete_yn == 2:
        counseling.complete_yn = 3

    db.commit()

    return {"success": True, "message": "리포트 저장 완료"}


@router.post("/report/final/complete")
async def complete_final_report(data: FinalReportSave, db: Session = Depends(get_db)):

    report = db.query(ReportFinal).filter(
        ReportFinal.counseling_id == data.counseling_id
    ).first()

    counseling = db.query(Counseling).filter(
        Counseling.counseling_id == data.counseling_id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="최종 리포트가 존재하지 않습니다.")

    report.personality_comment = data.personality_comment
    report.career_comment = data.career_comment
    report.final_comment = data.final_comment

    report.complete_yn = 'Y'

    if counseling and counseling.complete_yn == 2:
        counseling.complete_yn = 3

    db.commit()

    async with httpx.AsyncClient() as client:
        await client.post(
            f'{AI_SERVER_BASE_URL}/ai/delete',
            json={
                "counseling_id": data.counseling_id
            },
            timeout=120.0,  # 120초 대기 (필요에 따라 조절)
        )

    return {"success": True, "message": "최종 리포트 작성 완료"}


@router.get("/ai_report/voice/file/{counseling_id}")
async def get_ai_report_voice_file(counseling_id: int, request: Request):
    try:
        # 1. 브라우저가 보낸 헤더에서 'Range' 추출 (탐색 바를 움직일 때 필요)
        req_headers = {}
        if "range" in request.headers:
            req_headers["range"] = request.headers["range"]

        client = httpx.AsyncClient()
        
        # 2. Server A로 Range 헤더를 포함하여 요청
        req = client.build_request(
            "GET", 
            f"{AI_SERVER_BASE_URL}/ai/audio/load/{counseling_id}", 
            headers=req_headers,
            )
        r = await client.send(req, stream=True)
        
        # 3. Server A의 응답 헤더 중 필요한 것만 추려서 브라우저로 전달
        # (Content-Type, Content-Length, Content-Range, Accept-Ranges 등)
        resp_headers = {
            k: v for k, v in r.headers.items()
            if k.lower() not in ("content-encoding", "transfer-encoding", "connection")
        }

        # 4. 상태 코드(200 또는 206)와 함께 스트리밍 응답 반환
        return StreamingResponse(
            r.aiter_raw(),
            status_code=r.status_code,
            headers=resp_headers,
            background=BackgroundTask(r.aclose)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상담내용 음성파일오류: {str(e)}")

# ===============================
# 🔹 AI 리포트 조회
# ===============================
@router.get("/ai-report/{counseling_id}")
def get_ai_report(counseling_id: int, db: Session = Depends(get_db)):

    try:

        report_ai_m = (
            db.query(ReportAiM)
            .join(ReportCon, ReportAiM.con_rep_id == ReportCon.con_rep_id)
            .filter(ReportCon.counseling_id == counseling_id)
            .order_by(ReportAiM.reg_date.desc())
            .first()
        )

        if not report_ai_m:
            return {"success": True, "data": None}

        return {
            "success": True,
            "data": {
                "ai_m_comment": report_ai_m.ai_m_comment,
                "stt_text": report_ai_m.stt_text
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상담내용 조회 오류: {str(e)}")





# ===============================
# 🔹 일정 관련 API
# ===============================
@router.get("/schedules", response_model=ScheduleListResponse)
def get_daily_schedules(
    request: Request,
    date: str = Query(..., description="조회할 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    counselor_id = request.session.get('counselor_id')
    if not counselor_id:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    try:
        records = db.query(Counseling, Client).join(
            Client, Counseling.client_id == Client.client_id
        ).filter(
            Counseling.counselor_id == counselor_id,
            Counseling.datetime     == date
        ).all()

        schedules = []
        for counseling, client in records:
            time_str   = counseling.reservation_time.strftime("%H:%M") if counseling.reservation_time else "미정"
            status_str = "완료" if counseling.complete_yn == 3 else "예정"
            schedules.append({
                "id": counseling.counseling_id,
                "client_id": client.client_id,
                "name": client.name,
                "time": time_str,
                "type": "진로 상담",
                "status": status_str
            })
        return {"success": True, "date": date, "schedules": schedules}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"일정 조회 중 오류 발생: {str(e)}")


@router.get("/pending-students")
def get_pending_students(request: Request, db: Session = Depends(get_db)):

    counselor_id = request.session.get('counselor_id')
    if not counselor_id:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    # 🔥 1. 영상 3개 + 모두 Y 조건
    subquery = (
        db.query(ReportAiV.counseling_id)
        .filter(ReportAiV.complete_yn == 'Y')
        .group_by(ReportAiV.counseling_id)
        .having(func.count(ReportAiV.ai_v_erp_id) == 3)
        .subquery()
    )

    # 🔥 2. 상담 상태 + 영상 완료 둘 다 만족
    records = db.query(Counseling, Client).join(
        Client, Counseling.client_id == Client.client_id
    ).filter(
        Counseling.counselor_id == counselor_id,

        # ✅ 영상 3개 완료
        Counseling.counseling_id.in_(subquery),

        # ✅ 아직 일정 안 잡힌 애만 (영상 상태)
        Counseling.complete_yn == 1
    ).all()

    results = [
        {
            "counseling_id": c.counseling_id,
            "name": cl.name,
            "studentNo": cl.c_id
        }
        for c, cl in records
    ]

    return {"success": True, "students": results}



@router.put("/schedule/{counseling_id}")
def update_counseling_schedule(counseling_id: int, request_data: ScheduleUpdateRequest, db: Session = Depends(get_db)):
    counseling = db.query(Counseling).filter(Counseling.counseling_id == counseling_id).first()
    if not counseling:
        raise HTTPException(status_code=404, detail="상담 기록을 찾을 수 없습니다.")

    try:
        datetime_str            = f"{request_data.date} {request_data.time}"
        parsed_reservation_time = datetime.strptime(datetime_str, "%Y-%m-%d %H:%M")
        counseling.datetime         = request_data.date
        counseling.reservation_time = parsed_reservation_time
        counseling.complete_yn      = 2
        db.commit()
        return {"success": True, "message": "일정 등록 완료"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"일정 등록 중 오류: {str(e)}")


# ===============================
# 🔹 학생 목록 / 상담 기록
# ===============================
@router.get("/students")
def get_students(db: Session = Depends(get_db)):
    students = (
        db.query(Client)
        .join(Counseling, Client.client_id == Counseling.client_id)
        .filter(
            # 일정 있음(2) 와 상담완료(3)만 뜨게
            Counseling.complete_yn >= 2
        )
        .distinct()
        .all()
    )

    return {
        "success": True,
        "data": [
            {
                "client_id": s.client_id,
                "name": s.name,
                "student_id": s.c_id,
                "tel": s.phone_num,
                "email": s.email
            }
            for s in students
        ]
    }

@router.get("/consultations/{client_id}")
def get_student_consultations(client_id: int, db: Session = Depends(get_db)):
    try:
        # 1. 상담 기록 조회 (Counseling 테이블)
        records = (
            db.query(Counseling)
            .outerjoin(ReportFinal, ReportFinal.counseling_id == Counseling.counseling_id)
            .filter(
                Counseling.client_id == client_id,
                Counseling.complete_yn >= 2
            )
            .order_by(
                # 🔥 1순위: 작성중 먼저
                case(
                    (ReportFinal.complete_yn == 'N', 0),
                    else_=1
                ),

                # 🔥 2순위: 날짜 기준 (완료는 update_date, 아니면 regdate)
                func.coalesce(
                    ReportFinal.update_date,
                    Counseling.regdate
                ).desc()
            )
            .all()
        )

        result = []
        for c in records:
            # 연관된 데이터들 조회
            final_report = db.query(ReportFinal).filter(ReportFinal.counseling_id == c.counseling_id).first()
            report_con   = db.query(ReportCon).filter(ReportCon.counseling_id == c.counseling_id).first()
            ai_videos    = db.query(ReportAiV).filter(ReportAiV.counseling_id == c.counseling_id).all()

            # 타이틀 설정
            display_title = report_con.title if (report_con and report_con.title) else "영상시청중"
            
            # 읽지 않은 알림(분석 실패 등) 개수
            unread_count = sum(
                1 for v in ai_videos
                if v.re_comment and v.re_comment != ReCommentEnum.SUCCESS
            )

            # 날짜 표시 로직
            display_date = "날짜 미정"
            if final_report:
                display_date = "작성중..."
                if final_report.complete_yn == 'Y' and final_report.update_date:
                    display_date = final_report.update_date.strftime("%Y-%m-%d")

            # 🌟 핵심 수정 부분: Counseling(변수 c)의 complete_yn 값을 기준으로 판단
            # 의도: 0 혹은 1이 아니면 'Y' (즉, 2:예정, 3:완료 상태일 때 'Y')
            is_final = 'Y' if c.complete_yn not in (0, 1) else 'N'

            result.append({
                "id":           c.counseling_id,
                "title":        display_title,
                "description":  final_report.final_comment if final_report else "상담 진행 중 입니다.",
                "date":         display_date,
                "unread":       unread_count,
                "final":        is_final,  # Counseling 기준값 대입
                "final_report_yn": final_report.complete_yn if final_report else "",
            })

        return {"success": True, "data": result}

    except Exception as e:
        import traceback
        print("상담 기록 조회 오류:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"기록 조회 중 오류: {str(e)}")


# ===============================
# 🔹 상담사 정보 조회
# ===============================
@router.get("/{counselor_id}")
def get_counselor(counselor_id: int, db: Session = Depends(get_db)):

    counselor_obj = db.query(Counselor).filter(
        Counselor.counselor_id == counselor_id
    ).first()

    if not counselor_obj:
        return {
            "success": False,
            "message": "존재하지 않는 상담사입니다."
        }

    return {
        "success": True,
        "data": {
            "name": counselor_obj.name,
            "phone": counselor_obj.phone_num,
            "email": counselor_obj.email
        }
    }

@router.put("/{counselor_id}")
def update_counselor(counselor_id: int, request: CounselorModifyInfo, db: Session = Depends(get_db)):
    counselor_obj = db.query(Counselor).filter(Counselor.counselor_id == counselor_id).first()
    if not counselor_obj:
        return {"success": False, "message": "존재하지 않는 상담사입니다."}
    counselor_obj.name      = request.name
    counselor_obj.phone_num = request.phone
    counselor_obj.email     = request.email
    db.commit()
    return {"success": True}

# ===============================
# 🔹 STT 결과값 받기
# ===============================
@router.post("/report/con/{counseling_id}/stt-result")
def receive_stt_result(counseling_id: int, data: dict, db: Session = Depends(get_db)):

    report = (
        db.query(ReportCon)
        .filter(ReportCon.counseling_id == counseling_id)
        .order_by(ReportCon.con_rep_id.asc())
        .first()
    )

    # 상담 일지 없어도 AI 분석 저장 가능
    if not report:

        report = ReportCon(
            title="AI 상담 기록",
            con_rep_comment="",
            counseling_id=counseling_id,
            complete_yn='N'
        )

        db.add(report)
        db.commit()
        db.refresh(report)

    stt_text = data.get("stt_text", "")
    # summary = data.get("summary", "") => 실제 DB 저장에는 사용하지 않음. 0313-10:44
    analysis = {
        "summary": data.get("summary", ""),
        "career_recommendation": data.get("career_recommendation", ""),
        "analysis": data.get("analysis", {})
    }

    existing = db.query(ReportAiM).filter(
        ReportAiM.con_rep_id == report.con_rep_id
    ).first()

    # STT 중복 저장 방지
    if existing:

        existing.stt_text = stt_text
        existing.ai_m_comment = analysis

    else:

        ai_report = ReportAiM(
            ai_m_comment=analysis,
            stt_text=stt_text,
            con_rep_id=report.con_rep_id
        )

        db.add(ai_report)

    db.commit()

    return {
        "success": True
    }

# ===============================
# 🔹 AI 처리 상태 조회
# ===============================
@router.get("/report/status/{counseling_id}")
def get_ai_process_status(counseling_id: int, db: Session = Depends(get_db)):

    report = db.query(ReportCon).filter(
        ReportCon.counseling_id == counseling_id
    ).first()

    if not report:
        return {"success": False, "status": "NOT_FOUND"}

    ai_report = db.query(ReportAiM).filter(
        ReportAiM.con_rep_id == report.con_rep_id
    ).first()

    if not ai_report:

        return {
            "success": True,
            "status": "PROCESSING"
        }

    return {
        "success": True,
        "status": "COMPLETED"
    }

# ===============================
# 🔹 상담 예약 date정보 가져오기
# ===============================
@router.get("/counseling/date/{counseling_id}")
def counseling_date(counseling_id: int, db: Session = Depends(get_db)):
    counseling = db.query(Counseling).filter(Counseling.counseling_id == counseling_id).first()
    if not counseling:
        return {
            "success": False,
            "date": None
        }
    return {
        "success": True,
        "date":  counseling.reservation_time.strftime("%Y-%m-%d")
    }


@router.get("/videos/{counseling_id}")
def get_videos_by_counseling(counseling_id: int, db: Session = Depends(get_db)):

    videos = db.query(ReportAiV).filter(
        ReportAiV.counseling_id == counseling_id
    ).all()

    return {
        "success": True,
        "data": [
            {
                "id": v.ai_v_erp_id,
                "name": v.category,
                "url": v.url
            }
            for v in videos
        ]
    }

@router.get("/ai-report/dates/{counseling_id}")
def get_ai_report_dates(counseling_id:int, db:Session=Depends(get_db)):

    videos = db.query(ReportAiV).filter(
        ReportAiV.counseling_id == counseling_id
    ).all()

    return {
        "success": True,
        "data":[
            {
                "ai_v_erp_id": v.ai_v_erp_id,
                "date": v.reg_date.strftime("%Y-%m-%d") if v.reg_date else "-"
            }
            for v in videos
        ]
    }


@router.get("/ai-report/{counseling_id}/{video_id}")
def get_ai_video_report(
    counseling_id: int,
    video_id: int,
    db: Session = Depends(get_db)
):

    video = db.query(ReportAiV).filter(
        ReportAiV.ai_v_erp_id == video_id,
        ReportAiV.counseling_id == counseling_id
    ).first()

    if not video:
        raise HTTPException(status_code=404, detail="영상 없음")

    analyze = db.query(AiAnalyze).filter(
        AiAnalyze.ai_v_erp_id == video_id
    ).first()

    focus_data = []
    interest_data = []

    if analyze and analyze.emotion_v_score:
        focus_data = analyze.emotion_v_score

    interest_data = [
        {
            "subject": video.category,
            "관심도": 70,
            "자신감": 65
        }
    ]

    return {
        "success": True,
        "data": {
            "focus": focus_data,
            "interest": interest_data,
            "summary": video.ai_comment if hasattr(video, "ai_comment") else ""
        }
    }

from pathlib import Path

@router.get("/local-videos/{counseling_id}")
def get_local_videos(counseling_id: int):

    video_dir = Path(
        "F:/JINRO_IS_BACK_PROJ/JINRO_PROJ/ai_server/videos"
    ) / str(counseling_id)

    if not video_dir.exists():
        return {"success": True, "data": []}

    files = []

    for f in video_dir.glob("*.webm"):

        files.append({
            "name": f.name,
            "url": f"{counseling_id}/{f.name}"
        })

    return {
        "success": True,
        "data": files
    }


# 최종리포트 PDF에 보여줄 정보추가(client 정보와 선택한 카테고리 정보)
@router.get("/report/pdf-info")
def get_pdf_info(clientId: int, counselingId: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.client_id == clientId).first()

    reports = (
        db.query(ReportAiV.category)
        .filter(ReportAiV.counseling_id == counselingId)
        .distinct()
        .all()
    )

    categories = [row[0] for row in reports]

    return {
        "success": True,
        "data": {
            "client": {
                "c_id": client.c_id if client else "",
                "phone_num": client.phone_num if client else "",
                "email": client.email if client else "",
                "birthdate": client.birthdate if client else ""
            },
            "category": categories
        }
    }