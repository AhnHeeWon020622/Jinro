import os
import logging
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn

# 1. 환경 설정 로드
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 상위 디렉토리의 .env 파일을 로드
ENV_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", ".env"))
load_dotenv(ENV_PATH)

# 2. 로그 디렉토리 및 파일 경로 설정
LOG_DIR_NAME = os.getenv("LOG_DIR", "logs")
LOG_DIR_PATH = os.path.join(os.path.dirname(BASE_DIR), LOG_DIR_NAME)
os.makedirs(LOG_DIR_PATH, exist_ok=True)

AI_LOG_FILE = os.getenv("AI_LOG_FILE", "ai_debug.log")
full_log_path = os.path.join(LOG_DIR_PATH, AI_LOG_FILE)

# 3. 로깅 설정 (.env의 LOG_LEVEL 반영)
# .env 파일에서 LOG_LEVEL을 읽어오고, 없으면 기본값 INFO를 사용합니다.
LOG_LEVEL_STR = os.getenv("LOG_LEVEL", "INFO").upper()
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
        logging.StreamHandler() # 콘솔 화면에도 로그 출력
    ]
)
logger = logging.getLogger(__name__)

# 4. FastAPI 앱 정의 및 라우터 임포트
from app.api import ai, data_ai

app = FastAPI(title="AI_SERVER")

# 파일 업로드 폴더 (.env에 없으므로 기본값 'uploads' 사용)
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.include_router(ai.router)
app.include_router(data_ai.router)

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {
        "status": "success",
        "message": "AI 분석 서버가 정상 실행 중입니다.",
        "log_level": LOG_LEVEL_STR,
        "log_path": full_log_path
    }

if __name__ == "__main__":
    # .env 파일에 AI_SERVER_URL이 있지만, Uvicorn 실행을 위해 
    # 호스트(0.0.0.0)와 포트(8001)를 분리하여 기본값으로 설정합니다.
    host = "0.0.0.0"
    port = 8001
    
    logger.info(f"Starting AI Server on {host}:{port} with Log Level: {LOG_LEVEL_STR}")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True
    )