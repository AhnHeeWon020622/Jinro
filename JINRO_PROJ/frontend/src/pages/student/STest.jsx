import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

const STest = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  // 영상 녹화를 위한 Ref 추가
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [landmarkDataLog, setLandmarkDataLog] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("로딩 중...");

  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1, // 사람 얼굴 인식 개수
      refineLandmarks: true, // 홍채 및 입술 정밀 추적
      minDetectionConfidence: 0.5, // 사람인식 수준 (0 ~ 1) , 너무 높으면 조명하나로도 사람인식 못하고, 너무 낮으면 옷걸이도 인간으로 취급함
      minTrackingConfidence: 0.5, // 얼마나 잘 따라다닐거냐, 너무 높으면 조금만 빨리 움지경도 데이터 수집이 멈추고, 너무 낮으면 쓸데없이 수집하여 죄표의 오차값이 커짐
    });

    faceMesh.onResults(onResults);

    let camera = null;
    if (webcamRef.current && webcamRef.current.video) {
      camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current && webcamRef.current.video) {
            await faceMesh.send({ image: webcamRef.current.video });
          }
        },
        width: 640,
        height: 480,
      });
      camera.start().then(() => setCameraStatus("카메라 켜짐"));
    }

    return () => {
      if (camera) camera.stop();
      faceMesh.close();
    };
  }, []);

  const onResults = (results) => {
    if (!canvasRef.current) return;
    
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        for (let i = 0; i < landmarks.length; i++) {
          const x = landmarks[i].x * canvasElement.width;
          const y = landmarks[i].y * canvasElement.height;
          canvasCtx.beginPath();
          canvasCtx.arc(x, y, 1, 0, 2 * Math.PI);
          canvasCtx.fillStyle = 'aqua';
          canvasCtx.fill();
        }

        if (isRecordingRef.current) {
          const logEntry = {
            timestamp: Date.now(),
            nose_tip: landmarks[1],
            left_iris: landmarks[468],
            right_iris: landmarks[473],
          };
          setLandmarkDataLog((prev) => [...prev, logEntry]);
        }
      }
    }
    canvasCtx.restore();
  };

  // 영상 및 데이터 기록 시작/중지 통합 관리 함수
  const toggleRecording = () => {
    if (!isRecording) {
      // 1. 녹화 시작
      setIsRecording(true);
      recordedChunksRef.current = []; // 이전 녹화 데이터 초기화

      const stream = webcamRef.current.video.srcObject;
      if (stream) {
        // MediaRecorder 생성 및 설정
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'video/webm; codecs=vp9'
        });

        // 영상 조각(chunk)이 생성될 때마다 배열에 저장
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        // 녹화가 중지되었을 때 파일로 다운로드하는 이벤트
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'counseling_video.webm'; // webm 포맷으로 저장
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url); // 메모리 확보
        };

        mediaRecorderRef.current.start();
      }
    } else {
      // 2. 녹화 중지
      setIsRecording(false);
      
      // MediaRecorder 정지 (정지 시 onstop 이벤트가 발생하며 영상 다운로드됨)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
  };

  const downloadDataAsTxt = () => {
    if (landmarkDataLog.length === 0) {
      alert("기록된 데이터가 없습니다.");
      return;
    }

    const dataString = JSON.stringify(landmarkDataLog, null, 2);
    const blob = new Blob([dataString], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'counseling_facial_data.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setLandmarkDataLog([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
      <h2>상담 얼굴 분석 데이터 추출기</h2>
      <p>상태: {cameraStatus}</p>
      
      <div style={{ position: 'relative', width: 640, height: 480 }}>
        <Webcam
          ref={webcamRef}
          style={{ position: 'absolute', left: 0, top: 0, width: 640, height: 480, visibility: 'hidden' }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ position: 'absolute', left: 0, top: 0, width: 640, height: 480 }}
        />
      </div>

      <div style={{ marginTop: '20px', gap: '10px', display: 'flex' }}>
        <button 
          onClick={toggleRecording} // onClick 이벤트를 토글 함수로 변경
          style={{ padding: '10px 20px', backgroundColor: isRecording ? 'red' : 'green', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {isRecording ? '데이터 & 영상 기록 중지' : '데이터 & 영상 기록 시작'}
        </button>

        <button 
          onClick={downloadDataAsTxt}
          style={{ padding: '10px 20px', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          TXT 다운로드
        </button>
      </div>
      <p>현재 기록된 프레임 수: {landmarkDataLog.length}</p>
    </div>
  );
};

export default STest;