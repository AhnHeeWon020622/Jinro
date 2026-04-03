import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/counselor_css/CStudentList.css";
import api from "../../services/app";

import StudentListOnboarding from "./c_onboarding/StudentListOnboarding.jsx";

function sumUnread(list = []) {
  return list.reduce((acc, c) => acc + (c.unread || 0), 0);
}

export default function CStudentList() {
  const dialogRef = useRef(null);
  const navigate = useNavigate();

  const [showGuide, setShowGuide] = useState(false);

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState({
    isOpen: false,
    studentId: null,
  });

  /* ===============================
     학생 목록 DB 조회
  =============================== */
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get("/counselor/students");
        const data = response.data;

        if (data.success) {
          const mappedStudents = data.data.map((s) => ({
            id: s.client_id.toString(),
            name: s.name,
            studentId: s.student_id,
            tel: s.tel,
            email: s.email,
            tag: "상담 기록 존재",
            consultations: [],
          }));

          setStudents(mappedStudents);
        }
      } catch (error) {
        console.error("학생 목록 조회 실패:", error);
      }
    };

    fetchStudents();
  }, []);

  const currentStudent = students.find((s) => s.id === modal.studentId);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;

    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q)
    );
  }, [search, students]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (modal.isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [modal.isOpen]);

  const openStudentModal = async (student) => {
    setModal({
      isOpen: true,
      studentId: student.id,
    });

    try {
      const response = await api.get(`/counselor/consultations/${student.id}`);

      if (response.data.success) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === student.id
              ? { ...s, consultations: response.data.data }
              : s
          )
        );
      }
    } catch (error) {
      console.error("상담 기록 조회 실패:", error);
    }
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      studentId: null,
    });
  };

  const goToFinalReport = (consultation) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === modal.studentId
          ? {
              ...s,
              consultations: s.consultations.map((c) =>
                c.id === consultation.id ? { ...c, unread: 0 } : c
              ),
            }
          : s
      )
    );

    closeModal();

    navigate(`/counselor/report/final/${modal.studentId}/${consultation.id}`, {
      state: {
        studentName: currentStudent?.name,
      },
    });
  };

    return (
  <div className="student-container">

    <div className="student-top">
      <h2 className="content-title">학생목록</h2>
      <input
        type="text"
        className="student-search"
        placeholder="학생 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    <div className="student-list">
      {filteredStudents.map((student) => {
        const unreadTotal = sumUnread(student.consultations);

        return (
          <div
            key={student.id}
            className="student-card"
            onClick={() => openStudentModal(student)}
          >
            <div>
              <div className="name-row">
                <span className="student-name">{student.name}</span>
                <span className="student-id">{student.studentId}</span>
              </div>

              <div className="info-row">
                <span>tel: {student.tel}</span>
                <span>email: {student.email}</span>
              </div>

              <div className="student-tag">{student.tag}</div>
            </div>

              {unreadTotal > 0 && (
                <div className="student-badge">
                  {unreadTotal > 99 ? "99+" : unreadTotal}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 바깥 화면용 가이드 버튼 */}
      <button
        type="button"
        className="guide-btn"
        onClick={() => setShowGuide(true)}
      >
        가이드 보기
      </button>

      {/* 모달 닫혀 있을 때 온보딩은 바깥에서 렌더 */}
      {showGuide && !modal.isOpen && (
        <StudentListOnboarding
          onClose={() => setShowGuide(false)}
          modalOpen={modal.isOpen}
        />
      )}

      <dialog
        ref={dialogRef}
        className="consult-dialog"
        onClick={(e) => {
          if (e.target === dialogRef.current) closeModal();
        }}
        onClose={() => {
          setModal({
            isOpen: false,
            studentId: null,
          });
        }}
      >
        {currentStudent && (
          <div className="consult-dialog-inner">
            {/* 모달 열려 있을 때 온보딩은 dialog 내부에서 렌더 */}
            {showGuide && modal.isOpen && (
              <StudentListOnboarding
                onClose={() => setShowGuide(false)}
                modalOpen={modal.isOpen}
              />
            )}

            <div className="consult-dialog-header">
              <button
                type="button"
                className="consult-back"
                onClick={closeModal}
              >
                ← 이전으로
              </button>

            </div>

            <h2 className="consult-title-center">
              {currentStudent.name} 상담 기록 ({currentStudent.consultations.length}회)
            </h2>

            <div className="consult-list">
              {currentStudent.consultations.map((c) => (
                <div
                  key={c.id}
                  className={`consult-card ${c.final === "N" ? "disabled" : ""}`}
                  onClick={() => {
                    if (c.final === "N") {
                      alert("아직 최종 리포트가 생성되지 않아 열람할 수 없습니다.");
                      return;
                    }
                    goToFinalReport(c);
                  }}
                  style={{
                    cursor: c.final === "N" ? "not-allowed" : "pointer",
                    opacity: c.final === "N" ? 0.5 : 1,
                    backgroundColor: c.final === "N" ? "#f9f9f9" : "#fff",
                  }}
                >
                  <div className="consult-card-left">
                    <div className="consult-card-title-row">
                      <div className="consult-card-title">{c.title}</div>

                    {c.unread > 0 && (
                      <div className="consult-badge">
                        {c.unread > 99 ? "99+" : c.unread}
                      </div>
                    )}
                  </div>

                    <div className="consult-card-desc">{c.description}</div>
                  </div>

                  <div className="consult-card-right">
                    {c.final_report_yn === "Y" ? (
                      <div className="status-label complete">상담완료</div>
                    ) : (
                      <div className="status-label pending">작성중</div>
                    )}

                    {/* 👇 작성중일 때 date 숨김 */}
                    {c.final_report_yn === "Y" && (
                      <div className="consult-card-date">{c.date}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}