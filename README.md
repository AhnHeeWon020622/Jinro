# 🙋‍♂️너, 내 진로가 돼라

## 📌 프로젝트 개요

기존 진로 상담은 학생의 관심과 성향을 **상담사의 주관적 판단에 의존**하기 때문에

객관적인 근거를 기반으로 한 분석이 어렵다는 한계가 있었습니다.

이를 해결하기 위해 **영상 기반 행동 분석**과 **음성 기반 STT→LLM** 분석을 결합한

데이터 기반 진로 분석 시스템을 설계하였으며, 

이를 통해 학생의 관심 분야와 성향을
데이터 기반으로 도출하는 **AI 진로 상담 서비스**를 구현하였습니다.

---

## ⚙️ 기술 스택

- **Frontend** : React, Redux
- **Backend** : FastAPI, SQLAlchemy
- **AI Server** : FastAPI
- **모델 및 외부API** : MediaPipe, Faster-Whisper, OpenAI, Youtube(iframe)
- **Video/Audio** : MediaRecorder API, FFmpeg
- **Database** : MySQL

---

## 🏗️ 시스템 구조

```markdown
[Client (React)]
			↓
[Backend (FastAPI)] ←→ [DB]
			↓
[AI Server (FastAPI)]
├─ 영상 분석 (MediaPipe)
├─ STT (Faster-Whisper)
└─ LLM 분석 (OpenAI(GPT-4o mini))
```

- AI 처리 서버를 분리하여 영상/음성 분석 부하를 독립적으로 처리
- Backend는 흐름 관리 및 데이터 저장 역할 수행

---

## 🔨주요 구현 기능

### 1️⃣ STT → LLM 파이프라인 구축

<img width="1228" height="404" alt="image" src="https://github.com/user-attachments/assets/e8cb9ef8-31db-40ce-97e6-0a24f3f4fdde" />


✔ **구현 내용**

- 상담 음성을 텍스트로 변환 후 LLM을 통해 **상담 내용 요약, 학생 성향 분석, 추천 진로 도출**

✔ **처리 흐름**
- Audio(webm) → wav 변환 (16kHz) → 5분 단위 분할
→ 병렬 STT 처리 → 텍스트 병합 → LLM 요약

### 2️⃣ 세션 기반 상담 흐름 관리

**✔ 구현 내용**

- 사용자 상담 진행 상태를 세션으로 관리
- 영상 → 설문 → 다음 영상 → 결과 흐름 유지

**✔ 기술 포인트**

- session 기반 `client_id` 관리
- `complete_yn` 상태 기반 이어보기 기능 구현

**✔ 설계 이유**

- 영상 시청 도중 중간 이탈 시에도 이어서 진행 가능
- 사용자 상태를 서버에서 관리하여 흐름 일관성 유지

---

## **⚠️ Trouble Shooting**

### 1️⃣ STT 긴 음성 처리 병목

**🔴 문제**

긴 음성을 한 번에 처리할 경우 **속도 저하 및 메모리 사용 증가** 발생

**🔴 해결(코드)**

1. **5분 단위로 분할**

<img width="350" height="254" alt="image" src="https://github.com/user-attachments/assets/841fb1ba-5e87-4dc7-985b-911ef5582138" />


2. **최대 4개 병렬 처리**

```python
with ThreadPoolExecutor(max_workers=4) as executor:
results = executor.map(transcribe_file, chunks)
```

**🔴 결과**

- 단일 처리 구조에서 발생하던 STT 병목을 분할·병렬 처리 구조로 개선
- 긴 음성 처리 시 발생하던 속도 저하 및 메모리 문제 해결
- 대용량 음성 처리에 대응 가능한 확장성 있는 구조로 전환

### 2️⃣ **LLM 입력까지 고려한 데이터 처리 구조를 설계**

**🔴 문제**

STT 결과가 장문 텍스트로 생성되어

LLM 입력 시 **토큰 제한을 초과하는 문제**가 발생

**🔴 해결(코드)**

변환 ➡ 분할 ➡ 병렬 처리 ➡ 병합 구조 설계

<img width="302" height="298" alt="image" src="https://github.com/user-attachments/assets/6e9c5a83-9dd2-4181-952d-e0fde44aace8" />


**🔴 결과**

- Map-Reduce 기반 처리 구조를 적용하여 LLM 토큰 제한 문제 해결
- 대용량 STT 결과를 안정적으로 처리 가능한 구조로 개선
- 병렬 처리로 요약 성능 향상 및 전체 처리 시간 단축

### 3️⃣ 세션 기반 이어보기 흐름 깨짐

**🔴 문제**

사용자 상태가 유지되지 않아 영상 시청 중 이탈 시 진행 상태가 초기화되고,
상담, 영상, 리포트 데이터가 서로 연결되지 않는 문제 발생

**🔴 해결(코드)**

1. **`client_id`를 세션에 저장하여 모든 요청의 기준으로 활용**

```python
request.session['client_id'] = client.client_id
```

2. **`complete_yn` 상태값으로 각 영상 상태 관리**

<img width="422" height="192" alt="image" src="https://github.com/user-attachments/assets/ff53b72b-62e5-434e-a4e3-f09896764e0d" />



**🔴 결과**

- 사용자 이탈 시에도 진행 상태를 유지하여 서비스 흐름 단절 문제 해결
- 상태값 기반 제어를 통해 상담 → 영상 → 리포트 데이터 일관성 확보
- 세션을 활용한 흐름 관리로 사용자 경험 및 시스템 안정성 개선

---

## **🎥 발표 영상**

(추가 예정)

---

## **💾 DB 구조 (ERD)**

<img width="1194" height="782" alt="image" src="https://github.com/user-attachments/assets/24cb3846-d968-41df-8deb-7d1ec04cd647" />
