import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { useSelector } from "react-redux";

import "../../css/student_css/SVideo.css";
import api from "../../services/app";

function SVideo() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const location = useLocation();

  const selectedVideos = useSelector((state) => state.cVideos);
  const currentIndex = location.state?.currentIndex ?? 0;
  const currentCounselingId = location.state?.counseling_id || null;
  const currentReportIds = location.state?.report_ids || [];
  const isGlobalOnboarding =
    localStorage.getItem("student_onboarding_flow") === "true";

  const webcamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunks = useRef([]);
  const cameraRef = useRef(null);
  const streamRef = useRef(null);

  const frontStartTimeRef = useRef(null);
  const frontFrameCountRef = useRef(0);
  const lostFaceCountRef = useRef(0);
  const nonFrontCountRef = useRef(0);
  const isTriggeredRef = useRef(false);

  const [currentVideo, setCurrentVideo] = useState(null);
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [started, setStarted] = useState(false);
  const [onboardingStartRequested, setOnboardingStartRequested] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isFacingFront, setIsFacingFront] = useState(false);
  const [frontTime, setFrontTime] = useState(0);
  const [readyToStart, setReadyToStart] = useState(false);
  const [uploading, setUploading] = useState(false);
  const canGoSurvey = isGlobalOnboarding || videoEnded;
  const showStartButton = isGlobalOnboarding
    ? webcamReady || webcamError
    : readyToStart;

  useEffect(() => {
    let activeStream = null;

    const initWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        activeStream = stream;

        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
          setWebcamReady(true);
          setWebcamError(false);

        }
      } catch (error) {
        console.error("카메라 연결 실패:", error);
        setWebcamError(true);
        setWebcamReady(false);

      }
    };

    initWebcam();

    return () => {
      if (webcamRef.current?.srcObject) {
        webcamRef.current.srcObject.getTracks().forEach((track) => track.stop());
        webcamRef.current.srcObject = null;
      }

      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }

      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isGlobalOnboarding]);

  useEffect(() => {
    if (!webcamReady || !webcamRef.current || started || isGlobalOnboarding) {
      return;
    }

    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.7,
    });

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks) {
        setFaceDetected(false);
        lostFaceCountRef.current += 1;

        if (lostFaceCountRef.current > 10) {
          setIsFacingFront(false);
          setFrontTime(0);
          frontStartTimeRef.current = null;
          frontFrameCountRef.current = 0;
          lostFaceCountRef.current = 0;
        }

        return;
      }

      lostFaceCountRef.current = 0;

      const landmarks = results.multiFaceLandmarks[0];

      let front = undefined;
      if (landmarks) {
        const nose = landmarks[1];
        const left = landmarks[234];
        const right = landmarks[454];
        const faceWidth = right.x - left.x;

        if (faceWidth === 0) return;

        setFaceDetected(true);

        const noseOffset = (nose.x - left.x) / faceWidth;
        const yawFront = noseOffset > 0.15 && noseOffset < 0.85;
        const pitchFront = nose.y > 0.35 && nose.y < 0.65;
        front = yawFront && pitchFront;
      }

      setIsFacingFront(front);

      if (front) {
        nonFrontCountRef.current = 0;
        frontFrameCountRef.current += 1;

        if (frontFrameCountRef.current >= 3) {
          if (!frontStartTimeRef.current) {
            frontStartTimeRef.current = Date.now();
          }

          const duration = (Date.now() - frontStartTimeRef.current) / 1000;
          setFrontTime(duration);

          if (duration > 8) {
            frontStartTimeRef.current = null;
            setFrontTime(0);
            return;
          }

          if (duration >= 3 && !isTriggeredRef.current) {
            isTriggeredRef.current = true;
            setReadyToStart(true);
          }
        }
      } else {
        frontFrameCountRef.current = 0;
        nonFrontCountRef.current += 1;

        if (nonFrontCountRef.current > 20) {
          frontStartTimeRef.current = null;
          setFrontTime(0);
          nonFrontCountRef.current = 0;
        }
      }
    });

    const camera = new Camera(webcamRef.current, {
      onFrame: async () => {
        await faceMesh.send({ image: webcamRef.current });
      },
      width: 640,
      height: 480,
    });

    cameraRef.current = camera;
    camera.start();

    return () => {
      try {
        faceMesh.close();
      } catch (error) {
        console.error(error);
      }
    };
  }, [isGlobalOnboarding, started, webcamReady]);

  useEffect(() => {
    if (currentIndex > 0 && webcamReady) {
      startRecording();
      setStarted(true);
    }
  }, [currentIndex, webcamReady]);

  useEffect(() => {
    if (!isGlobalOnboarding) {
      return undefined;
    }

    const handleOnboardingStartRequest = () => {
      setOnboardingStartRequested(true);
    };

    window.addEventListener(
      "student-onboarding-video-confirmed",
      handleOnboardingStartRequest
    );

    return () => {
      window.removeEventListener(
        "student-onboarding-video-confirmed",
        handleOnboardingStartRequest
      );
    };
  }, [isGlobalOnboarding]);

  const fetchVideo = async () => {
    try {
      const response = await api.get(`/client/survey/${categoryId}`);

      if (response.data.success) {
        setCurrentVideo(response.data.data);
        setVideoEnded(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (started) {
      fetchVideo();
    }
  }, [categoryId, started]);

  const extractVideoId = (url) => {
    if (!url) return null;

    try {
      const parsed = new URL(url);

      if (parsed.hostname.includes("youtu.be")) {
        return parsed.pathname.slice(1);
      }

      return parsed.searchParams.get("v");
    } catch {
      return null;
    }
  };

  const startRecording = () => {
    if (!webcamRef.current?.srcObject) {
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const stream = webcamRef.current.srcObject;
    streamRef.current = stream;

    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    recorderRef.current = mediaRecorder;
    recordedChunks.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.current.push(event.data);
      }
    };

    mediaRecorder.start(1000);
  };

  const stopRecording = () =>
    new Promise((resolve) => {
      if (!recorderRef.current) {
        resolve(new Blob([], { type: "video/webm" }));
        return;
      }

      if (recorderRef.current.state === "inactive") {
        resolve(new Blob(recordedChunks.current, { type: "video/webm" }));
        return;
      }

      recorderRef.current.onstop = () => {
        resolve(new Blob(recordedChunks.current, { type: "video/webm" }));
      };

      try {
        recorderRef.current.stop();
      } catch (error) {
        console.error("녹화 종료 실패:", error);
        resolve(new Blob(recordedChunks.current, { type: "video/webm" }));
      }
    });

  const handleStart = () => {
    if (started) {
      return;
    }

    if (currentCounselingId) {
      localStorage.setItem("counselingId", currentCounselingId);
    }

    if (currentReportIds.length > 0) {
      localStorage.setItem("reportIds", JSON.stringify(currentReportIds));
    }

    setStarted(true);

    if (webcamReady && webcamRef.current?.srcObject) {
      startRecording();
    }
  };

  useEffect(() => {
    if (!isGlobalOnboarding || !onboardingStartRequested || started) {
      return;
    }

    if (!webcamReady && !webcamError) {
      return;
    }

    handleStart();
  }, [
    isGlobalOnboarding,
    onboardingStartRequested,
    started,
    webcamError,
    webcamReady,
  ]);

  const handleGoSurvey = async () => {
    if (uploading) return;

    setUploading(true);

    try {
      // 1. 녹화 종료 및 영상 데이터(blob) 생성
      const blob = await stopRecording();

      // 2. 웹캠 완전히 끄기
      if (webcamRef.current?.srcObject) {
        webcamRef.current.srcObject.getTracks().forEach((track) => track.stop());
        webcamRef.current.srcObject = null;
      }

      // 3. 서버 업로드 X -> 바로 설문 페이지로 이동하면서 영상 데이터 전달
      navigate(`/student/survey/${categoryId}`, {
        state: {
          currentIndex,
          videoBlob: blob // 🔥 핵심: 영상을 메모리에 들고 넘어갑니다.
        },
      });
    } catch (error) {
      console.error("영상 처리 실패:", error);
      setUploading(false);
      alert("영상 처리 중 문제가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  const videoId = extractVideoId(currentVideo?.url);

  useEffect(() => {
    if (!started || !videoId) return;

    setVideoEnded(false);

    const createPlayer = () => {
      new window.YT.Player("youtube-player", {
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              setVideoEnded(true);
            }
          },
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = createPlayer;
    } else {
      createPlayer();
    }

    return undefined;
  }, [isGlobalOnboarding, started, videoId]);

  return (
    <div className="svideo-page">
      {!started && (
        <div className="webcam-check">
          <h2>웹캠 상태 확인</h2>

          {webcamError && !isGlobalOnboarding ? (
            <div className="webcam-error-msg">
              카메라를 찾을 수 없거나 권한이 거부되었습니다.
              <br />
              설정을 확인한 뒤 다시 시도해 주세요.
            </div>
          ) : (
            <p className="webcam-guide">
              상담 분석을 위해 웹캠을 사용합니다.
            </p>
          )}

          <div className={`webcam-view ${webcamError ? "error-border" : ""}`}>
            <video ref={webcamRef} autoPlay playsInline muted />
          </div>

          {!showStartButton && (
            <div className="analysis-status">
              {!faceDetected && "얼굴이 화면 중앙에 보이도록 맞춰 주세요."}
              {faceDetected && !isFacingFront && "정면을 바라봐 주세요."}
              {isFacingFront && `정면 인식 중... ${frontTime.toFixed(1)} / 3초`}
            </div>
          )}

          {showStartButton && (
            <div className="analysis-status">분석 준비가 완료되었습니다.</div>
          )}

          {showStartButton && (
            <div className="svideo-bottom">
              <button
                className="survey-btn global-video-start enabled"
                onClick={handleStart}
              >
                영상 시청
              </button>
            </div>
          )}
        </div>
      )}

      {started && currentVideo && (
        <>
          <div className="analysis-status">실시간 분석 중...</div>

          <div className="video-wrapper">
            <div className="video-container">
              {videoId && (
                <iframe
                  id="youtube-player"
                  src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`}
                  title="YouTube Player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            <h3>{currentVideo.title}</h3>
          </div>

          <div className="svideo-bottom">
            <button
              className={`survey-btn global-video-survey ${canGoSurvey ? "enabled" : ""}`}
              onClick={handleGoSurvey}
              disabled={!canGoSurvey || uploading}
            >
              {uploading ? "업로드 중..." : "설문하러 가기"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default SVideo;
