import { useEffect, useState } from "react";
import "../../css/student_css/SLoading.css";

function SSaving() {
  const [progress, setProgress] = useState(0);

  /* 퍼센트 자동 증가 애니메이션 */
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 40); // 속도 조절 가능

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sloading-page">

      {/* 중앙 로딩 영역 */}
      <div className="loading-wrapper">

        <div className="spinner"></div>

        <h2 className="loading-text">
          웹캠 영상 저장 중...
        </h2>

        <div className="progress-text">
          {progress}%
        </div>

      </div>

    </div>
  );
}

export default SSaving;