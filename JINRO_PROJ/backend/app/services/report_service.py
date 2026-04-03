import logging

logger = logging.getLogger(__name__)

def calculate_balance_score(ai_data: dict, survey_score: int):
    """
    가중치: 감정(30%) + 집중도(30%) + 자가설문(40%)
    survey_score: 1(매우 불만족) ~ 5(매우 만족)
    """
    try:
        # 1. 가중치 설정
        W_EMOTION = 0.25
        W_ATTENTION = 0.35
        W_SURVEY = 0.4

        # 2. 설문 점수 정규화 (1~5점 -> 0~100점)
        # 공식: (입력값 / 최대값) * 100
        normalized_survey = (survey_score / 5) * 100

        # 3. 최종 합산 점수 계산
        # ai_data에는 'emotion_score'와 'attention_score'가 0~100 사이로 들어와야 합니다.
        final_score = (
            (ai_data['emotion_score'] * W_EMOTION) +
            (ai_data['attention_score'] * W_ATTENTION) +
            (normalized_survey * W_SURVEY)
        )

        # 4. 데이터 신뢰도 판단 (집중도가 40점 미만이면 신뢰도 낮음)
        is_reliable = ai_data['attention_score'] >= 40

        return round(final_score, 2), is_reliable

    except Exception as e:
        logger.error(f"최종 점수 산출 중 에러 발생: {e}")
        return 0.0, False