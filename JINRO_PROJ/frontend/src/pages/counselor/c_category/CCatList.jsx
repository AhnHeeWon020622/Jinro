import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../common/Layout";
import "../../../css/counselor_css/Category.css";
import api from '../../../services/app'

import CategoryOnboarding from "../c_onboarding/CategoryOnboarding.jsx"

import {
  Briefcase,
  Calculator,
  Building,
  GraduationCap,
  Gavel,
  HandHeart,
  User,
  Palette,
  Truck,
  ShoppingCart,
  ShieldCheck,
  Mountain,
  Utensils,
  Factory,
  Settings,
  Package,
  FlaskConical,
  Shirt,
  Zap,
  Cpu,
  Database,
  Hammer,
  Leaf,
  Flower2,
  ArrowLeft,
} from "lucide-react";

/** =========================
 * 1) 대분류
 * ========================= */
const bigCategories = [
  { id: 1, name: "사업관리", icon: Briefcase },
  { id: 2, name: "경영·회계·사무", icon: Calculator },
  { id: 3, name: "금융·보험", icon: Building },
  { id: 4, name: "교육·자연·사회과학", icon: GraduationCap },
  { id: 5, name: "법률·경찰·소방·교도·국방", icon: Gavel },
  { id: 6, name: "보건·의료", icon: HandHeart },
  { id: 7, name: "사회복지·종교", icon: User },
  { id: 8, name: "문화·예술·디자인·방송", icon: Palette },
  { id: 9, name: "운전·운송", icon: Truck },
  { id: 10, name: "영업판매", icon: ShoppingCart },
  { id: 11, name: "경비·청소", icon: ShieldCheck },
  { id: 12, name: "이용·숙박·여행·오락·스포츠", icon: Mountain },
  { id: 13, name: "음식서비스", icon: Utensils },
  { id: 14, name: "건설", icon: Factory },
  { id: 15, name: "기계", icon: Settings },
  { id: 16, name: "재료", icon: Package },
  { id: 17, name: "화학·바이오", icon: FlaskConical },
  { id: 18, name: "섬유·의복", icon: Shirt },
  { id: 19, name: "전기·전자", icon: Zap },
  { id: 20, name: "정보통신", icon: Cpu },
  { id: 21, name: "식품가공", icon: Database },
  { id: 22, name: "인쇄·목재·가구·공예", icon: Hammer },
  { id: 23, name: "환경·에너지·안전", icon: Leaf },
  { id: 24, name: "농림어업", icon: Flower2 },
];

/** =========================
 * 2) 중분류 매핑
 * ========================= */
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

export default function CCatList() {
  const navigate = useNavigate();

  const [selectedBigId, setSelectedBigId] = useState(null);
  const [selectedMidId, setSelectedMidId] = useState(null);   
  const [selectedMidName, setSelectedMidName] = useState(null);
  const [selectedMid, setSelectedMid] = useState(null);
  const [dbCategories, setDbCategories] = useState([]);

  const [showGuide, setShowGuide] = useState(false);   


  useEffect(() => {
  if (selectedMidId === null) return;

  api.get(`/counselor/category/kind/${selectedMidId}`)
    .then((res) => res.data)
    .then((data) => {
      if (data.success) {
        setDbCategories(data.data);
      }
    })
    .catch((err) => console.error("소분류 조회 실패:", err));
  }, [selectedMidId]);

  const selectedBig = useMemo(() => {
    if (selectedBigId == null) return null;
    return bigCategories.find((c) => c.id === selectedBigId) || null;
  }, [selectedBigId]);

  const midCategories = useMemo(() => {
    if (selectedBigId == null) return [];
    return midCategoryMap[selectedBigId] || [];
  }, [selectedBigId]);

  // 🔥 핵심 수정: 중분류 id 기준 필터
  const smallCategories = dbCategories;

  return (
    <div className="counselor-category-page">

      {/* 1️⃣ 대분류 */}
      {selectedBigId == null && (
        <>
          <h2 className="page-title">카테고리 선택</h2>
          <div className="category-grid">
            {bigCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  className="category-card category-card-btn"
                  onClick={() => {
                    setSelectedBigId(cat.id);
                    setSelectedMidId(null);
                    setSelectedMidName(null);
                  }}
                >
                  <Icon className="category-icon" color="var(--primary)" />
                  <div className="category-text">
                    {String(cat.id).padStart(2, "0")}. {cat.name}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* 2️⃣ 중분류 */}
      {selectedBigId != null && selectedMidId == null && (
        <>
          <div className="page-header-row">
            <button
              className="back-btn"
              onClick={() => {
                setSelectedBigId(null);
                setSelectedMidId(null);
                setSelectedMidName(null);
              }}
            >
              <ArrowLeft size={18} />
              대분류로
            </button>

            <h2 className="page-title">
              {String(selectedBig.id).padStart(2, "0")}. {selectedBig.name}
            </h2>
          </div>

          <div className="mid-grid">
            {midCategories.map((mid) => (
              <button
                key={mid.id}
                className="mid-card"
                onClick={() => {
                  setSelectedMidId(mid.id);      // 🔥 핵심
                  setSelectedMidName(mid.name);  // 🔥 핵심
                }}
              >
                {mid.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 3️⃣ 소분류 */}
      {selectedMidId != null && (
        <>
          <div className="page-header-row">
            <button
              className="back-btn"
              onClick={() => {
                setSelectedMidId(null);
                setSelectedMidName(null);
              }}
            >
              <ArrowLeft size={18} />
              중분류로
            </button>

            <h2 className="page-title">
              {String(selectedBig.id).padStart(2, "0")}. {selectedBig.name} &gt; {selectedMidName}
            </h2>
          </div>

          <div className="list-container">
            {smallCategories.length === 0 ? (
              <p>등록된 소분류가 없습니다.</p>
            ) : (
              smallCategories.map((item) => (
                <div key={item.c_id} className="list-item">
                  <div className="list-left">
                    <h4>{item.title}</h4>
                    <p>{item.url}</p>
                  </div>
                  <div className="list-right">
                    <button
                      onClick={() =>
                        navigate("/counselor/category/write", {
                          state: {
                            ...item,
                            kindId: selectedMidId
                          }
                        })
                      }
                    >
                      상세보기
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="add-btn-wrapper outside">
            <button
              className="add-btn"
              onClick={() =>
                navigate("/counselor/category/write", {
                  state: { kindId: selectedMidId }, // 🔥 중분류 id 저장
                })
              }
            >
              추가
            </button>
          </div>
        </>
      )}
      <button
        className="guide-btn"
        onClick={() => setShowGuide(true)}
      >
        가이드 보기
      </button>
      {showGuide && (
        <CategoryOnboarding
          onClose={() => setShowGuide(false)}
          selectedBigId={selectedBigId}
          selectedMidId={selectedMidId}
          setSelectedBigId={setSelectedBigId}
          setSelectedMidId={setSelectedMidId}
        />
      )}
    </div>
    
  );
}