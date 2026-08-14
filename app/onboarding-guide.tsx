"use client";

import { useEffect, useState } from "react";

const steps=[
  {eyebrow:"WELCOME",title:"GS E&R 대관 모니터링에 오신 것을 환영합니다",description:"주요 대관 행사부터 기후에너지환경부와 국회의 정책 동향, 에너지·전력 분야의 최신 뉴스까지 한곳에서 확인할 수 있습니다. 필요한 정보를 더 빠르게 찾고 업무에 바로 활용해 보세요."},
  {eyebrow:"01 · SCHEDULE",title:"주요 일정을 빠르게 확인하세요",description:"주요 대관 일정에서는 이번 주와 다음 주의 평일 행사를 달력으로 확인합니다. 행사명을 누르면 원문으로 이동하고, 필요한 일정은 체크해 한꺼번에 활용할 수 있습니다."},
  {eyebrow:"02 · SAVE & SHARE",title:"일정을 저장하고 공유하세요",description:"행사를 선택한 뒤 목록 복사, 표 다운로드, Excel·PDF 출력, 이메일 보고문 기능을 이용하세요. 원문 링크도 개별적으로 바로 복사할 수 있습니다."},
  {eyebrow:"03 · NEWS",title:"최신 정책과 뉴스를 모니터링하세요",description:"기후에너지환경부와 국회 위원회의 최신 자료를 확인하고, 뉴스 화면에서는 주요 에너지·전력 매체의 기사를 한곳에서 검색할 수 있습니다. 제목을 누르면 해당 원문으로 이동합니다."},
  {eyebrow:"04 · UPDATE",title:"항상 최신 정보로 확인하세요",description:"행사·정부·위원회 자료는 매일 오전 9시, 뉴스는 3시간마다 자동 갱신됩니다. 바로 확인해야 할 때는 각 화면의 업데이트 버튼을 이용하세요."},
];

export default function OnboardingGuide(){
  const[open,setOpen]=useState(false);const[step,setStep]=useState(0);
  useEffect(()=>{try{if(!localStorage.getItem("agenda_onboarding_seen"))setOpen(true);}catch{setOpen(true);}},[]);
  const finish=()=>{try{localStorage.setItem("agenda_onboarding_seen","1");}catch{}setOpen(false);setStep(0);};
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")finish();};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);});
  const current=steps[step];
  return <>
    <button className="onboarding-help" type="button" onClick={()=>{setStep(0);setOpen(true)}}><span>?</span> 처음 사용하시나요?</button>
    {open&&<div className="onboarding-layer" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)finish()}}>
      <section className="onboarding-modal onboarding-modal-simple" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <button className="onboarding-close" type="button" onClick={finish} aria-label="안내 닫기">×</button>
        <header><img src="/gs-enr-logo.png" alt="GS E&R"/><div><span>30초 이용 안내</span><strong>{step+1} / {steps.length}</strong></div></header>
        <div className="onboarding-progress">{steps.map((_,index)=><i className={index<=step?"active":""} key={index}/>)}</div>
        <article><span>{current.eyebrow}</span><h2 id="onboarding-title">{current.title}</h2><p>{current.description}</p></article>
        <footer><button className="onboarding-skip" type="button" onClick={finish}>건너뛰기</button><div>{step>0&&<button type="button" onClick={()=>setStep(value=>value-1)}>이전</button>}<button className="onboarding-next" type="button" onClick={()=>step===steps.length-1?finish():setStep(value=>value+1)}>{step===steps.length-1?"시작하기":"다음"}</button></div></footer>
      </section>
    </div>}
  </>;
}
