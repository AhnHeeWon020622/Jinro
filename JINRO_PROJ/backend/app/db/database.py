from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv

load_dotenv()
# ---------------------------------------------------------
# [수정된 부분] MySQL 연결 URL 세팅
# 형식: "mysql+pymysql://사용자이름:비밀번호@호스트:포트/DB이름"
# ---------------------------------------------------------
DB_USERNAME = os.getenv("DB_USERNAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# # SQLite에 있던 connect_args={"check_same_thread": False}는 제거합니다.
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# # DB 세션 클래스 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# # ORM 모델의 기본 클래스
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
