import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey, JSON, Enum, Float
from sqlalchemy.sql import func
from app.db.database import Base 

class ReCommentEnum(enum.Enum):
    SUCCESS = '영상저장성공'
    FAIL = '영상저장실패'
    ANALYZED = '분석완료'
    ANALYZE_FAIL = '분석실패'

class Category(Base):
    __tablename__ = 'CATEGORY'
    
    c_id = Column(Integer, primary_key=True, autoincrement=True, comment='PK')
    title = Column(String(20), unique=True, comment='분야 카테고리')
    survey = Column(JSON, nullable=False, comment='설문지')
    url = Column(String(200), nullable=False, comment='영상 URL')
    kind = Column(Integer, nullable=False, comment='중분류 ID')

class Client(Base):
    __tablename__ = 'CLIENT'
    
    client_id = Column('CLIENT_ID', Integer, primary_key=True, autoincrement=True, comment='PK')
    c_id = Column(String(100), unique=True, nullable=False, comment='고유번호')
    name = Column(String(100), nullable=False, comment='이름')
    phone_num = Column(String(100), unique=True, nullable=False, comment='전화번호')
    email = Column(String(100), nullable=False, comment='이메일')
    birthdate = Column(String(100), nullable=False, comment='생년월일/성별')
    agree = Column(String(1), default='N', nullable=False, comment='약정동의')

class Counselor(Base):
    __tablename__ = 'COUNSELOR'
    
    counselor_id = Column(Integer, primary_key=True, autoincrement=True, comment='PK')
    login_id = Column(String(100), unique=True, nullable=False, comment='ID')
    pw = Column(String(100), nullable=False, comment='PW')
    name = Column(String(100), nullable=False, comment='이름')
    phone_num = Column(String(100), unique=True, nullable=False, comment='전화번호')
    email = Column(String(100), unique=True, nullable=False, comment='이메일')
    active_yn = Column(String(1), default='N', nullable=False, comment='활성화')

class Counseling(Base):
    __tablename__ = 'COUNSELING'
    
    counseling_id = Column(Integer, primary_key=True, autoincrement=True, comment='상담_ID')
    datetime = Column(Date, comment='상담날짜')
    reservation_time = Column(DateTime, comment='예약시간')
    complete_yn = Column(Integer, nullable=False, comment='상담완료여부 1(영상), 2(예정), 3(완료)')
    regdate = Column(DateTime, nullable=False, comment='생성일자')
    # 수정: counselor_id (소문자)
    counselor_id = Column(Integer, ForeignKey('COUNSELOR.counselor_id'), nullable=False)
    # 유지: CLINET_ID (Client 모델에서 대문자로 강제 지정했으므로)
    client_id = Column(Integer, ForeignKey('CLIENT.CLIENT_ID'), nullable=False)

class ReportCon(Base):
    __tablename__ = 'REPORT_CON'
    
    title = Column(String(100), nullable=False, comment='상담 제목')
    con_rep_id = Column(Integer, primary_key=True, autoincrement=True, comment='PK')
    con_rep_comment = Column(Text, nullable=False, comment='상담 일지')
    reg_date = Column(DateTime, default=func.now(), nullable=False, comment='리포트 생성 날짜')
    complete_yn = Column(String(1), default='N', nullable=False, comment='상담여부')
    # 수정: counseling_id (소문자)
    counseling_id = Column(Integer, ForeignKey('COUNSELING.counseling_id'), nullable=False)
    re_comment = Column(Enum(ReCommentEnum), comment='분석여부')

class ReportAiM(Base):
    __tablename__ = 'REPORT_AI_M'
    
    ai_m_rep_id = Column(Integer, primary_key=True, autoincrement=True, comment='PK')
    ai_m_comment = Column(JSON, nullable=False, comment='LLM 요약')
    stt_text = Column(Text, nullable=False, comment='STT 원문')
    reg_date = Column(DateTime, default=func.now(), nullable=False, comment='리포트 생성 날짜')
    counselor_opinion = Column(Text, comment='상담사 의견')
    con_rep_id = Column(Integer, ForeignKey('REPORT_CON.con_rep_id'), nullable=False)

class ReportAiV(Base):
    __tablename__ = 'REPORT_AI_V'
    
    ai_v_erp_id = Column(Integer, primary_key=True, autoincrement=True, comment='PK')
    reg_date = Column(DateTime, default=func.now(), nullable=False, comment='리포트 생성 날짜')
    update_date = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment='리포트 수정 날짜')
    category = Column(String(20), nullable=False, comment='영상 카테고리')
    category_id = Column(Integer, nullable=False, comment='카테고리 ID')
    url = Column(String(2000), nullable=False, comment='영상 URL')
    answer = Column(JSON, comment='내담자 설문지 답변')
    # 수정: counseling_id (소문자)
    counseling_id = Column(Integer, ForeignKey('COUNSELING.counseling_id'), nullable=False)
    complete_yn = Column(String(1), default='N', nullable=False, comment='최종작성여부')
    re_comment = Column(Enum(ReCommentEnum), comment='분석여부')

class AiAnalyze(Base):
    __tablename__ = "AI_ANALYZE"

    analyze_id = Column(Integer, primary_key=True, autoincrement=True, comment="PK")
    ai_v_erp_id = Column(Integer,ForeignKey("REPORT_AI_V.ai_v_erp_id"),nullable=False,comment="영상 리포트 FK")
    attention_score = Column(Float,nullable=False, comment="집중도 점수(0~100)")
    emotion_score = Column(Float,nullable=False,comment="감정 점수(0~100)")
    final_score = Column(Float,nullable=False,comment="영상 최종 점수")
    survey_score = Column(Float,nullable=False,comment="설문점수")
    ai_v_comment = Column(Text,nullable=True,comment="AI 행동 요약")
    raw_data = Column(JSON,nullable=True,comment="AI 원본 분석 데이터")
    prompt = Column(String(300),nullable=True,comment="사용된 프롬프트")
    reg_date = Column(DateTime,default=func.now(),nullable=False,comment="생성일")

class ReportFinal(Base):
    __tablename__ = 'REPORT_FINAL'
    
    final_id = Column(Integer, primary_key=True, autoincrement=True, comment='PK')
    reg_date = Column(DateTime, default=func.now(), nullable=False, comment='리포트 생성 날짜')
    personality_comment = Column(Text, nullable=True, comment='학생 성향 분석 요약')
    career_comment = Column(Text, nullable=True, comment='추천 진로 분석 요약')    
    final_comment = Column(Text, nullable=False, comment='상담 요약')
    update_date = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False, comment='리포트 수정 날짜')
    complete_yn = Column(String(1), default='N', nullable=False, comment='최종작성여부')
    counseling_id = Column(Integer, ForeignKey('COUNSELING.counseling_id'), nullable=False)