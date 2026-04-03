import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/student_css/SAgreement.css";

function SAgreement() {

  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);

  const navigate = useNavigate();
  const allAgreed = agree1 && agree2;

  return (
    <div className="agreement-page">

      <div className="agreement-container">

        <div
          className="back-btn"
          onClick={() => navigate("/")}
        >
          ← 이전으로
        </div>

        <div className="icon-box"></div>

        <h2 className="title">진단 시작 전 동의서</h2>
        <p className="subtitle">
          정확한 AI 분석을 위해 다음 항목에 동의해 주세요.
        </p>

        <div className="agree-card onboard-agree1">
          <h4>정보 수집 및 이용 동의</h4>
          <p>
            본 서비스는 진로 흥미도 분석을 위해 영상 시청 중 귀하의 반응 데이터를 수집합니다.
            수집된 정보는 분석 목적으로만 사용되며 개인정보는 안전하게 암호화되어 보관됩니다.
          </p>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={agree1}
              onChange={(e) => setAgree1(e.target.checked)}
            />
            위 내용에 동의합니다
          </label>
        </div>

        <div className="agree-card onboard-agree2">
          <h4>카메라를 통한 얼굴 촬영 동의</h4>
          <p>
            AI 기반 감정 분석을 위해 상담 중 귀하의 얼굴 표정이 실시간 촬영됩니다.
            촬영된 영상은 분석 후 즉시 삭제되며 외부로 유출되지 않습니다.
          </p>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={agree2}
              onChange={(e) => setAgree2(e.target.checked)}
            />
            위 내용에 동의합니다
          </label>
        </div>

        <div className="warning-box">
          ⚠ 두 항목 모두 동의해야 진단을 시작할 수 있습니다.
        </div>

        <div className="button-area">
          <button
            className={`start-btn onboard-start-btn ${allAgreed ? "active" : "disabled"}`}
            disabled={!allAgreed}
            onClick={() => navigate("/student/login")}
          >
            {allAgreed ? "시작하기" : "모든 항목에 동의해 주세요"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default SAgreement;
