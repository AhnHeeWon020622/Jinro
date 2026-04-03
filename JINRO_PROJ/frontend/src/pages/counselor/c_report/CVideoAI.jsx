import { useLocation } from "react-router-dom";
import ReportAi from "../../../component/ReportAi";

const CVideoAI = () => {

  const location = useLocation();
  const studentName = location.state?.studentName;

  return (
      <ReportAi 
          pageTitle="시청영상 분석 리포트"
          studentName={studentName}
          apiUrl="/counselor/ai-report"
      />
  );
};

export default CVideoAI;