import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import style from "../../css/student_css/SLogin.module.css";
import api from "../../services/app.js";
import { addVideo, clearVideos } from "../../redux/cVideos";

const SLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    ssn1: "",
    ssn2: "",
    phone1: "010",
    phone2: "",
    phone3: "",
    emailId: "",
    emailDomain: "",
    customEmailDomain: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBack = () => {
    navigate("/student/agreement");
  };

  const handleStartDiagnosis = async () => {
    if (isLoading) return;

    const {
      name,
      ssn1,
      ssn2,
      phone1,
      phone2,
      phone3,
      emailId,
      emailDomain,
      customEmailDomain,
    } = formData;

    const finalEmailDomain =
      emailDomain === "custom" ? customEmailDomain : emailDomain;

    if (
      !name.trim() ||
      !ssn1.trim() ||
      !ssn2.trim() ||
      !phone2.trim() ||
      !phone3.trim() ||
      !emailId.trim() ||
      !finalEmailDomain
    ) {
      alert("모든 정보를 정확하게 입력해 주세요.");
      return;
    }

    const fullSsn = `${ssn1}${ssn2}`;
    const fullPhone = `${phone1}${phone2}${phone3}`;
    const fullEmail = `${emailId}@${finalEmailDomain}`;

    try {
      setIsLoading(true);

      const response = await api.post("/client/login", {
        name,
        birthdate: fullSsn,
        phone_num: fullPhone,
        email: fullEmail,
      });

      const data = response.data;

      if (!data.success) {
        alert(data.message || "로그인에 실패했습니다.");
        return;
      }

      localStorage.setItem("client_id", data.client_id);

      if (data.has_unfinished_video) {
        const isGlobalOnboarding =
          localStorage.getItem("student_onboarding_flow") === "true";

        if (!isGlobalOnboarding) {
          const wantsToContinue = window.confirm(
            "아직 완료되지 않은 영상이 있습니다. 이어서 진행할까요?"
          );

          if (wantsToContinue) {
            if (data.video_list?.length > 0) {
              dispatch(addVideo(data.video_list));
            }

            navigate(`/student/video/${data.category_id}`, {
              state: {
                isResume: true,
                counseling_id: data.counseling_id,
                report_ids: data.report_ids,
              },
            });

            return;
          }
        }

        await api.delete(`/client/counselling/${data.counseling_id}`);
        dispatch(clearVideos());
      }

      navigate("/student/category/big");
    } catch (error) {
      alert(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "로그인 중 서버 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const resetLoginState = async () => {
      try {
        await api.get("/client/session/clear");
      } catch (error) {
        console.error("세션 초기화 실패:", error);
      } finally {
        sessionStorage.clear();
        dispatch(clearVideos());
        localStorage.removeItem("client_id");
        localStorage.removeItem("counselingId");
        localStorage.removeItem("reportIds");
      }
    };

    resetLoginState();
  }, [dispatch]);

  return (
    <div className={style.container}>
      <div className={style.card}>
        <button className={style.backButton} onClick={handleBack} type="button">
          <div className={style.backCircle}>←</div>
          <span className={style.backText}>이전으로</span>
        </button>

        <div className={style.header}>
          <h1>환영합니다</h1>
          <p>기본 정보를 입력해 주세요</p>
        </div>

        <div className={style.formContainer}>
          <div className={`${style.formGroup} onboard-name`}>
            <label>이름</label>
            <div className={style.inputRow}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="예: 홍길동"
                className={style.nameInput}
              />
            </div>
          </div>

          <div className={`${style.formGroup} onboard-ssn`}>
            <label>주민등록번호</label>
            <div className={style.inputRow}>
              <input
                type="text"
                name="ssn1"
                maxLength="6"
                value={formData.ssn1}
                onChange={handleChange}
              />
              <span>-</span>
              <input
                type="text"
                name="ssn2"
                maxLength="1"
                value={formData.ssn2}
                onChange={handleChange}
              />
              <span className={style.ssnMask}>******</span>
            </div>
          </div>

          <div className={`${style.formGroup} onboard-phone`}>
            <label>휴대폰 번호</label>
            <div className={style.inputRow}>
              <select name="phone1" value={formData.phone1} onChange={handleChange}>
                <option value="010">010</option>
                <option value="011">011</option>
              </select>
              <span>-</span>
              <input
                type="text"
                name="phone2"
                maxLength="4"
                value={formData.phone2}
                onChange={handleChange}
              />
              <span>-</span>
              <input
                type="text"
                name="phone3"
                maxLength="4"
                value={formData.phone3}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={`${style.formGroup} onboard-email`}>
            <label>이메일</label>
            <div className={style.inputRow}>
              <input
                type="text"
                name="emailId"
                value={formData.emailId}
                onChange={handleChange}
              />
              <span>@</span>
              <select
                name="emailDomain"
                value={formData.emailDomain}
                onChange={handleChange}
              >
                <option value="">선택</option>
                <option value="naver.com">naver.com</option>
                <option value="gmail.com">gmail.com</option>
                <option value="daum.net">daum.net</option>
                <option value="custom">직접입력</option>
              </select>
            </div>

            {formData.emailDomain === "custom" && (
              <div className={style.inputRow}>
                <input
                  type="text"
                  name="customEmailDomain"
                  value={formData.customEmailDomain}
                  onChange={handleChange}
                  placeholder="도메인을 입력하세요"
                />
              </div>
            )}
          </div>
        </div>

        <button
          className={`${style.submitButton} onboard-start-btn`}
          type="button"
          onClick={handleStartDiagnosis}
          disabled={isLoading}
        >
          <span className={style.submitText}>
            {isLoading ? "진행 중..." : "진단 시작하기"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default SLogin;
