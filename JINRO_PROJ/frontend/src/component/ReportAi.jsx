import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';

import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/app';
import styles from '../css/component_css/ReportAi.module.css';

const ReportAi = ({ pageTitle, studentName }) => {

  const { counselingId } = useParams();
  const [videoScores, setVideoScores] = useState([]);
  const navigate = useNavigate();

  const [videoList, setVideoList] = useState([]);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");

  const [analyzeDates, setAnalyzeDates] = useState([]);
  const [selectedAnalyzeId, setSelectedAnalyzeId] = useState("");

  const [finalScore, setFinalScore] = useState(0);

  const [currentData, setCurrentData] = useState({
    focus: [],
    interest: [],
    summary: "",
    prompt: ""
  });

  useEffect(() => {

    if (!counselingId) return;

    fetchAnalyzeList();
    loadFinalScore();
    loadVideoScores();

  }, [counselingId]);

  const fetchAnalyzeList = async () => {

    try {

      const res = await api.get(`/counselor/ai-report/dates/${counselingId}`);

      if (!res.data.success) return;

      const list = res.data.data;

      if (!list || list.length === 0) return;

      setAnalyzeDates(list);

      const firstId = list[0].ai_v_erp_id;

      setSelectedAnalyzeId(firstId);
      loadReport(firstId);

    } catch (err) {
      console.error(err);
    }

  };

  const loadReport = async (videoId) => {

    try {

      const res = await api.get(`/counselor/ai-report/${counselingId}/${videoId}`);

      if (!res.data.success) return;

      setCurrentData({
        focus: res.data.data.focus || [],
        interest: res.data.data.interest || [],
        summary: res.data.data.summary || "",
        prompt: res.data.data.prompt || ""
      });

    } catch (err) {
      console.error(err);
    }

  };

  const loadFinalScore = async () => {

    try {

      const res = await api.get(`/counselor/report/final/${counselingId}`);

      if (!res.data.success) return;

      const focusList = res.data.focus || [];

      if (focusList.length === 0) {
        setFinalScore(0);
        return;
      }

      const avg =
        focusList.reduce((sum, v) => sum + v.value, 0) /
        focusList.length;

      setFinalScore(avg.toFixed(1));

    } catch (e) {
      console.error(e);
    }

  };

  const loadVideoScores = async () => {

    try {

      const res = await api.get(`/counselor/report/final/${counselingId}`);

      if (!res.data.success) return;

      const focusList = res.data.focus || [];

      setVideoScores(focusList);

    } catch (e) {
      console.error(e);
    }

  };

  const handleAnalyzeChange = (e) => {

    const vid = e.target.value;

    setSelectedAnalyzeId(vid);
    loadReport(vid);

  };

  const handleVideoOpen = async () => {

    try {

      const res = await api.get(`/counselor/local-videos/${counselingId}`);

      if (!res.data.success) return;

      setVideoList(res.data.data);
      setShowVideoModal(true);

    } catch (e) {
      console.error(e);
      alert("영상 목록 불러오기 실패");
    }

  };

  const handleSelectVideo = (url) => {

    const final = `http://localhost:8000/videos/${url}`;

    setSelectedVideoUrl(final);

  };

  return (

    <div className={styles['analysis-page-container']}>

      <div className={styles['analysis-header']}>

        <button
          className={styles['btn-back']}
          onClick={() => navigate(-1)}
        >
          뒤로가기
        </button>

        <h2 className={styles['student-info-title']}>
          {studentName}의 {pageTitle}
        </h2>

        <select
          className={styles['date-select']}
          value={selectedAnalyzeId}
          onChange={handleAnalyzeChange}
        >
          {analyzeDates.map(v => (
            <option key={v.ai_v_erp_id} value={v.ai_v_erp_id}>
              {v.date}
            </option>
          ))}
        </select>

      </div>

      <div className={styles['video-wrap']}>

        <section className={styles['report-card']}>

          <div className={styles['inner-graph-grid']}>

            <div className={styles['chart-item']}>

              <h4 className={styles['chart-title']}>
                집중도 타임라인
              </h4>

              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={currentData.focus}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="time"/>
                  <YAxis/>
                  <Tooltip/>

                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>

            </div>

            <div className={styles['chart-item']}>

              <h4 className={styles['chart-title']}>
                분야별 관심도
              </h4>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={currentData.interest}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="subject"/>
                  <Tooltip/>

                  <Bar
                    dataKey="관심도"
                    fill="var(--primary)"
                    radius={[4,4,0,0]}
                  />

                  <Bar
                    dataKey="자신감"
                    fill="var(--secondary)"
                    radius={[4,4,0,0]}
                  />
                </BarChart>
              </ResponsiveContainer>

            </div>

          </div>

          <div className={styles['analysis-summary-box']}>

            <p className={styles['analysis-text']}>
              {currentData.summary}
            </p>

            <div className={styles['video-btn-wrap']}>

              <button
                className={styles['btn-video-small']}
                onClick={handleVideoOpen}
              >
                영상보기
              </button>

            </div>

            <div className={styles['final-score-box']}>

              <span className={styles['final-score-label']}>
                전체 영상 최종 집중도 점수
              </span>

              <span className={styles['final-score-value']}>
                {finalScore} 점
              </span>

            </div>
            {videoScores.length > 0 && (

            <div style={{ marginTop: 30 }}>

              <h4 style={{ marginBottom: 10 }}>영상별 집중도</h4>

              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14
              }}>

                <thead>
                  <tr style={{ background: "#f5f5f5" }}>
                    <th style={{ padding: 8 }}>영상</th>
                    <th style={{ padding: 8 }}>집중도 점수</th>
                  </tr>
                </thead>

                <tbody>
                  {videoScores.map((v, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 8 }}>{v.subject}</td>
                      <td style={{ padding: 8 }}>{v.value}</td>
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>

          )}

          </div>

        </section>

      </div>

      {showVideoModal && (

        <div className={styles["video-modal"]}>

          <div className={styles["video-modal-content"]}>

            <h3>영상 목록</h3>

            <ul className={styles["video-list"]}>

              {videoList.map(v => (

                <li key={v.id}>

                  <button
                    className={styles["video-select-btn"]}
                    onClick={() => handleSelectVideo(v.url)}
                  >
                    {v.name}
                  </button>

                </li>

              ))}

            </ul>

            {selectedVideoUrl && (

              <video
                src={selectedVideoUrl}
                controls
                autoPlay
                className={styles["video-player"]}
              />

            )}

            <button
              className={styles["video-close-btn"]}
              onClick={()=>{
                setShowVideoModal(false);
                setSelectedVideoUrl("");
              }}
            >
              닫기
            </button>

          </div>

        </div>

      )}

    </div>

  );

};

export default ReportAi;