import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import '../../css/common_css/base.css';
import '../../css/counselor_css/cLogin.css';
import api from '../../services/app.js';
import { useDispatch } from 'react-redux';
import { clearVideos } from '../../redux/cVideos.js';

const CLogin = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [idError, setIdError] = useState('');
    const [pwError, setPwError] = useState('');

    const loginHandle = async (e) => {
        e.preventDefault();

        // 1. 빈 값 체크
        if (!id) {
            setIdError('아이디를 입력해주세요');
        } else {
            setIdError('');
        }
        if (!password) {
            setPwError('패스워드를 입력해주세요');
        } else {
            setPwError('');
        }

        if (!id || !password) return; // 하나라도 비어있으면 서버 요청 안 함

        try {
            // 2. FastAPI 서버로 로그인 요청 (POST)
            const response = await api.post("/counselor/login", {
                login_id: id,
                pw: password
            });

            // 3. 서버 응답 결과 처리
            const data = await response.data;

            if (data.success) {
                alert(data.message);

                // 🔥 반드시 추가
                localStorage.setItem("counselor_id", data.counselor_id);

                navigate("/counselor/scheduler");
            } else {
                alert(data.message);
                setId('');
                setPassword('');
            }
        } catch (error) {
            console.error("로그인 통신 에러:", error);
            alert("서버와 통신하는 데 문제가 발생했습니다.");
        }
    };

    useEffect(() => {
        sessionStorage.clear();
        localStorage.clear();
        dispatch(clearVideos());
        // api.get('client/session/clear'); => 세션 최기화 이미 다른 코드로도 충분해서 잠시 주석 처리.
    }, []);

    return (
        <div className='c-login-wrap'>
            <form className='c-login-form' onSubmit={loginHandle}>
                <h2>상담사 로그인</h2>
                <p>상담사 인증정보를 입력해주세요</p>
                <label htmlFor='cId'>아이디</label>
                <input type='text' id='cId' placeholder='아이디를 입력해주세요' value={id} onChange={(e) => setId(e.target.value)} />
                {idError && <p className='c-id-label'>{idError}</p>}
                <label htmlFor='cPassword'>패스워드</label>
                <input type='password' id='cPassword' placeholder='비밀번호를 입력해주세요' value={password} onChange={(e) => setPassword(e.target.value)} />
                {pwError && <p className='c-pw-label'>{pwError}</p>}
                <button type="submit">
                    접속하기</button>
            </form>
        </div>
    );
};

export default CLogin;