import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "../../../css/student_css/Checkout.css";
import api from "../../../services/app.js";

function Checkout() {

  const navigate = useNavigate();
  const selectedVideos = useSelector((state) => state.cVideos);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedVideos || selectedVideos.length === 0) {
      alert("선택된 영상이 없습니다.");
      navigate("/student/category/big");
    }
  }, [selectedVideos, navigate]);

  const handleStartVideo = async () => {

    if (isLoading) return;

    try {

      setIsLoading(true);

      // ⭐⭐⭐ 서버 요구 구조
      const videos = selectedVideos.map(v => ({
        id: Number(v.id)
      }));

      const res = await api.post("/client/counselling", {
        videos: videos
      });

      console.log("🔥 상담 생성 응답:", res.data);

      if (!res?.data?.success) {
        alert(res?.data?.message || "상담 생성 실패");
        return;
      }

      localStorage.setItem(
        "counselingId",
        res.data.counseling_id
      );

      localStorage.setItem(
        "reportIds",
        JSON.stringify(res.data.report_ids || [])
      );

      const firstVideoId = videos[0].id;

      navigate(`/student/video/${firstVideoId}`, {
        state: {
          selectedVideos,
          currentIndex: 0
        }
      });

    } catch (error) {

      console.log("🔥 상담 생성 전체 에러:", error);
      console.log("🔥 서버 detail:", error.response?.data);

      alert(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "상담 생성 실패"
      );

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cart-page">
      <div className="cart-container">

        <div className="cart-header">
          <h2>선택 내역</h2>
          <div className="total-count">
            총 선택 <span>{selectedVideos?.length || 0}개</span>
          </div>
        </div>

        <div className="video-list">
          {selectedVideos?.map((video, index) => (
            <div key={video.id} className="video-card">
              <div className="video-order">{index + 1}</div>
              <div className="video-thumb"></div>
              <div className="video-info">
                <h4>{video.subCategory}</h4>
                <p>영상 시청 후 설문이 진행됩니다.</p>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-bottom">
          <button
            className="cart-btn secondary"
            onClick={() => navigate("/student/category/big")}
          >
            ← 다시 선택
          </button>

          <button
            className="cart-btn primary global-checkout-start"
            onClick={handleStartVideo}
          >
            영상 시청 시작
          </button>
        </div>

      </div>
    </div>
  );
}

export default Checkout;
