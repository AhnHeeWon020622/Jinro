from __future__ import annotations
import os
import shutil
import subprocess
import tempfile

from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from faster_whisper import WhisperModel
from concurrent.futures import as_completed


# Whisper 모델 로드
MODEL_NAME = "small"
model = None

def get_model():
    global model

    if model is None:

        print(f"[STT] faster-whisper 모델 로딩 시작: {MODEL_NAME}")

        model = WhisperModel(
            MODEL_NAME,
            device="cpu",
            compute_type="int8"  # 속도 최적화
        )

        print(f"[STT] faster-whisper 모델 로딩 완료: {MODEL_NAME}")

    return model


def _run_ffmpeg(cmd: list[str]) -> bool:
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"[FFMPEG ERROR]\nCMD: {' '.join(cmd)}\n{result.stderr}")
            return False

        return True

    except Exception as e:
        print(f"[FFMPEG EXCEPTION] {e}")
        return False


def convert_webm_to_wav(input_path: str | Path, output_dir: str | Path) -> Path | None:
    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / f"{input_path.stem}.wav"

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-ac", "1",          # mono
        "-ar", "16000",      # 16kHz
        str(output_path),
    ]
    success = _run_ffmpeg(cmd)

    if not success:
        print("[STT] wav 변환 실패")
        return None

    return output_path

# 오디오 split
def split_audio(input_path: Path, chunk_minutes=5):
    """
    audio를 N분 단위로 split
    """
    temp_dir = input_path.parent / f"chunks_{os.getpid()}"
    temp_dir.mkdir(exist_ok=True)

    chunk_pattern = temp_dir / "chunk_%03d.wav"

    cmd = [
        "ffmpeg",
        "-i", str(input_path),
        "-f", "segment",
        "-segment_time", str(chunk_minutes * 60),
        "-acodec", "pcm_s16le",
        str(chunk_pattern)
    ]

    _run_ffmpeg(cmd)

    return sorted(temp_dir.glob("chunk_*.wav"))

def safe_split_audio(input_path: Path, chunk_minutes=5):
    try:
        chunks = split_audio(input_path)

        if not chunks:
            raise RuntimeError("chunk 생성 실패")

        return chunks

    except Exception as e:
        print(f"[SPLIT ERROR] {e}")
        print("[SPLIT] fallback: 전체 파일 사용")

        return [input_path]


def transcribe_file(audio_file: Path):

    loaded_model = get_model()

    segments, info = loaded_model.transcribe(
        str(audio_file),
        language="ko",
        beam_size=1,
        vad_filter=True,
        condition_on_previous_text=False
    )

    result = []

    for s in segments:
        result.append({
            "start": s.start,
            "end": s.end,
            "text": s.text
        })

    return result

def safe_transcribe_file(audio_file: Path):
    try:
        return transcribe_file(audio_file)

    except Exception as e:
        print(f"[STT ERROR] {audio_file} -> {e}")
        return []

def speech_to_text(audio_path: str | Path) -> dict:

    audio_path = Path(audio_path)

    if not audio_path.exists():
        return {
            "text": "",
            "segments": [],
            "status": "error",
            "message": "파일 없음"
        }

    temp_root = Path(tempfile.mkdtemp(prefix="stt_work_"))

    try:

        wav_dir = temp_root / "wav"
        wav_path = convert_webm_to_wav(audio_path, wav_dir)

        if wav_path is None:
            return {
                "text": "",
                "segments": [],
                "status": "error",
                "message": "wav 변환 실패"
            }

        # 1️⃣ audio split
        chunks = safe_split_audio(wav_path)

        all_segments = []

        # 2️⃣ STT 병렬 실행
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(safe_transcribe_file, c) for c in chunks]

            for future in as_completed(futures):
                try:
                    result = future.result()
                    all_segments.extend(result)
                except Exception as e:
                    print(f"[FUTURE ERROR] {e}")

        if not all_segments:
            return {
                "text": "",
                "segments": [],
                "status": "empty",
                "message": "음성 인식 결과 없음"
            }

        text_all = " ".join([s["text"] for s in all_segments])

        return {
            "text": text_all.strip(),
            "segments": all_segments,
            "status": "success"
        }
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)