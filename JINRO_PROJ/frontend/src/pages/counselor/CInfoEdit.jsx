import { useState, useEffect } from "react";
import "../../css/counselor_css/CInfoEdit.css";
import api from "../../services/app";

import InfoEditOnboarding from "./c_onboarding/InfoEditOnboarding.jsx";

function CInfoEdit() {

  const [showGuide,setShowGuide] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    const fetchCounselorInfo = async () => {
      const counselorId = localStorage.getItem("counselor_id");
      if (!counselorId) return;

      try {
        const response = await api.get(
          `/counselor/${counselorId}`
        );

        const data = response.data;

        if (data.success) {
          setFormData({
            name: data.data.name,
            phone: data.data.phone,
            email: data.data.email,
          });
        }
      } catch (error) {
        console.error("정보 조회 실패:", error);
      }
    };

    fetchCounselorInfo();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    const counselorId = localStorage.getItem("counselor_id");
    if (!counselorId) return;

    try {
      await api.put(`/counselor/${counselorId}`, formData);
      alert("정보가 저장되었습니다.");
    } catch (error) {
      console.error("수정 실패:", error);
    }
  };

  return (
    <div className="cinfoedit-container">
      <h2 className="content-title">정보수정</h2>

      <div className="cinfoedit-form">
        <div className="form-row">
          <label>이름:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <label>전화번호:</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <label>e-mail:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="button-wrapper">
          <button className="save-btn" onClick={handleSubmit}>
            저장
          </button>
        </div>
      </div>

      
      <button
        className="guide-btn"
        onClick={() => setShowGuide(true)}
      >
        가이드 보기
      </button>

      
      {showGuide && (
        <InfoEditOnboarding
          onClose={() => setShowGuide(false)}
        />
      )}

    </div>
  );
}

export default CInfoEdit;