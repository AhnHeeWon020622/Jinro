import { useEffect,useState } from "react";

import "../../../css/counselor_css/onboarding/onboarding.css";

function InfoEditOnboarding({ onClose }) {

  const [step,setStep]=useState(1);
  const [rect,setRect]=useState(null);

  const config={
    1:{target:".cinfoedit-form input[name='name']",title:"이름 수정",text:"상담사 이름을 수정할 수 있습니다."},
    2:{target:".cinfoedit-form input[name='phone']",title:"전화번호",text:"연락 가능한 전화번호를 입력하세요."},
    3:{target:".cinfoedit-form input[name='email']",title:"이메일",text:"리포트 및 알림 수신 이메일입니다."},
    4:{target:".save-btn",title:"저장",text:"입력한 정보를 저장합니다."}
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
    let frame;
    const update=()=>{
      const el=document.querySelector(config[step].target);
      if(!el){ frame=requestAnimationFrame(update); return;}
      const r=el.getBoundingClientRect();
      if(!r.width){ frame=requestAnimationFrame(update); return;}
      setRect(r);
    };
    frame=requestAnimationFrame(update);
    window.addEventListener("resize",update);
    return ()=>{
      cancelAnimationFrame(frame);
      window.removeEventListener("resize",update);
    };
  },[step]);

  useEffect(()=>{
    const handler=(e)=>{
      if(["Enter"," ","Spacebar","ArrowRight"].includes(e.key)){
        e.preventDefault(); next();
      }
      if(e.key==="ArrowLeft"){ if(step>1)setStep(step-1);}
      if(e.key==="Escape") onClose();
    };
    window.addEventListener("keydown",handler);
    return ()=>window.removeEventListener("keydown",handler);
  },[step]);

  const next=()=>{ step===4 ? onClose() : setStep(step+1); };

  if(!rect) return null;

  return(
    <div className="onboard-layer">
      <div className="onboard-spot"
        style={{
          top:rect.top-12,
          left:rect.left-12,
          width:rect.width+24,
          height:rect.height+24
        }}
      />
      <div className="onboard-guide"
        style={{
          top:rect.bottom+40,
          left:rect.left+rect.width/2,
          transform:"translateX(-50%)"
        }}
      >
        <div className="onboard-title">{config[step].title}</div>
        <div className="onboard-desc">{config[step].text}</div>
        <button className="onboard-btn" onClick={next}>
          {step===4 ? "시작하기" : "다음"}
        </button>
      </div>
    </div>
  );
}

export default InfoEditOnboarding;