import React from "react";
import { useNavigate } from "react-router-dom";

import "../../css/common_css/home.css";

import mainLogo from "../../assets/logo/main_logo.png";
import clientImg from "../../assets/logo/char1.png";
import counselorImg from "../../assets/logo/char2.png";
import guide2 from "../../assets/logo/guide.png";
import conv from "../../assets/image/conv.png";

const Home = ({ startOnboarding }) => {
  const navigate = useNavigate();

  const handleClientStart = () => {
    const isGlobalOnboarding =
      localStorage.getItem("student_onboarding_flow") === "true";

    if (!isGlobalOnboarding) {
      localStorage.removeItem("student_onboarding_flow");
      localStorage.removeItem("skip_all_onboarding");
    }

    navigate("/student/agreement");
  };

  const handleGuide = () => {
    startOnboarding();
  };

  return (
    <div className="home-container">
      <div className="header-section">
        <img src={mainLogo} alt="main logo" className="main-logo" />
      </div>

      <div className="cards-wrapper">
        <div className="card onboard-start-card" onClick={handleClientStart}>
          <img src={clientImg} alt="client" className="card-icon" />
          <h2 className="card-title">내담자용</h2>
          <p className="card-desc">
            상담 영상을 시청하고
            <br />
            AI 분석을 시작합니다
          </p>
        </div>

        <div className="card" onClick={() => navigate("/counselor/login")}>
          <img src={counselorImg} alt="counselor" className="card-icon" />
          <h2 className="card-title">상담사용</h2>
          <p className="card-desc">
            리포트를 확인하고
            <br />
            상담을 관리합니다
          </p>
        </div>
      </div>

      <div className="home-guide-wrap">
        <div className="home-guide-bubble">
          <img src={conv} alt="bubble" />
          <div className="home-guide-bubble-text">
            <br />
            <br />
            가이드를 원하시면
            <br />
            저를 눌러주세요
          </div>
        </div>

        <div className="home-guide-char" onClick={handleGuide}>
          <img src={guide2} alt="guide" />
        </div>
      </div>
    </div>
  );
};

export default Home;
