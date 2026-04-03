import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

const STest = () => {

  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [recording, setRecording] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const startRecording = () => {  

    const stream = webcamRef.current.video.srcObject;

    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "video/webm"
    });

    recordedChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {

      const blob = new Blob(recordedChunksRef.current, {
        type: "video/webm"
      });
      
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${studentName}_${phoneNumber}.webm`;
      a.click();

      URL.revokeObjectURL(url);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>

      <h2>상담 영상 녹화</h2>

      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="학생 이름"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          placeholder="핸드폰 번호"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
      </div>

      <Webcam
        ref={webcamRef}
        audio={true}
        width={640}
        height={480}
        mirrored={true}
      />

      <div style={{ marginTop: "20px" }}>

        {!recording && (
          <button
            onClick={startRecording}
            style={{ padding: "10px 20px", background: "green", color: "white" }}
          >
            녹화 시작
          </button>
        )}

        {recording && (
          <button
            onClick={stopRecording}
            style={{ padding: "10px 20px", background: "red", color: "white" }}
          >
            녹화 종료
          </button>
        )}

      </div>

    </div>
  );
};

export default STest;