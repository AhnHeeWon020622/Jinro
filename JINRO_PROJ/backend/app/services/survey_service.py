def analyze_survey(answer: dict) -> float:

    if not answer:
        return 0.0

    scores = []

    for v in answer.values():
        try:
            scores.append(float(v))
        except:
            continue

    if not scores:
        return 0.0

    avg = sum(scores) / len(scores)

    return round((avg / 5.0) * 100.0, 2)