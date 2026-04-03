import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../../../services/app";

import styles from "../../../css/component_css/ReportAi.module.css";

const CReportAiSimple = ({ pageTitle, apiUrl }) => {

  const location = useLocation();
  const { clientId, counselingId } = useParams();
  const studentName = location.state?.studentName;
  // const counselingId = location.state?.counselingId;

  const [summary, setSummary] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [dates, setDates] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);

  /* ==============================
     날짜 목록 가져오기
  ============================== */

  useEffect(() => {

    if (!counselingId) return;

    api
      .get(`/counselor/recording/dates/${clientId}`)
      .then((res) => res.data)
      .then((res) => {

        if (res.success) {

          setDates(res.data);

          if (res.data.length > 0) {
            for (let d of res.data) {
              if (counselingId == d.counseling_id) {
                loadReport(d.counseling_id);
                setSelectedDate(d.counseling_id);
              }
            }
            
          }

        }

      })
      .catch((err) => console.error(err));

  }, [counselingId]);


  /* ==============================
     리포트 조회
  ============================== */

  const loadReport = async (counselingId) => {

    await api
      .get(`/counselor/ai-report/${counselingId}`)
      .then((res) => res.data)
      .then((res) => {

        if (res.success) {
          if (res.data != undefined) {
            setSummary(res.data.ai_m_comment || "");
            setPrompt(res.data.prompt || "");
          }

        }

      })
      .catch((err) => console.error(err));

    // await api.get(`/counselor/ai_report/voice/file/${counselingId}`).then(
    //   (res) => res.data
    // ).then(
    //   (res) => {
    //     if (res.success) {
          
    //     }
    //   }
    // ).catch((err) => console.error(err))

    setVideoUrl(`http://localhost:8000/counselor/ai_report/voice/file/${counselingId}`)

  };


  /* ==============================
     날짜 변경
  ============================== */

  const handleDateChange = (e) => {

    const counselingId = e.target.value;

    setSelectedDate(counselingId);

    if (counselingId) {
      loadReport(counselingId);
    }

  };

  const handleAnalyze = async (e) => {
    e.preventDefault();

    await api.post("/counselor/recording/analyze", {
      client_id: clientId,
      counseling_id: counselingId,
      prompt: prompt,
    }).then(
      (res) => res.data
    ).then(
      (res) => {
        setSummary(res.ai_m_comment)
        setPrompt(res.prompt)
      }
    ).catch(err => console.log(err))


  }

  /* ==============================
     음성 파일 모달 열기/닫기
  ============================== */
  const handleVideoOpen = () => {
    // 임시 주석 처리: 테스트를 위해 URL이 없어도 모달이 열리게 하려면 아래 if문을 지우세요.

    if (!videoUrl) {
      alert("음성 파일이 없습니다.");
      return;
    }

    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };


  return (
    <div className={styles["analysis-page-container"]}>

      {/* ================= HEADER ================= */}

      <div className={styles["analysis-header"]}>

        <h2 className={styles["student-info-title"]}>
          {studentName}의 상담대화 요약
        </h2>

        <select
          className={styles["date-select"]}
          value={selectedDate}
          onChange={handleDateChange}
        >
          {dates.map((d) => (
            <option key={d.counseling_id} value={d.counseling_id}>
              {d.regdate}
            </option>
          ))}

        </select>

      </div>


      <div className={styles["video-wrap"]}>

        {/* ================= 요약 ================= */}

        <section className={styles["report-card"]}>

          <div className={styles["analysis-summary-box"]}>

            {summary ? (
              <p className={styles["analysis-text"]}>
                {summary}
              </p>
            ) : (
              <p className={styles["analysis-text"]}>
                분석 결과가 없습니다.
              </p>
            )}

            <div className={styles["video-btn-wrap"]}>

              <button
                className={styles["btn-video-small"]}
                onClick={handleVideoOpen}
              >
                음성파일 보기
              </button>

            </div>

          </div>

        </section>


        {/* ================= 메모 ================= */}

        <section className={styles["report-card"]}>

          <label className={styles["report-label"]}>
            메모를 입력하세요
          </label>

          <textarea
            className={styles["prompt-textarea"]}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="AI에게 요청할 추가 분석 내용을 입력하세요..."
          />

        </section>

      </div>


      {/* ================= 버튼 ================= */}

      <div className={styles["report-buttons"]}>

        <div className={styles["left-btn-area"]}>

          <Link
            to={`/counselor/report/final/${clientId}/${counselingId}`}
            state={{ counselingId, studentName }}
            className={styles["btn-link"]}
          >
            <button className={styles["btn-action-sub"]}>
              뒤로가기
            </button>
          </Link>

        </div>


        <div className={styles["right-btn-area"]}>

          <button className={styles["btn-action-sub"]} onClick={handleAnalyze}>
            재분석 요청
          </button>

          <button className={styles["btn-action-main"]}>
            최종 리포트에 적용
          </button>

        </div>

      </div>

      {/* ================= 모달 영역 ================= */}
      {isModalOpen && (
        <div className={styles["video-modal"]} onClick={handleModalClose}>
          {/* 이벤트 버블링 방지: 모달 배경 클릭 시 닫히고, 내용 클릭 시 안 닫히게 */}
          <div
            className={styles["video-modal-content"]}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "500px" }} // 음성 플레이어용으로 가로 크기 축소
          >
            <h3 style={{ margin: 0, marginBottom: "15px" }}>음성 파일 재생</h3>

            {/* 음성 플레이어: 기존 video-player 클래스는 높이가 520px이므로 인라인 스타일로 덮어씌움 */}
            <audio
              controls
              src={videoUrl}
              className={styles["video-player"]}
              style={{ height: "50px", backgroundColor: "transparent" }}
              autoPlay
            >
              브라우저가 오디오 태그를 지원하지 않습니다.
            </audio>

            <button
              className={styles["video-close-btn"]}
              onClick={handleModalClose}
            >
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CReportAiSimple;