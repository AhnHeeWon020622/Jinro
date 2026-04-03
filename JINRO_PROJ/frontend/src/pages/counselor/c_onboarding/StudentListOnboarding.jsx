import { useState,useEffect } from "react";
import "../../../css/counselor_css/onboarding/onboarding.css";

function StudentListOnboarding({ onClose, modalOpen }) {

  const [step,setStep]=useState(1);
  const [rect,setRect]=useState(null);

  const config={
    1:{target:".student-search",title:"학생 검색",text:"이름으로 학생을 검색할 수 있습니다."},
    2:{title:"학생 선택",text:"학생을 클릭하면 상담 기록을 확인할 수 있습니다."},
    3:{title:"상담 기록",text:"상담 기록 클릭시 최종리포트로 이동합니다."}
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
      if(step===1){
        const el=document.querySelector(config[1].target);
        if(!el){ frame=requestAnimationFrame(update); return;}
        setRect(el.getBoundingClientRect());
        return;
      }
      if(step===2){
        const card=document.querySelector(".student-card");
        if(card){ setRect(card.getBoundingClientRect()); return;}
        const list=document.querySelector(".student-list");
        if(list){
          const l=list.getBoundingClientRect();
          setRect({top:l.top+20,left:l.left+20,width:1200,height:110});
          return;
        }
        frame=requestAnimationFrame(update);
        return;
      }
      setRect(null);
    };
    frame=requestAnimationFrame(update);
    return ()=>cancelAnimationFrame(frame);
  },[step,modalOpen]);

  const next=()=>{
    if(step===1){ setStep(2); return;}
    if(step===2){
      document.querySelector(".student-card")?.click();
      setTimeout(()=>setStep(3),500);
      return;
    }
    onClose();
  };

  useEffect(()=>{
    const handler=(e)=>{
      if(["Enter"," ","Spacebar","ArrowRight"].includes(e.key)){ e.preventDefault(); next();}
      if(e.key==="ArrowLeft"){ if(step===2)setStep(1); if(step===3)setStep(2);}
      if(e.key==="Escape") onClose();
    };
    window.addEventListener("keydown",handler);
    return ()=>window.removeEventListener("keydown",handler);
  },[step]);

  return(
    <div className="onboard-layer">

      {rect && step!==3 && (
        <div className="onboard-spot"
          style={{
            top:rect.top-12,
            left:rect.left-12,
            width:rect.width+24,
            height:rect.height+24
          }}
        />
      )}

      {step===1 && rect && (
        <div className="onboard-guide"
          style={{ top:rect.bottom+40,left:"76%",transform:"translateX(-50%)" }}>
          <div className="onboard-title">{config[1].title}</div>
          <div className="onboard-desc">{config[1].text}</div>
          <button className="onboard-btn" onClick={next}>다음</button>
        </div>
      )}

      {step===2 && rect && (
        <div className="onboard-guide"
          style={{ top:rect.top+rect.height/2+120,left:rect.right-724 }}>
          <div className="onboard-title">{config[2].title}</div>
          <div className="onboard-desc">{config[2].text}</div>
          <button className="onboard-btn" onClick={next}>다음</button>
        </div>
      )}

      {step===3 && (
        <div className="onboard-guide"
          style={{ position:"fixed",top:"54%",left:"54%",transform:"translate(-50%,-50%)" }}>
          <div className="onboard-title">{config[3].title}</div>
          <div className="onboard-desc">{config[3].text}</div>
          <button className="onboard-btn" onClick={next}>시작하기</button>
        </div>
      )}

    </div>
  );
}

export default StudentListOnboarding;