import { useState, useEffect, useRef } from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie
} from 'recharts';

import '../../../css/common_css/base.css';
import '../../../css/counselor_css/cFinal.css';
import { useLocation, useParams } from 'react-router-dom';
import api from '../../../services/app';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PIE_COLORS = ['#3243ff', '#ffa042', '#38ff3b'];
const RADIAN = Math.PI / 180;

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (!percent || percent < 0.05) return null;

    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="#ffffff"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight={700}
        >
            {`${Math.round(percent * 100)}%`}
        </text>
    );
};

const renderChartLegend = (items = []) => {
    if (!items.length) return null;

    return (
        <ul className="chart-legend-list">
            {items.map((item, index) => {
                return (
                    <li className="chart-legend-item" key={`${item.name}-${index}`}>
                        <span
                            className="chart-legend-swatch"
                            style={{ backgroundColor: item.fill || item.color }}
                        />
                        <span className="chart-legend-name" title={item.name}>
                            {item.name}
                        </span>
                        <span className="chart-legend-score">{Math.round(item.value)}점</span>
                        <span className="chart-legend-percent">{item.percentText}</span>
                    </li>
                );
            })}
        </ul>
    );
};

const CFinal = () => {
    const params = useParams();
    const clientId = Number(params.clientId);
    const counselingId = Number(params.counselingId);
    const location = useLocation();
    const studentName = location.state?.studentName || '학생';

    // PDF 관련 상태 및 Ref
    const aiPageRef = useRef(null);
    const counselorPageRef = useRef(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [isPdfRendering, setIsPdfRendering] = useState(false);

    // 상담 데이터 관련 상태
    const [focusData, setFocusData] = useState([]);
    const [interestData, setInterestData] = useState([]);
    const [tableData, setTableData] = useState([]);

    // 상담사 TEXT 리포트 부분
    const [personalityComment, setPersonalityComment] = useState('');
    const [careerComment, setCareerComment] = useState('');
    const [finalComment, setFinalComment] = useState('');

    // 읽기/편집 모드
    const [isEditingPersonality, setIsEditingPersonality] = useState(false);
    const [isEditingCareer, setIsEditingCareer] = useState(false);
    const [isEditingFinalComment, setIsEditingFinalComment] = useState(false);

    const [isComplete, setIsComplete] = useState(false);
    const [llmResult, setLlmResult] = useState(null);
    const [aiStatus, setAiStatus] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // 녹음 관련 상태
    const [recordState, setRecordState] = useState('idle');
    const [recordTime, setRecordTime] = useState(0);
    const timerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // PDF 정보(client 정보 + 선택한 카테고리 정보)
    const [clientInfo, setClientInfo] = useState({
        c_id: '',
        name: '',
        phone_num: '',
        email: '',
        birthdate: ''
    });

    const [reportCategory, setReportCategory] = useState([]);


    const formatBirthdate = (birthdate) => {
        if (!birthdate) return '-';

        if (typeof birthdate === 'string') {
            return birthdate.slice(0, 10);
        }

        try {
            return new Date(birthdate).toISOString().slice(0, 10);
        } catch {
            return '-';
        }
    };

    const formatCategory = (category) => {
        if (Array.isArray(category) && category.length > 0) {
            return category.map((item, index) => (
                // 한 줄로 나열하되, 각 항목 사이에 16px 정도의 여백(띄어쓰기)을 줍니다.
                <span key={index} style={{ marginRight: '16px' }}>
                    {index + 1}. {item}
                </span>
            ));
        }
        return category || '-';
    };

    const chartTotal = tableData.reduce((sum, item) => sum + (Number(item.final_score) || 0), 0);

    const chartData = tableData.map((item, index) => {
        const value = Number(item.final_score) || 0;
        const percent = chartTotal > 0 ? value / chartTotal : 0;

        return {
            name: item.category,
            value,
            percent,
            percentText: `${Math.round(percent * 100)}%`,
            fill: item.fill || PIE_COLORS[index % PIE_COLORS.length]
        };
    });

    // ---------------------------------------------------------
    // PDF 생성 및 미리보기 로직
    // ---------------------------------------------------------
    const buildPdf = async (action = 'download') => {
        const aiElement = aiPageRef.current;
        const counselorElement = counselorPageRef.current;

        if (!aiElement || !counselorElement) return;

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 10;
            const contentWidth = pageWidth - margin * 2;

            const captureOptions = {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                ignoreElements: (el) => el.getAttribute('data-html2canvas-ignore') === 'true'
            };

            const aiCanvas = await html2canvas(aiElement, captureOptions);
            const aiImgData = aiCanvas.toDataURL('image/png');
            const aiImgHeight = (aiCanvas.height * contentWidth) / aiCanvas.width;
            pdf.addImage(aiImgData, 'PNG', margin, margin, contentWidth, aiImgHeight);

            pdf.addPage();

            const counselorCanvas = await html2canvas(counselorElement, captureOptions);
            const counselorImgData = counselorCanvas.toDataURL('image/png');
            const counselorImgHeight = (counselorCanvas.height * contentWidth) / counselorCanvas.width;
            pdf.addImage(counselorImgData, 'PNG', margin, margin, contentWidth, counselorImgHeight);

            if (action === 'download') {
                pdf.save(`${studentName}_진로상담_리포트.pdf`);
            } else if (action === 'preview') {
                const blob = pdf.output('blob');
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
                setShowPreview(true);
            }
        } catch (error) {
            console.error('PDF 생성 실패:', error);
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    };

    const generatePDF = async (action = 'download') => {
        const prevEditing = {
            personality: isEditingPersonality,
            career: isEditingCareer,
            final: isEditingFinalComment
        };

        setIsEditingPersonality(false);
        setIsEditingCareer(false);
        setIsEditingFinalComment(false);
        setIsPdfRendering(true);

        setTimeout(async () => {
            await buildPdf(action);

            setIsPdfRendering(false);
            setIsEditingPersonality(prevEditing.personality);
            setIsEditingCareer(prevEditing.career);
            setIsEditingFinalComment(prevEditing.final);
        }, 100);
    };

    // ---------------------------------------------------------
    // 데이터 로딩 및 녹음 로직
    // ---------------------------------------------------------
    useEffect(() => {
        if (!counselingId) return;

        api.get(`/counselor/report/final/${counselingId}`)
            .then(res => res.data)
            .then(data => {
                if (data.success) {
                    setFocusData(data.focus || []);
                    setInterestData(data.interest || []);
                    setTableData(data.table || []);
                }
            })
            .catch(err => console.error('리포트 조회 실패', err));
    }, [counselingId]);

    useEffect(() => {
        if (!counselingId) return;

        api.get(`/counselor/ai-report/${counselingId}`)
            .then(res => res.data)
            .then(data => {
                if (data.success && data.data && data.data.ai_m_comment) {
                    setLlmResult(data.data.ai_m_comment);
                }
            })
            .catch(err => {
                console.error('LLM 결과 조회 실패', err);
            });
    }, [counselingId]);

    useEffect(() => {
        if (!counselingId) return;

        api.get(`/counselor/report/final/comment/${counselingId}`)
            .then(res => res.data)
            .then(data => {
                if (!data.success) return;

                setPersonalityComment(data.personality_comment ?? '');
                setCareerComment(data.career_comment ?? '');
                setFinalComment(data.final_comment ?? '');
                setIsComplete(data.complete === 'Y');
            })
            .catch(err => console.error('최종 리포트 조회 실패', err));
    }, [counselingId]);

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            clearInterval(timerRef.current);
        };
    }, []);

    // PDF에서 필요한 정보들 얻기
    useEffect(() => {
        if (!clientId || !counselingId) return;

        api.get('/counselor/report/pdf-info', {
            params: {
                clientId,
                counselingId
            }
        })
            .then(res => res.data)
            .then(data => {
                if (!data.success || !data.data) return;

                setClientInfo({
                    c_id: data.data.client?.c_id || '',
                    name: data.data.client?.name || '',
                    phone_num: data.data.client?.phone_num || '',
                    email: data.data.client?.email || '',
                    birthdate: data.data.client?.birthdate || ''
                });

                setReportCategory(
                    Array.isArray(data.data.category) ? data.data.category : []
                );
            })
            .catch(err => console.error('PDF 정보 조회 실패', err));
    }, [clientId, counselingId]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!counselingId) return alert('ID가 없습니다.');

        await api.post('/counselor/report/final/save', {
            counseling_id: counselingId,
            personality_comment: personalityComment,
            career_comment: careerComment,
            final_comment: finalComment
        });

        setIsEditingPersonality(false);
        setIsEditingCareer(false);
        setIsEditingFinalComment(false);

        alert('수정 저장되었습니다.');
    };

    const handleComplete = async (e) => {
        e.preventDefault();
        if (!counselingId) return alert('ID가 없습니다.');

        // ✅ 1. 사용자 확인
        const isConfirm = window.confirm(
            "최종 작성을 완료하시겠습니까?\n\n작성 완료 후에는 수정이 불가능하며,\n리포트는 조회 전용으로 전환됩니다."
        );

        if (!isConfirm) return; // ❗ 취소하면 종료

        try {
            await api.post('/counselor/report/final/complete', {
                counseling_id: counselingId,
                personality_comment: personalityComment,
                career_comment: careerComment,
                final_comment: finalComment
            });

            setIsEditingPersonality(false);
            setIsEditingCareer(false);
            setIsEditingFinalComment(false);
            setIsComplete(true);

            alert('최종 작성이 완료되었습니다.');
        } catch (err) {
            console.error('작성 완료 실패:', err);
            alert('작성 완료 중 오류가 발생했습니다.');
        }

        if (recordState === 'recording' || recordState === 'paused') {
            await stopRecording();
        }
    };

    const formatTime = (sec) => {
        const minutes = Math.floor(sec / 60).toString().padStart(2, '0');
        const seconds = (sec % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const startRecording = async () => {
        try {
            audioChunksRef.current = [];
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.start();
            setRecordState('recording');
            setRecordTime(0);
            timerRef.current = setInterval(() => setRecordTime(prev => prev + 1), 1000);
        } catch (err) {
            alert('오디오 권한이 필요합니다.');
        }
    };

    const stopRecording = async () => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.onstop = async () => {
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append('file', blob, 'record.webm');

                    setIsAnalyzing(true);
                    setAiStatus(null);
                    await api.post(`/counselor/report/con/${counselingId}/audio`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    pollAIStatus();
                    resolve();
                };

                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }

            setRecordState('idle');
            clearInterval(timerRef.current);
            setRecordTime(0);
        });
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && recordState === 'recording') {
            mediaRecorderRef.current.pause();
            setRecordState('paused');
            clearInterval(timerRef.current);
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && recordState === 'paused') {
            mediaRecorderRef.current.resume();
            setRecordState('recording');
            timerRef.current = setInterval(() => setRecordTime(prev => prev + 1), 1000);
        }
    };

    const pollAIStatus = () => {
        let retry = 0;
        const maxRetry = 30;

        const checkStatus = async () => {
            try {
                const res = await api.get(`/counselor/report/status/${counselingId}`);

                if (!res.data.success) return;

                const status = res.data.status;
                setAiStatus(status);

                if (status === 'COMPLETED') {
                    const result = await api.get(`/counselor/ai-report/${counselingId}`);

                    if (result.data.success && result.data.data.ai_m_comment) {
                        setLlmResult(result.data.data.ai_m_comment);
                    }

                    setIsAnalyzing(false);
                    return;
                }
            } catch (e) {
                console.error('status polling error', e);
            }

            retry++;

            if (retry < maxRetry && isAnalyzing) {
                setTimeout(checkStatus, 3000);
            } else {
                setIsAnalyzing(false);
            }
        };

        checkStatus();
    };

    return (
        <>
            {showPreview && (
                <div className="pdf-preview-modal">
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', width: '85%', height: '90%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0 }}>리포트 미리보기</h3>
                            <div>
                                <button className="btn-main" style={{ marginRight: '10px' }} onClick={() => generatePDF('download')}>
                                    다운로드
                                </button>
                                <button className="btn-sub" onClick={() => setShowPreview(false)}>
                                    닫기
                                </button>
                            </div>
                        </div>
                        <iframe src={pdfUrl} width="100%" height="100%" style={{ border: '1px solid #ddd' }} title="PDF Preview" />
                    </div>
                </div>
            )}

            {/* 💡 isComplete가 true일 때만 PDF 버튼 모음이 나타나도록 조건부 렌더링 추가! */}
            {isComplete && (
                <div className="pdf-action-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '15px' }}>
                    <button className="btn-sub" onClick={() => generatePDF('preview')}>
                        PDF 미리보기
                    </button>
                    <button className="btn-main" onClick={() => generatePDF('download')}>
                        PDF 다운로드
                    </button>
                </div>
            )}

            {/* 1페이지: AI 분석 */}
            <div ref={aiPageRef} className="pdf-export-container" style={{ padding: '20px', backgroundColor: '#fff' }}>

                <h2 className="student-info-title">{studentName}의 진로 상담 최종 리포트</h2>
                {isPdfRendering && (
                    <div className="pdf-info-box">
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>학생 기본 정보</h3>
                        <div><strong>학생번호:</strong> {clientInfo.c_id || '-'}</div>
                        <div><strong>전화번호:</strong> {clientInfo.phone_num || '-'}</div>
                        <div><strong>이메일:</strong> {clientInfo.email || '-'}</div>
                        <div><strong>생년월일:</strong> {formatBirthdate(clientInfo.birthdate)}</div>
                        <div style={{ gridColumn: '1 / -1', wordBreak: 'keep-all' }}>
                            <strong>선택 카테고리:</strong> {formatCategory(reportCategory)}
                        </div>
                    </div>
                )}
                <h3 className="section-title">AI 분석</h3>

                <div className="ai-overview-grid">
                    <section className="report-card ai-chart-card">
                        <h3>❶ 분야별 관심 비교 그래프</h3>
                        {chartData.length > 0 ? (
                            <div className="chart-box">
                                <div className="chart-layout">
                                    <div className="chart-canvas">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={48}
                                                    outerRadius={128}
                                                    dataKey="value"
                                                    paddingAngle={2}
                                                    label={renderPieLabel}
                                                    labelLine={false}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="chart-legend-panel">
                                        {renderChartLegend(chartData)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="chart-empty">⚠ 분석 데이터가 없습니다.</div>
                        )}
                    </section>

                    <section className="report-card ai-table-card">
                        <h3>분야별 비교</h3>
                        <div className="summary-box" style={{ padding: '0' }}>
                            <table className="report-table">
                                <thead>
                                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                                        <th className="report-table-header">구분</th>
                                        <th className="report-table-header">집중도</th>
                                        <th className="report-table-header">흥미도</th>
                                        <th className="report-table-header">설문</th>
                                        <th className="report-table-header final-score">최종점수</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.length > 0 ? (
                                        tableData.map((video, index) => (
                                            <tr key={video.video_id || index} style={{ textAlign: 'center' }}>
                                                <td className="report-table-cell">
                                                    {video.category?.replace(' 직업', '')}
                                                </td>
                                                <td className="report-table-cell">
                                                    {video.attention_score != null ? Math.round(video.attention_score) : '-'}
                                                </td>
                                                <td className="report-table-cell">
                                                    {video.emotion_score != null ? Math.round(video.emotion_score) : '-'}
                                                </td>
                                                <td className="report-table-cell">
                                                    {video.survey_score != null ? Math.round(video.survey_score) : '-'}
                                                </td>
                                                <td className="report-table-cell final-score-value">
                                                    {video.final_score != null ? Math.round(video.final_score) : '-'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                                분석 데이터가 없습니다
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <div className="ai-insight-grid">
                    <section className="report-card">
                        <h3>❷ 학생 성향 분석</h3>
                        {isAnalyzing && !llmResult ? (
                            <div className="chart-empty ai-loading">
                                <div className="ai-spinner"></div>
                                {aiStatus === 'STT_PROCESSING' && '음성을 텍스트로 변환 중입니다...'}
                                {aiStatus === 'LLM_PROCESSING' && 'AI가 상담 내용을 분석 중입니다...'}
                                {!aiStatus && 'AI 상담 분석을 준비 중입니다...'}
                            </div>
                        ) : llmResult ? (
                            <div className="summary-box">{llmResult?.summary}</div>
                        ) : (
                            <div className="chart-empty">상담이 완료된 후 자동으로 생성됩니다.</div>
                        )}
                    </section>

                    <section className="report-card">
                        <h3>❸ 추천 진로 TOP5</h3>
                        {llmResult ? (
                            <div className="analysis-text">
                                {(llmResult?.analysis?.career_recommendation || []).map((item, index) => (
                                    <div key={index}>{item.trim()}</div>
                                ))}
                            </div>
                        ) : (
                            <div className="chart-empty">상담이 완료된 후 자동으로 생성됩니다.</div>
                        )}
                    </section>
                </div>
            </div>

            {/* 2페이지: 상담사 분석 */}
            <div ref={counselorPageRef} className="pdf-export-container" style={{ padding: '20px', backgroundColor: '#fff', marginTop: '20px' }}>
                <h3 className="section-title">상담사 분석</h3>

                <div className="report-top-grid-2">
                    <section className="report-card">
                        <h3>학생 성향 분석 요약</h3>

                        {isEditingPersonality && !isComplete ? (
                            <textarea
                                className="analysis-textarea report-textarea-common"
                                placeholder="학생 성향에 대한 상담사의 분석을 작성해주세요."
                                value={personalityComment}
                                onChange={(e) => setPersonalityComment(e.target.value)}
                                onBlur={() => setIsEditingPersonality(false)}
                                autoFocus
                            />
                        ) : (
                            <div
                                className={`report-text-display report-text-view ${isComplete ? 'completed' : ''}`}
                                onClick={() => {
                                    if (!isComplete) setIsEditingPersonality(true);
                                }}
                            >
                                <pre>{personalityComment || '학생 성향에 대한 상담사의 분석을 작성해주세요.'}</pre>
                            </div>
                        )}
                    </section>

                    <section className="report-card">
                        <h3>추천 진로 분석 요약</h3>

                        {isEditingCareer && !isComplete ? (
                            <textarea
                                className="analysis-textarea report-textarea-common"
                                placeholder="추천 진로에 대한 상담사의 의견을 작성해주세요."
                                value={careerComment}
                                onChange={(e) => setCareerComment(e.target.value)}
                                onBlur={() => setIsEditingCareer(false)}
                                autoFocus
                            />
                        ) : (
                            <div
                                className={`report-text-display report-text-view report-text-view-large ${isComplete ? 'completed' : ''}`}
                                onClick={() => {
                                    if (!isComplete) setIsEditingCareer(true);
                                }}
                            >
                                <pre>{careerComment || '추천 진로에 대한 상담사의 의견을 작성해주세요.'}</pre>
                            </div>
                        )}
                    </section>
                </div>

                <section className="report-card full-width">
                    <div className="report-content-box">
                        <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>상담 기록 및 종합 리포트</p>

                            {!isComplete && (
                                <div className="record-control" data-html2canvas-ignore="true">

                                    {recordState === 'idle' && (
                                        <button className="btn-record" onClick={startRecording}>
                                            🎤 녹음 시작
                                        </button>
                                    )}

                                    {recordState === 'recording' && (
                                        <div className="record-box">
                                            <span className="rec-text">
                                                녹음중 <span className="rec-dot">●</span> {formatTime(recordTime)}
                                            </span>
                                            <button className="btn-record small" onClick={pauseRecording}>
                                                중지
                                            </button>
                                        </div>
                                    )}

                                    {recordState === 'paused' && (
                                        <div className="record-box">
                                            <span>일시정지 {formatTime(recordTime)}</span>
                                            <button className="btn-record small" onClick={resumeRecording}>
                                                재시작
                                            </button>
                                            <button className="btn-record small" onClick={stopRecording}>
                                                종료
                                            </button>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>

                        <div className="final-report-content">
                            {isEditingFinalComment && !isComplete ? (
                                <textarea
                                    id="finalComment"
                                    className="report-textarea-common report-textarea-large"
                                    placeholder="학생과의 상담 내용을 입력해주세요."
                                    value={finalComment}
                                    onChange={(e) => setFinalComment(e.target.value)}
                                    onBlur={() => setIsEditingFinalComment(false)}
                                    autoFocus
                                />
                            ) : (
                                <div
                                    className={`report-text-display report-text-view ${isComplete ? 'completed' : ''}`}
                                    onClick={() => {
                                        if (!isComplete) setIsEditingFinalComment(true);
                                    }}
                                >
                                    <pre>{finalComment || '학생과의 상담 내용을 입력해주세요.'}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {!isComplete && (
                <div className="report-buttons" data-html2canvas-ignore="true">
                    <button type="button" className="btn-sub" onClick={handleSave}>수정 저장</button>
                    <button type="button" className="btn-main" onClick={handleComplete}>최종 작성 완료</button>
                </div>
            )}
        </>
    );
};

export default CFinal;

