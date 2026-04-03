import { useLocation } from "react-router-dom";
import ReportAi from "../../../component/ReportAi";

const CCounselingAI = () => {

  const location = useLocation();
  const studentName = location.state?.studentName;

  return (
      <ReportAi 
          pageTitle="상담영상 분석 리포트"
          studentName={studentName}
          apiUrl="/counselor/report/ai"
      />
  );
};

export default CCounselingAI;