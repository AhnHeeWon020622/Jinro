from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# 상담사 로그인
class CounselorLoginRequest(BaseModel):
    login_id: str
    pw: str

# 상담사 정보수정
class CounselorModifyInfo(BaseModel):
    name : str
    phone : str
    email : str
    

# 상담사 카테고리 url 추가
class CategoryCreateRequest(BaseModel):
    title: str
    url: str
    kind: int
    survey: List[Dict[str, Any]]


# 스케줄
class ScheduleDetailResponse(BaseModel):
    id: int
    time: str       # "HH:MM" 형식
    name: str       # 내담자 이름
    type: str       # 상담 종류 (일단 "진로 상담"으로 고정하거나 로직 추가 가능)
    status: str     # "예정" 또는 "완료"


class ScheduleListResponse(BaseModel):
    success: bool
    date: str
    schedules: List[ScheduleDetailResponse]

class ScheduleUpdateRequest(BaseModel):
    date: str  # 예: "2026-03-05"
    time: str  # 예: "14:00"


# 상담일지 저장 
class ReportConUpdateRequest(BaseModel):
    title:           str
    con_rep_comment: str
    complete_yn:     str = 'N'  # 'N': 임시저장, 'Y': 작성완료


class FinalReportSave(BaseModel):
    counseling_id: int
    personality_comment: str | None = None
    career_comment: str | None = None
    final_comment: str | None = None

# 상담대화분석
class RecordingAnalyze(BaseModel):
    client_id: int
    counseling_id: int
    prompt: str

