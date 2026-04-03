import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import StudentCategory from "../../common/StudentCategory";


import "../../../css/student_css/SBigCat.css";
import {
  Briefcase, Calculator, Banknote, GraduationCap, Gavel,
  HeartPulse, HandHeart, Palette, Truck, Tag, ShieldCheck,
  Hotel, Utensils, Building, Cog, Layers, FlaskConical,
  Shirt, Zap, Cpu, Wheat, TreeDeciduous, Plug, Leaf,
} from "lucide-react";

import { deleteVideo } from '../../../redux/cVideos';

const categories = [
  { id: 1, name: "사업관리", icon: Briefcase },
  { id: 2, name: "경영·회계·사무", icon: Calculator },
  { id: 3, name: "금융·보험", icon: Banknote },
  { id: 4, name: "교육·자연·사회과학", icon: GraduationCap },
  { id: 5, name: "법률·경찰·소방·교도·국방", icon: Gavel },
  { id: 6, name: "보건·의료", icon: HeartPulse },
  { id: 7, name: "사회복지·종교", icon: HandHeart },
  { id: 8, name: "문화·예술·디자인·방송", icon: Palette },
  { id: 9, name: "운전·운송", icon: Truck },
  { id: 10, name: "영업판매", icon: Tag },
  { id: 11, name: "경비·청소", icon: ShieldCheck },
  { id: 12, name: "이용·숙박·여행·오락·스포츠", icon: Hotel },
  { id: 13, name: "음식서비스", icon: Utensils },
  { id: 14, name: "건설", icon: Building },
  { id: 15, name: "기계", icon: Cog },
  { id: 16, name: "재료", icon: Layers },
  { id: 17, name: "화학·바이오", icon: FlaskConical },
  { id: 18, name: "섬유·의복", icon: Shirt },
  { id: 19, name: "전기·전자", icon: Zap },
  { id: 20, name: "정보통신", icon: Cpu },
  { id: 21, name: "식품가공", icon: Wheat },
  { id: 22, name: "인쇄·목재·가구·공예", icon: TreeDeciduous },
  { id: 23, name: "환경·에너지·안전", icon: Plug },
  { id: 24, name: "농림어업", icon: Leaf },
];

function SBigCat() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const selectedVideos = useSelector((state) => state.cVideos);

  const isComplete = selectedVideos.length === 3;

  const handleDelete = (id) => {
    dispatch(deleteVideo(id));
  };

  return (
    <StudentCategory>
    
      <div className="student-page">


        <h2 className="student-title">카테고리 선택</h2>
        <div className="student-progress">
          <span className="progress-badge-target">
            🛒 선택한 영상 {selectedVideos.length} / 3
          </span>
      </div>  

        <div className="student-grid">

          {categories.map((cat) => {

            const Icon = cat.icon;

            return (
              <button
                key={cat.id}
                className="student-card global-big-card"
                data-big-id={cat.id}
                onClick={() =>
                  navigate("/student/category/medium", {
                    state: {
                      bigId: cat.id,
                      bigName: cat.name,
                    },
                  })
                }
              >
                <Icon className="category-icon" color="var(--primary)" />

                <div className="category-text">
                  {String(cat.id).padStart(2, "0")}. {cat.name}
                </div>

              </button>
            );

          })}

        </div>
        {selectedVideos.length > 0 && (

          <div className="selected-video-container">

            <h3>선택된 영상</h3>

            {selectedVideos.map((video) => (

              <div key={video.id} className="selected-video-item">

                <span>{video.subCategory}</span>

                <button
                  className="delete-button"
                  onClick={() => handleDelete(video.id)}
                >
                  ✕
                </button>

              </div>

            ))}

          </div>

        )}

        <button
          className={`next-button global-category-next ${isComplete ? "next-button-active" : ""}`}
          onClick={() =>
            isComplete
              ? navigate("/student/category/checkout")
              : navigate("/student/category/big")
          }
        >
          {isComplete
            ? "영상보기"
            : `카테고리로 이동 (${selectedVideos.length}/3)`}
      </button>

      </div>

    </StudentCategory>
  );
}

export default SBigCat;
