from openai import OpenAI
from dotenv import load_dotenv
import os
import re
import json
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# -----------------------------
# filler 제거
# -----------------------------
def clean_text(text: str):

    text = re.sub(r"\b(음+|어+|그+|아+)\b", "", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# -----------------------------
# Whisper segment → semantic chunk
# -----------------------------
def build_chunks_from_segments(segments, max_chars=2500):

    chunks = []
    current_chunk = ""

    for seg in segments:

        text = clean_text(seg["text"])

        if len(current_chunk) + len(text) < max_chars:
            current_chunk += " " + text
        else:
            chunks.append(current_chunk.strip())
            current_chunk = text

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


# -----------------------------
# Map 단계 (chunk 요약)
# -----------------------------
def summarize_chunk(chunk: str):

    prompt = f"""
다음은 학생과 상담사가 진행한 진로 상담 녹취 일부입니다.

핵심 상담 내용을 간결하게 정리하세요.

요약 기준
- 학생이 관심을 보인 직업 또는 분야
- 학생의 감정 반응 또는 태도
- 상담사가 제시한 조언
- 진로 관련 핵심 발언

3~4문장 이내로 요약하세요.

상담 녹취:
{chunk}
"""

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "당신은 학교 진로 상담 내용을 정리하는 AI입니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        max_tokens=200
    )

    return res.choices[0].message.content.strip()


# -----------------------------
# 병렬 Map 처리
# -----------------------------
def summarize_chunks(chunks):

    summaries = []

    # 병렬 LLM 호출
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = executor.map(summarize_chunk, chunks)

    for r in results:
        summaries.append(r)

    return summaries


# -----------------------------
# Reduce 단계 (최종 요약)
# -----------------------------
def summarize_final(text, video_analyze):

#     prompt = f"""
# 당신은 20년 경력의 학교 진로 상담사입니다.

# 다음 상담 요약들을 분석하여 반드시 JSON 형식으로 결과를 작성하세요.

# 출력 JSON 구조

# {{
#   "interest_field": "",
#   "low_interest_field": "",
#   "student_trait": "",
#   "career_recommendation": "",
#   "summary": ""
# }}

# 설명

# interest_field:
# 학생이 가장 흥미를 보인 직업 또는 분야

# low_interest_field:
# 학생이 상대적으로 흥미가 낮은 분야

# student_trait:
# 학생의 성향 (예: 분석적, 창의적, 탐구적 등)

# career_recommendation:
# 상담을 바탕으로 추천할 진로 5가지

# summary:
# 전체 상담 핵심 요약 (4~6줄)

# 상담 요약:
# {text}

# JSON만 출력하세요.
# """

    prompt = f"""
    당신은 20년 경력의 전문 학교 진로 상담사입니다. 학생의 정성적인 '상담 요약'과 정량적인 '영상분석' 데이터를 종합적으로 분석하여 최적의 진로를 추천하는 것이 당신의 역할입니다.
    반드시 아래에 제시된 JSON 형식으로만 답변을 출력하고, 마크다운 코드 블록(```json ... ```)이나 추가적인 설명은 절대 포함하지 마세요.

    # 데이터 분석 기준:
    1. interest_field: '상담 요약'과 '영상분석(흥미도 점수)'를 종합하여 가장 관심도가 높은 분야 도출.
    2. low_interest_field: '상담 요약'과 '영상분석(흥미도 및 집중도 점수)'를 종합하여 관심도가 가장 낮은 분야 도출.
    3. student_trait: '상담 요약'에 나타난 대화 내용을 바탕으로 학생의 주요 성향(예: 분석적, 창의적, 탐구적 등)을 3가지 키워드로 요약.
    4. career_recommendation: 
    - '영상분석'의 "최종점수"가 높은 직업을 1차적으로 우선순위에 둡니다.
    - '영상분석'에서 최종점수가 50점 이상이면 점수순으로 높은순위로 가도록 하고 그게 아니라면 상담사하고 얘기핬을때 흥미있는 직업을 높은순위로 올려줘
    - 단, 단순 점수 나열에 그치지 않고 '상담 요약'에서 파악된 학생의 성향(student_trait)과 잘 부합하는지 교차 검증하여 최종 5가지 직업을 선정합니다.
    - 출력형식은 ['진로명', '진로명', ...]
    5. summary: 전체 상담 내용과 데이터 분석 결과를 아우르는 핵심 요약 (4~6줄).

    # 입력 데이터:
    [상담 요약]
    {text}

    [영상분석]
    {video_analyze}

    # 출력 형식 (Strict JSON):
    "interest_field": "",
    "low_interest_field": "",
    "student_trait": "",
    "career_recommendation": "",
    "summary": ""
"""

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "진로 상담 분석 AI입니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        max_tokens=400
    )

    content = res.choices[0].message.content.strip()

    # GPT JSON 파싱 오류 방지
    content = re.sub(r"^```json", "", content)
    content = re.sub(r"^```", "", content)
    content = re.sub(r"```$", "", content)
    content = content.strip()

    try:
        return json.loads(content)

    except Exception:

        return {
            "interest_field": "",
            "low_interest_field": "",
            "student_trait": "",
            "career_recommendation": "",
            "summary": content
        }


# -----------------------------
# 전체 파이프라인
# -----------------------------
def summarize_text(stt_result, ai_report):

    # STT 결과 검증
    if not stt_result or "segments" not in stt_result or not stt_result["segments"]:
        return {
            "interest_field": "",
            "low_interest_field": "",
            "student_trait": "",
            "career_recommendation": "",
            "summary": "음성 내용이 인식되지 않았습니다."
        }

    segments = stt_result["segments"]

    # 1️⃣ segment 기반 chunk
    chunks = build_chunks_from_segments(segments)

    # 2️⃣ Map 요약
    chunk_summaries = summarize_chunks(chunks)

    # 3️⃣ Merge
    merged = "\n".join(chunk_summaries)

    # 4️⃣ Reduce 요약
    final_summary = summarize_final(merged, ai_report)

    return final_summary