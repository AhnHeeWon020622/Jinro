import { useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { deleteVideo } from "../../../redux/cVideos";
import StudentCategory from "../../common/StudentCategory";
import styles from "../../../css/student_css/SMedCat.module.css";

// ✅ 상담사 중분류와 동일 + id만 부여
const midCategoryMap = {
  1: [{ id: 101, name: "사업관리" }],
  2: [
    { id: 201, name: "기획사무" },
    { id: 202, name: "총무·인사" },
    { id: 203, name: "재무·회계" },
    { id: 204, name: "생산·품질관리" },
  ],
  3: [
    { id: 301, name: "금융" },
    { id: 302, name: "보험" },
  ],
  4: [
    { id: 401, name: "학교교육" },
    { id: 402, name: "평생교육" },
    { id: 403, name: "직업교육" },
  ],
  5: [
    { id: 501, name: "법률" },
    { id: 502, name: "소방방재" },
  ],
  6: [
    { id: 601, name: "보건" },
    { id: 602, name: "의료" },
  ],
  7: [
    { id: 701, name: "사회복지" },
    { id: 702, name: "상담" },
    { id: 703, name: "보육" },
  ],
  8: [
    { id: 801, name: "문화·예술" },
    { id: 802, name: "디자인" },
    { id: 803, name: "문화콘텐츠" },
  ],
  9: [
    { id: 901, name: "자동차운전·운송" },
    { id: 902, name: "철도운전·운송" },
    { id: 903, name: "선박운전·운송" },
    { id: 904, name: "항공운전·운송" },
  ],
  10: [
    { id: 1001, name: "영업" },
    { id: 1002, name: "부동산" },
    { id: 1003, name: "판매" },
  ],
  11: [
    { id: 1101, name: "경비" },
    { id: 1102, name: "청소" },
  ],
  12: [
    { id: 1201, name: "이·미용" },
    { id: 1202, name: "결혼·장례" },
    { id: 1203, name: "관광·레저" },
    { id: 1204, name: "스포츠" },
  ],
  13: [{ id: 1301, name: "식음료조리·서비스" }],
  14: [
    { id: 1401, name: "건설공사관리" },
    { id: 1402, name: "토목" },
    { id: 1403, name: "건축" },
    { id: 1404, name: "플랜트" },
    { id: 1405, name: "조경" },
    { id: 1406, name: "도시·교통" },
    { id: 1407, name: "건설기계운전·정비" },
    { id: 1408, name: "해양자원" },
  ],
  15: [
    { id: 1501, name: "기계설계" },
    { id: 1502, name: "기계가공" },
    { id: 1503, name: "기계조립·관리" },
    { id: 1504, name: "기계품질관리" },
    { id: 1505, name: "기계장치설치" },
    { id: 1506, name: "자동차" },
    { id: 1507, name: "철도차량제작" },
    { id: 1508, name: "조선" },
    { id: 1509, name: "항공기제작" },
    { id: 1510, name: "금형" },
    { id: 1511, name: "스마트공장(smart factory)" },
  ],
  16: [
    { id: 1601, name: "금속재료" },
    { id: 1602, name: "세라믹재료" },
  ],
  17: [
    { id: 1701, name: "화학·바이오공통" },
    { id: 1702, name: "석유·기초화학물" },
    { id: 1703, name: "정밀화학" },
    { id: 1704, name: "플라스틱·고무" },
    { id: 1705, name: "바이오" },
  ],
  18: [
    { id: 1801, name: "섬유제조" },
    { id: 1802, name: "패션" },
    { id: 1803, name: "의복관리" },
  ],
  19: [
    { id: 1901, name: "전기" },
    { id: 1902, name: "전자기기일반" },
    { id: 1903, name: "전자기기개발" },
  ],
  20: [
    { id: 2001, name: "정보기술" },
    { id: 2002, name: "통신기술" },
    { id: 2003, name: "방송기술" },
  ],
  21: [
    { id: 2101, name: "식품가공" },
    { id: 2102, name: "제과·제빵·떡제조" },
  ],
  22: [
    { id: 2201, name: "인쇄·출판" },
    { id: 2202, name: "공예" },
  ],
  23: [
    { id: 2301, name: "산업환경" },
    { id: 2302, name: "환경보건" },
    { id: 2303, name: "자연환경" },
    { id: 2304, name: "환경서비스" },
    { id: 2305, name: "에너지·자원" },
    { id: 2306, name: "산업안전보건" },
  ],
  24: [
    { id: 2401, name: "농업" },
    { id: 2402, name: "축산" },
    { id: 2403, name: "임업" },
    { id: 2404, name: "수산" },
  ],
};

function SMedCat() {

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const selectedVideos = useSelector((state) => state.cVideos);

  const { bigId, bigName } = location.state || {};
  const safeBigId = Number(bigId);

  const isComplete = selectedVideos.length === 3;

  useEffect(()=>{
    if(!safeBigId){
      navigate("/student/category/big");
    }
  },[safeBigId]);

  const midCategories = useMemo(()=>{
    if(!safeBigId) return [];
    return midCategoryMap[safeBigId] || [];
  },[safeBigId]);

  const handleCardClick = (mid)=>{
    navigate("/student/category/small",{
      state:{
        bigId:safeBigId,
        bigName,
        midId:mid.id,
        midName:mid.name
      }
    });
  };

  const handleDelete = (id)=>dispatch(deleteVideo(id));
  const handleBack = ()=>navigate(-1);

  /* ⭐ BIG 온보딩 흐름 이어받기 */

  return (
    <StudentCategory>
      <div className="student-page">


        <h1 className="student-title">분야 선택</h1>

        <p className="student-subtitle">
          서로 다른 카테고리에서 3개의 영상을 선택하세요
        </p>

        {/* ⭐ onboarding target */}
        <div className={`${styles.progressBadge} progressBadge`}>
          🛒 선택한 영상: {selectedVideos.length} / 3
        </div>

        <div className={styles.headerRow}>
          <h2 className={styles.categoryTitle}>{bigName}</h2>
        </div>

        {/* ⭐ onboarding target */}
        <div className={`${styles.cardGrid} cardGrid`}>
          {midCategories.map(mid=>(
            <div
              key={mid.id}
              className={`${styles.card} global-med-card`}
              data-mid-id={mid.id}
              onClick={()=>handleCardClick(mid)}
            >
              {mid.name}
            </div>
          ))}
        </div>

        {selectedVideos.length > 0 && (
          <div className="selected-video-container">
            <h3>선택된 영상</h3>

            {selectedVideos.map(video=>(
              <div key={video.id} className="selected-video-item">
                <span>{video.subCategory}</span>

                <button
                  className="delete-button"
                  onClick={()=>handleDelete(video.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.bottomActions}>

          <button
            className={styles.backBottomBtn}
            onClick={handleBack}
          >
            ← 뒤로가기
          </button>

          <button
            className={`${styles.nextBtn} ${isComplete ? styles.active : ""}`}
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

      </div>

    </StudentCategory>
  );
}

export default SMedCat;
