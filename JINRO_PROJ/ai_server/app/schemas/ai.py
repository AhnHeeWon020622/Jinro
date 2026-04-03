from pydantic import BaseModel, EmailStr, field_validator
from typing import Dict, Any, List, Optional

class VideoAnalyze(BaseModel):
    video_path: str

class SummaryRequest(BaseModel):
    text: str
    model: str = "llama3.1"
    system_prompt: str = """
    당신은 전문적인 문서 요약 어시스턴트입니다. 
    주어진 텍스트를 읽고 반드시 다음 형식에 맞춰 한국어로 요약해 주세요:
    
    [한 줄 핵심 요약]
    - (여기에 한 줄 요약 작성)
    
    [주요 내용 3가지]
    1. 
    2. 
    3. 
    
    [핵심 키워드]
    #키워드1 #키워드2 #키워드3
    """



class AnalysisResult(BaseModel):
    user_id: str
    session_id: str
    emotion: str          
    attention_score: float 
    status: str = "success"

# -----------------------------
# 지울거임(data_ai를 통한 집중도 분석을 위한 스키마)
# -----------------------------
class AnalyzeRequest(BaseModel):
    counseling_id: str
    client_id: str


# 빽엔드에서 받을것들
class VideoTask(BaseModel):
    idx: int
    ai_v_erp_id: int
    survey_score: float

class AnalysisRequest(BaseModel):
    counseling_id: int
    c_id: str
    videos: List[VideoTask]

class DeleteRequest(BaseModel):
    counseling_id: int