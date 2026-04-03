import { useState, useEffect } from "react";

import "../../../css/counselor_css/onboarding/onboarding.css";


function CategoryOnboarding({
  onClose,
  selectedBigId,
  selectedMidId,
  setSelectedBigId,
  setSelectedMidId,
}) {

  const [step,setStep] = useState(1);
  const [rect,setRect] = useState(null);

  const phase =
    selectedBigId == null
      ? "big"
      : selectedMidId == null
      ? "mid"
      : "small";

  const config = {
    big:{ target:".category-grid", title:"대분류 선택", text:"상담할 직무 분야를 먼저 선택합니다."},
    mid:{ target:".mid-grid", title:"중분류 선택", text:"보다 구체적인 직무 영역을 선택합니다."},
    small1:{ target:".list-container", title:"상세 항목", text:"등록된 상담 콘텐츠를 확인할 수 있습니다."},
    small2:{ target:".add-btn", title:"콘텐츠 추가", text:"새 상담 콘텐츠를 등록할 수 있습니다."}
  };

  useEffect(()=>{
    const scrollY = window.scrollY;
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
    const handler = (e)=>{
      if(["Enter"," ","Spacebar","ArrowRight"].includes(e.key)){
        e.preventDefault(); next();
      }
      if(e.key==="ArrowLeft"){
        e.preventDefault();
        if(phase==="small" && step===2) setStep(1);
      }
      if(e.key==="Escape"){
        e.preventDefault();
        setSelectedBigId(null);
        setSelectedMidId(null);
        onClose();
      }
    };
    window.addEventListener("keydown",handler);
    return ()=>window.removeEventListener("keydown",handler);
  },[phase,step]);

  useEffect(()=>{
    const update = ()=>{
      let key;
      if(phase==="big") key="big";
      else if(phase==="mid") key="mid";
      else key = step===1 ? "small1" : "small2";

      const el = document.querySelector(config[key].target);
      if(!el) return;
      const r = el.getBoundingClientRect();
      setRect(r);
    };
    const t=setTimeout(update,120);
    window.addEventListener("resize",update);
    window.addEventListener("scroll",update,true);
    return ()=>{
      clearTimeout(t);
      window.removeEventListener("resize",update);
      window.removeEventListener("scroll",update,true);
    };
  },[phase,step]);

  const next = ()=>{
    if(phase==="big"){ setSelectedBigId(1); return;}
    if(phase==="mid"){ setSelectedMidId(101); return;}
    if(step===1){ setStep(2); return;}
    setSelectedBigId(null);
    setSelectedMidId(null);
    onClose();
  };

  if(!rect) return null;

  let key;
  if(phase==="big") key="big";
  else if(phase==="mid") key="mid";
  else key = step===1 ? "small1" : "small2";

  const guideStyleMap={
    big:{ top:"60%", left:"56%", transform:"translate(-50%,-50%)"},
    mid:{ top:"60%", left:"56%", transform:"translate(-50%,-50%)"},
    small1:{ top:rect.bottom+70, left:"56%", transform:"translateX(-50%)"},
    small2:{ top:rect.top-160, left:rect.right-420}
  };

  const bodyOffset=Math.abs(parseInt(document.body.style.top||"0"));
  const pad=phase==="small" && step===1 ? 25 : 10;
  const smallDown=phase==="small" && step===1 ? 30 : 0;

  return(
    <div className="onboard-layer">
      <div
        className="onboard-spot"
        style={{
          top:rect.top+bodyOffset-pad+smallDown,
          left:rect.left-pad,
          width:rect.width+pad*2,
          height:rect.height+pad*2
        }}
      />
      <div className="onboard-guide" style={guideStyleMap[key]}>
        <div className="onboard-title">{config[key].title}</div>
        <div className="onboard-desc">{config[key].text}</div>
        <button className="onboard-btn" onClick={next}>
          {phase==="small" && step===2 ? "시작하기" : "다음"}
        </button>
      </div>
    </div>
  );
}

export default CategoryOnboarding;