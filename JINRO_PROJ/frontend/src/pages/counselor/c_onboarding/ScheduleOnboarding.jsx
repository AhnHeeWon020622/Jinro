import { useState,useEffect } from "react";
import "../../../css/counselor_css/onboarding/onboarding.css";

function SchedulerOnboarding({ onClose }) {

  const [step,setStep]=useState(1);
  const [rect,setRect]=useState(null);

  const config={
    1:{target:".calendar-section",title:"상담 캘린더",text:"날짜를 클릭하면 해당 날짜 일정이 표시됩니다."},
    2:{target:".add-btn",title:"일정 추가",text:"학생을 선택하여 상담 일정을 등록합니다."},
    3:{target:".empty-box",title:"일정 상태",text:"상담 리스트 클릭시 최종 리포트로 이동합니다."}
  };

  useEffect(()=>{
    const scrollY=window.scrollY;
    document.body.style.position="fixed";
    document.body.style.top=`-${scrollY}px`;
    document.body.style.width="100%";
    return ()=>{
      document.body.style.position="";
      document.body.style.top="";
      document.body.style.width="";
      window.scrollTo(0,scrollY);
    };
  },[]);

  useEffect(()=>{
    const key=(e)=>{
      if(e.key==="Enter"||e.key===" "){ e.preventDefault(); next();}
    };
    window.addEventListener("keydown",key);
    return ()=>window.removeEventListener("keydown",key);
  },[step]);

  useEffect(()=>{
    const update=()=>{
      const el=document.querySelector(config[step].target);
      if(!el){ if(step===3) onClose(); return;}
      setRect(el.getBoundingClientRect());
    };
    const t=setTimeout(update,120);
    window.addEventListener("resize",update);
    window.addEventListener("scroll",update,true);
    return ()=>{
      clearTimeout(t);
      window.removeEventListener("resize",update);
      window.removeEventListener("scroll",update,true);
    };
  },[step]);

  const next=()=> step===3 ? onClose() : setStep(s=>s+1);

  if(!rect) return null;

  return(
    <div className="onboard-layer">
      <div className="onboard-spot"
        style={{
          top:rect.top-8,
          left:rect.left-8,
          width:rect.width+16,
          height:rect.height+16
        }}
      />

      {step===1 && (
        <div className="onboard-guide"
          style={{ top:rect.bottom-400,left:"65%",transform:"translateX(-50%)" }}>
          <div className="onboard-title">{config[1].title}</div>
          <div className="onboard-desc">{config[1].text}</div>
          <button className="onboard-btn" onClick={next}>다음</button>
        </div>
      )}

      {step===2 && (
        <div className="onboard-guide"
          style={{ top:rect.bottom+20,left:rect.right-320 }}>
          <div className="onboard-title">{config[2].title}</div>
          <div className="onboard-desc">{config[2].text}</div>
          <button className="onboard-btn" onClick={next}>다음</button>
        </div>
      )}

      {step===3 && (
        <div className="onboard-guide"
          style={{ position:"fixed",top:"50%",left:"38%",transform:"translate(-50%,-50%)" }}>
          <div className="onboard-title">{config[3].title}</div>
          <div className="onboard-desc">{config[3].text}</div>
          <button className="onboard-btn" onClick={next}>확인</button>
        </div>
      )}

    </div>
  );
}

export default SchedulerOnboarding;