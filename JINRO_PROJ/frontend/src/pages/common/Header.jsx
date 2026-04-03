import React from "react";
import { useNavigate } from "react-router-dom";
import mainLogo from "../../assets/logo/main_logo.png";

function Header() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 🔥 나중에 여기서 토큰 삭제, 세션 삭제 처리 가능
    // localStorage.removeItem("accessToken");
    const isConfirmed = window.confirm("로그아웃 하시겠습니까?");

    if (isConfirmed) {
      navigate("/");  // 👉 http://localhost:5173/
    }
    
  };

  const handleLogo = () => {
    navigate("/counselor/scheduler");
  };

  return (
    <header className="header">
      <div className="logo-box" onClick={handleLogo}>
        <img src={mainLogo} alt="logo" className="logo-img" />
      </div>
      <div className="logout-btn" onClick={handleLogout}>
        로그아웃
      </div>
    </header>
  );
}

export default Header;