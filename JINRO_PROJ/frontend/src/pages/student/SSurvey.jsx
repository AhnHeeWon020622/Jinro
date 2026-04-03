import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import styles from "../../css/student_css/SSurvey.module.css";
import api from "../../services/app";

function SSurvey() {
  const { categoryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const selectedVideos = useSelector((state) => state.cVideos);
  const reduxCounselingId = useSelector((state) => state.counselingId);

  // 🔥 SVideo에서 넘겨준 videoBlob을 받아옵니다.
  const { currentIndex = 0, videoBlob = null } = location.state || {};
  const counselingId =
    reduxCounselingId || localStorage.getItem("counselingId");
  const isGlobalOnboarding =
    localStorage.getItem("student_onboarding_flow") === "true";

  const [surveyInfo, setSurveyInfo] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const response = await api.get(`/client/survey/${categoryId}`);

        if (response.data.success) {
          setSurveyInfo(response.data.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();

    // 🔥 만약 영상 시청 페이지를 거치지 않고 직접 주소를 치거나 새로고침해서 영상 데이터가 날아간 경우 경고
    if (!isGlobalOnboarding && !videoBlob) {
      console.warn("전달받은 영상 데이터가 없습니다. 영상이 저장되지 않을 수 있습니다.");
    }
  }, [categoryId, isGlobalOnboarding, videoBlob]);

  const questions = useMemo(() => {
    if (!surveyInfo) return [];

    return typeof surveyInfo.survey === "string"
      ? JSON.parse(surveyInfo.survey)
      : surveyInfo.survey;
  }, [surveyInfo]);

  const handleSelectAnswer = (value) => {
    setAnswers((prev) => ({
      ...prev,
      [currentStep]: value,
    }));
  };

  const handleNext = async (nextAnswers = answers) => {
    if (nextAnswers[currentStep] === undefined) {
      return;
    }

    // 아직 마지막 질문이 아니면 다음 질문으로 이동
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    // 온보딩 플로우 처리
    if (isGlobalOnboarding) {
      navigate("/student/complete");
      localStorage.removeItem("videoStarted");
      return;
    }

    // 상담 ID 확인
    if (!counselingId) {
      console.error("counseling_id is missing");
      alert("상담 정보가 없습니다.");
      return;
    }

    try {
      const reportIds = JSON.parse(localStorage.getItem("reportIds") || "[]");
      const currentReportId = reportIds[currentIndex];

      if (!currentReportId) {
        console.error("report_id is missing");
        alert("리포트 정보가 없습니다.");
        return;
      }

      // 1. 설문 결과 전송
      if (!isGlobalOnboarding) {
        await api.post("/client/pComplete", {
          counseling_id: Number(counselingId),
          report_id: currentReportId,
          answer: nextAnswers,
        });

        // 🔥 2. 비디오 업로드 로직 추가 (설문 완료와 동시에 진행)
        if (videoBlob) {
          const formData = new FormData();
          formData.append("file", videoBlob, "video.webm");
          formData.append("report_id", currentReportId);

          api.post(`/client/video/upload/${counselingId}`, formData)
            .then(() => console.log(`[업로드 요청완료] reportId: ${currentReportId} 백그라운드 처리 중`))
            .catch((uploadError) => console.log("비디오 업로드 실패:", uploadError));
          
        }
      }

      // 다음 단계(다음 영상 또는 완료)로 이동
      const nextIdx = currentIndex + 1;

      if (!selectedVideos || nextIdx >= selectedVideos.length) {
        navigate("/student/complete");
        localStorage.removeItem("videoStarted");
        return;
      }

      const nextVideoId = Number(selectedVideos[nextIdx].id);

      navigate(`/student/video/${nextVideoId}`, {
        state: { currentIndex: nextIdx },
      });
    } catch (error) {
      console.error(error);
      alert("데이터 전송 중 오류가 발생했습니다.");
    }
  };

  const handleOptionDoubleClick = async (value) => {
    const nextAnswers = {
      ...answers,
      [currentStep]: value,
    };

    setAnswers(nextAnswers);
    await handleNext(nextAnswers);
  };

  if (loading || !surveyInfo) {
    return <div className={styles.surveyContainer}>로딩 중...</div>;
  }

  const isLastQuestion = currentStep === questions.length - 1;
  const isLastVideo =
    selectedVideos &&
    selectedVideos.length > 0 &&
    currentIndex === selectedVideos.length - 1;

  let buttonText = "확인";

  if (isLastQuestion) {
    buttonText = isLastVideo ? "결과 제출" : "다음 영상으로";
  }

  return (
    <div className={styles.surveyContainer}>
      <div className={styles.surveyCard}>
        <button
          className={styles.backButton}
          onClick={() =>
            currentStep > 0 ? setCurrentStep((prev) => prev - 1) : navigate(-1)
          }
        >
          이전으로
        </button>

        <div className={styles.headerRow}>
          <h1 className={styles.mainTitle}>{surveyInfo.title} 진단</h1>

          <span className={styles.stepIndicator}>
            {currentStep + 1} / {questions.length}
          </span>
        </div>

        <div className={`${styles.progressWrapper} survey-progress`}>
          <div
            className={styles.progressBar}
            style={{
              width: `${((currentStep + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        <h2 className={styles.questionText}>
          {questions[currentStep].questionText}
        </h2>

        <div className={`${styles.optionsList} survey-options`}>
          {questions[currentStep].options.map((option, idx) => {
            const value = 4 - idx;

            return (
              <div
                key={idx}
                data-option-index={idx}
                className={`${styles.optionItem} global-survey-option ${
                  answers[currentStep] === value ? styles.selected : ""
                }`}
                onClick={() => handleSelectAnswer(value)}
                onDoubleClick={() => handleOptionDoubleClick(value)}
              >
                <span className={styles.optionLabel}>{option}</span>
                <div className={styles.radioCircle} />
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: "30px" }}>
          <button
            className={`${styles.nextButton} survey-next-btn global-survey-next`}
            onClick={() => handleNext()}
            disabled={answers[currentStep] === undefined}
            style={{
              padding: "12px 60px",
              backgroundColor:
                answers[currentStep] !== undefined ? "#E50914" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor:
                answers[currentStep] !== undefined ? "pointer" : "not-allowed",
              fontSize: "18px",
              fontWeight: "bold",
            }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SSurvey;