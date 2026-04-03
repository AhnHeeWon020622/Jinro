import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "../../css/counselor_css/CScheduler.css";
import api from "../../services/app.js"

import ScheduleOnboarding from "../counselor/c_onboarding/ScheduleOnboarding.jsx"

function getLocalYYYYMMDD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function CScheduler() {

  const [showGuide, setShowGuide] = useState(false);


  const calendarRef = useRef(null);
  const dialogRef = useRef(null);
  const navigate = useNavigate();
  const today = getLocalYYYYMMDD();

  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState("");
  const [modalStep, setModalStep] = useState("list"); // list | time
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const [dailySchedules, setDailySchedules] = useState([]);

  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.select(today);
    }

    // 🔥 화면 초기 진입 시 오늘 날짜의 데이터를 무조건 한 번 불러옵니다.
    // FullCalendar가 클릭했을 때 주는 info 객체 모양({ dateStr: 날짜 })을 그대로 흉내내서 넘겨줍니다.
    handleDateClick({ dateStr: today });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  

  const handleDateClick = async (info) => {
    const clickedDate = info.dateStr; // 예: "2026-03-04"

    // 1. UI 반응 (클릭한 날짜로 포커스 이동)
    setSelectedDate(clickedDate);
    const calendarApi = calendarRef.current?.getApi(); // 💡 변수명 변경 (api -> calendarApi)
    if (calendarApi) {
      calendarApi.gotoDate(clickedDate);
      calendarApi.unselect();
      calendarApi.select(clickedDate);
    }

    // 2. 백엔드 데이터 가져오기
    try {
      const response = await api.get(`/counselor/schedules?date=${clickedDate}`);

      // 3. 받아온 데이터로 화면 업데이트
      if (response.data.success) {
        setDailySchedules(response.data.schedules);
      }
    } catch (error) {
      console.error("일정 불러오기 실패:", error);
      setDailySchedules([]); // 실패 시 빈 배열로 초기화
    }
  };

  const openModal = async () => {
    try {
      const response = await api.get("/counselor/pending-students");
      if (response.data.success) {
        setPendingStudents(response.data.students);
        setModalStep("list");
        setSelectedStudent(null);
        setSelectedTime(null);
        setSearch("");
        dialogRef.current?.showModal();
      }
    } catch (error) {
      alert("대상자 목록을 불러오지 못했습니다.");
    }
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };


  const handleScheduleSubmit = async () => {
    try {
      // 선택된 학생의 PK(counseling_id), 선택된 날짜, 선택된 시간을 백엔드로 전송
      const response = await api.put(`/counselor/schedule/${selectedStudent.counseling_id}`, {
        date: selectedDate,
        time: selectedTime,
      });

      if (response.data.success) {
        alert("일정이 성공적으로 등록되었습니다.");
        closeModal();

        // 🔥 화면 새로고침 (선택했던 날짜의 일정을 다시 불러옴)
        handleDateClick({ dateStr: selectedDate });
      }
    } catch (error) {
      console.error("일정 등록 오류:", error);
      alert("일정 등록에 실패했습니다.");
    }
  };

  const [pendingStudents, setPendingStudents] = useState([]);

  // const students = [
  //   { id: 1, name: "김민준", studentNo: "S2024011" },
  //   { id: 2, name: "이서연", studentNo: "S2024012" },
  //   { id: 3, name: "박지훈", studentNo: "S2024013" },
  // ];

  // const dummySchedules = [
  //   { id: 1, time: "09:00", name: "김민준", type: "진로 상담", status: "완료" },
  //   { id: 2, time: "10:00", name: "이서연", type: "학업 상담", status: "완료" },
  //   { id: 3, time: "11:00", name: "박지호", type: "진로 상담", status: "예정" },
  //   { id: 4, time: "13:00", name: "최유진", type: "학업 상담", status: "예정" },
  // ];

  // 💡 수정: 검색 필터링 (pendingStudents 기준)
  const filteredStudents = pendingStudents.filter(
    (student) =>
      student.name.includes(search) ||
      student.studentNo.includes(search)
  );

  const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

  const goToFinalReport = (clientId, counselingId) => {
    navigate(`/counselor/report/final/${clientId}/${counselingId}`);
  };

  return (
    <div className="scheduler-container">
      <div className="calendar-section">
        <h3>상담 캘린더</h3>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={today}
          selectable={true}
          selectMirror={false}
          unselectAuto={false}
          dateClick={handleDateClick}
          height="auto"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
        />
      </div>

      <div className="list-section">
        <div className="list-header">
          <h3>{selectedDate} 상담 일정</h3>
          <button className="add-btn" onClick={openModal}>
            일정 추가
          </button>
        </div>

        {dailySchedules.length === 0 ? (
          <div className="empty-box">등록된 일정이 없습니다.</div>
        ) : (
          <div className="schedule-list">
            {dailySchedules.map((schedule) => (
              <div key={schedule.id} className="schedule-card" onClick={() => goToFinalReport(schedule.client_id, schedule.id)} style={{ cursor: "pointer" }}>
                <div className="schedule-left">
                  <div className="schedule-time">
                    <span className="time-icon">🕒</span> {/* 아이콘 */}
                    <span>{schedule.time}</span>
                  </div>
                  <div className="schedule-info">
                    <span className="schedule-name">{schedule.name}</span>
                    <span className="schedule-type">{schedule.type}</span>
                  </div>
                </div>

                {/* 상태에 따라 다른 클래스 적용 (완료: green, 예정: orange) */}
                <div className={`status-badge ${schedule.status === "완료" ? "done" : "planned"}`}>
                  {schedule.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔥 dialog 모달 */}
      <dialog ref={dialogRef} className="custom-dialog">

        {/* STEP 1 : 학생 선택 */}
        {modalStep === "list" && (
          <>
            <div className="dialog-header">
              <h2>{selectedDate}</h2>
              <button className="dialog-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <input
              type="text"
              placeholder="학생 검색..."
              className="dialog-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="dialog-body">
              {filteredStudents.length === 0 ? (
                <div className="empty-msg">대상 학생이 없습니다.</div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.counseling_id} // 💡 DB의 PK 사용
                    className="dialog-card selectable"
                    onClick={() => {
                      setSelectedStudent(student);
                      setModalStep("time");
                    }}
                  >
                    <strong>{student.name}</strong>
                    <div>{student.studentNo}</div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* STEP 2 : 시간 선택 */}
        {modalStep === "time" && selectedStudent && (
          <>
            <div className="dialog-header">
              <h2>{selectedDate}</h2>
              <button className="dialog-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="time-student-box">
              <strong>{selectedStudent.name}</strong>
              <span className="student-badge">
                {selectedStudent.studentNo}
              </span>
            </div>

            <div className="time-grid">
              {timeSlots.map((time) => {
                // 🔥 핵심: 현재 선택된 날짜의 일정(dailySchedules) 중, 이 시간(time)과 겹치는 예약이 있는지 확인
                const isBooked = dailySchedules.some(
                  (schedule) => schedule.time === time
                );

                return (
                  <button
                    key={time}
                    // 예약된 시간은 'booked' 클래스를 추가하고, 선택된 시간은 'active'로 표시
                    className={`time-btn ${selectedTime === time ? "active" : ""} ${isBooked ? "booked" : ""}`}
                    onClick={() => setSelectedTime(time)}
                    disabled={isBooked} // 👈 예약된 시간이면 버튼 클릭 비활성화!
                  >
                    {time}
                  </button>
                );
              })}
            </div>

            <div className="time-footer">
              <button
                className="back-btn"
                onClick={() => setModalStep("list")}
              >
                뒤로가기
              </button>

              <button
                className="submit-btn"
                disabled={!selectedTime}
                onClick={handleScheduleSubmit}
              >
                등록
              </button>
            </div>
          </>
        )}

      </dialog>
         <button
            className="guide-btn"
            onClick={() => setShowGuide(true)}
          >
            가이드 보기
          </button>
        {showGuide && (
        <ScheduleOnboarding
          onClose={() => setShowGuide(false)}
        />
)}
    </div>
  );
  
}

export default CScheduler;