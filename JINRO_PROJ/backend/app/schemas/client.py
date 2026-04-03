from pydantic import BaseModel, field_validator, EmailStr
from typing import Dict, Any, List
import re

class ClientCreate(BaseModel):
    name: str
    birthdate: str
    phone_num: str
    email: EmailStr

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str):
        v = v.strip()
        if not v:
            raise ValueError("이름은 필수입니다.")
        return v

    @field_validator("birthdate")
    @classmethod
    def validate_birthdate(cls, v: str):
        clean_v = re.sub(r"[^0-9]", "", v)
        if len(clean_v) != 7:
            raise ValueError("주민등록번호는 숫자 7자리여야 합니다.")
        return clean_v

    @field_validator("phone_num")
    @classmethod
    def validate_phone_num(cls, v: str):
        clean_v = re.sub(r"[^0-9]", "", v)
        if len(clean_v) != 11:
            raise ValueError("핸드폰 번호는 숫자 11자리여야 합니다.")
        return clean_v

class SurveySubmitRequest(BaseModel):
    counseling_id: int
    category: str
    url: str
    answer: Dict[str, Any]

class SelectedVideo(BaseModel):
    id: int            

class CounselingCreateRequest(BaseModel):
    videos: List[SelectedVideo]

class ReportCompleteRequest(BaseModel):
    counseling_id: int
    report_id: int
    answer: Dict[str, Any]

class AIAnalysisRequest(BaseModel):
    user_id: str
    session_id: str
    emotion_score: float   # FER 결과 (0~100)
    attention_score: float # DAiSEE 결과 (0~100)

class CompleteRequest(BaseModel):
    counseling_id: str

class CompleteVideoRequest(BaseModel):
    counseling_id: int
    client_id: int

# ------------ 콜벡용 -----------
class AnalysisResultItem(BaseModel):
    ai_v_erp_id: int
    survey_score: float
    interest: float
    focused: float

class AnalysisCallback(BaseModel):
    status: str
    results: List[AnalysisResultItem]

