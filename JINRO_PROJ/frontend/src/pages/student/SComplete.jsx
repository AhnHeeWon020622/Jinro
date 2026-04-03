import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/app.js';
import styles from '../../css/student_css/SComplete.module.css';

function SComplete() {
    const navigate = useNavigate();
    const [counselingVal, setCounselingVal] = useState(null);
    
    // ⭐ 1. 중복 호출 방지용 깃발 (컴포넌트가 두 번 렌더링되어도 값 유지)
    const isAnalysisTriggered = useRef(false);

    const checkIsOnboarding = () => {
        return localStorage.getItem("skip_all_onboarding") === "true" || 
               document.body.classList.contains("onboarding-lock");
    };

    useEffect(() => {
        if (checkIsOnboarding()) {
            console.log("온보딩 진행 중: AI 분석 요청 및 카메라 제어 중지");
            return; 
        }

        const triggerAIAnalysis = async () => {
            // ⭐ 2. 이미 요청이 시작되었다면 함수 즉시 종료
            if (isAnalysisTriggered.current) {
                console.log("이미 분석 요청이 진행 중입니다. 중복 호출을 차단합니다.");
                return;
            }
            
            // ⭐ 3. 통과하자마자 깃발을 올려서 다음 요청 차단
            isAnalysisTriggered.current = true;

            try {
                const counselingId = localStorage.getItem("counselingId");
                const clientId = localStorage.getItem("client_id");

                setCounselingVal(counselingId);

                if (!counselingId || !clientId) {
                    console.error("상담 ID 또는 학생 ID를 찾을 수 없습니다.");
                    isAnalysisTriggered.current = false; // 에러 시 다시 시도할 수 있게 깃발 내림
                    return;
                }

                const response = await api.post('/client/complete/video', {
                    counseling_id: counselingId,
                    client_id: clientId
                });

                console.log("빽단에 분석 백그라운드 요청 완료:", response.data);

                // ⭐ 4. 요청이 성공적으로 들어간 후에 스토리지 정리
                localStorage.removeItem("counselingId");
                localStorage.removeItem("reportIds");
                localStorage.removeItem("videoStarted");
                
            } catch (error) {
                console.error("분석 요청 실패:", error);
                isAnalysisTriggered.current = false; // 실패 시 다시 시도할 수 있게 깃발 내림
            }
        };

        triggerAIAnalysis();

        const stopCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                stream.getTracks().forEach(track => track.stop());
            } catch (err) {
                console.log("카메라 종료:", err);
            }
        };
        stopCamera();
    }, []);

    const handleGoHome = (e) => {
        // 온보딩 중일 때 홈 버튼 클릭 막기 (필요시 주석 해제)
        /*
        if (checkIsOnboarding()) {
            e.preventDefault();
            return;
        }
        */
        
        localStorage.setItem("visited", "yes");
        navigate('/');
    };

    return (
        <main className={`${styles.container} global-complete-card`}>
            <div className={styles.iconWrapper}><div className={styles.checkIcon}></div></div>
            <h1 className={styles.title}>모든 상담이 완료되었습니다!</h1>
            <p className={styles.description}>
                오늘 참여해주신 소중한 상담 데이터 분석이 끝났습니다.<br />
                <span className={styles.highlight}>이제 당신의 마음 리포트를 확인해 보세요.</span>
            </p>
            <button className={`${styles.homeButton} global-complete-home`} onClick={handleGoHome}>
                홈으로 돌아가기
            </button>
        </main>
    );
}

export default SComplete;