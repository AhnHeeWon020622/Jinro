import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";


import "../../css/common_css/base.css";

// props에서 children을 받아옵니다.
function Layout({ children }) {
  return (
    <div className="layout-container">
      <Header />

      <div className="content-wrapper">
        <Sidebar />

        <div className="main-container">
          <main className="content-area">
            {children ? children : <Outlet />}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Layout;