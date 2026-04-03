import os
import logging
from logging.handlers import TimedRotatingFileHandler
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

# 1. 환경 설정 로드
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", ".env"))
load_dotenv(ENV_PATH)

# 2. 로그 디렉토리 및 파일 경로 설정
LOG_DIR_NAME = os.getenv("LOG_DIR", "logs")
LOG_DIR_PATH = os.path.join(os.path.dirname(BASE_DIR), LOG_DIR_NAME)
os.makedirs(LOG_DIR_PATH, exist_ok=True)

BACKEND_LOG_FILE = os.getenv("BACKEND_LOG_FILE", "backend_error.log")
full_log_path = os.path.join(LOG_DIR_PATH, BACKEND_LOG_FILE)


LOG_LEVEL_STR = os.getenv("LOG_LEVEL", "ERROR").upper()
LOG_LEVEL = getattr(logging, LOG_LEVEL_STR, logging.INFO)

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        TimedRotatingFileHandler(
            full_log_path, 
            when=os.getenv("LOG_ROTATION_WHEN", "midnight"), 
            interval=int(os.getenv("LOG_ROTATION_INTERVAL", 1)), 
            backupCount=int(os.getenv("LOG_BACKUP_COUNT", 30)), 
            encoding="utf-8"
        ),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 4. 모듈 및 DB 로드
from app.db.database import engine, Base
from app.api import client, counselor

try:
    Base.metadata.create_all(bind=engine)
    logger.info("MySQL DB 테이블 연동 성공") # DB 연결 성공 시 INFO 로그 출력
except Exception as e:
    logger.error(f"DB 테이블 생성 실패: {e}")

app = FastAPI(title="JINRO_IS_BACK API")

# CORS 및 미들웨어 설정
frontend_origins_env = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
origins = [origin.strip() for origin in frontend_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "fallback-secret-key"),
    session_cookie="session",
    same_site="lax",
    https_only=False
)

# 정적 파일 경로 설정
VIDEO_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "..", "ai_server", "videos"))
app.mount("/videos", StaticFiles(directory=VIDEO_DIR), name="videos")

@app.get("/")
def read_root():
    logger.info("백엔드 서버 Root endpoint 요청됨")
    return {
        "message": "백엔드 서버 정상 작동 중", 
        "log_level": LOG_LEVEL_STR,
        "log_path": full_log_path
    }

app.include_router(client.router)
app.include_router(counselor.router)