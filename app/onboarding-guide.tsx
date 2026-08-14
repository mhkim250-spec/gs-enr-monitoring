"use client";

import { useEffect, useState } from "react";

const interests=["전력시장·SMP·REC","LNG·집단에너지","탄소중립·배출권·NDC","신재생·풍력·PPA","전력망·계통·분산에너지","국회·입법예고","산업안전·환경"];
const steps=[
  {eyebrow:"01 · PERSONALIZE",title:"관심 의제를 선택하세요",description:"자주 확인하는 의제를 선택해 두면 앞으로 맞춤 일정과 뉴스 기능을 확장할 때 이 설정을 기준으로 활용할 수 있습니다.",kind:"interests"},
  {eyebrow:"02 · SCHEDULE",title:"주요 일정을 빠르게 확인하세요",description:"주요 대관 일정에서는 이번 주와 다음 주의 평일 행사를 달력으로 확인합니다. 행사명을 누르면 원문으로 이동하고, 필요한 일정은 체크해 한꺼번에 활용할 수 있습니다.",kind:"schedule"},
  {eyebrow:"03 · SAVE & SHARE",title:"일정을 저장하고 공유하세요",description:"행사를 선택한 뒤 목록 복사, 표 다운로드, Excel·PDF 출력, 이메일 보고문 기능을 이용하세요. 원문 링크도 개별적으로 바로 복사할 수 있습니다.",kind:"share"},
  {eyebrow:"04 · NEWS",title:"에너지 뉴스를 모니터링하세요",description:"뉴스 화면에서 주요 에너지·전력 매체의 최신 기사를 한곳에서 검색할 수 있습니다. 기사 제목을 누르면 해당 언론사의 원문으로 이동합니다.",kind:"news"},
  {eyebrow:"05 · UPDATE",title:"최신 정보와 갱신 상태를 확인하세요",description:"행사·정부·위원회 자료는 매일 오전 9시, 뉴스는 3시간마다 자동 갱신됩니다. 급히 확인할 때는 각 화면의 업데이트 버튼을 이용하세요.",kind:"alert"},
];

export default function OnboardingGuide(){
  const[open,setOpen]=useState(false);const[step,setStep]=useState(0);const[selected,setSelected]=useState<string[]>([]);
  useEffect(()=>{try{setSelected(JSON.parse(localStorage.getItem("agenda_interests")||"[]"));if(!localStorage.getItem("agenda_onboarding_seen"))setOpen(true);}catch{setOpen(true);}},[]);
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")finish();};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);});
  const finish=()=>{localStorage.setItem("agenda_onboarding_seen","1");localStorage.setItem("agenda_interests",JSON.stringify(selected));setOpen(false);setStep(0);};
  const toggle=(interest:string)=>setSelected(current=>current.includes(interest)?current.filter(item=>item!==interest):[...current,interest]);
  const current=steps[step];
  return <>
    <button className="onboarding-help" type="button" onClick={()=>{setStep(0);setOpen(true)}}><span>?</span> 처음 사용하시나요?</button>
    {open&&<div className="onboarding-layer" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)finish()}}>
      <section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <button className="onboarding-close" type="button" onClick={finish} aria-label="안내 닫기">×</button>
        <header><img src="/gs-enr-logo.png" alt="GS E&R"/><div><span>30초 이용 안내</span><strong>{step+1} / {steps.length}</strong></div></header>
        <div className="onboarding-progress">{steps.map((_,index)=><i className={index<=step?"active":""} key={index}/>)}</div>
        <article><span>{current.eyebrow}</span><h2 id="onboarding-title">{current.title}</h2><p>{current.description}</p>
          {current.kind==="interests"&&<div className="onboarding-interests">{interests.map(interest=><button className={selected.includes(interest)?"selected":""} type="button" onClick={()=>toggle(interest)} key={interest}>{selected.includes(interest)?"✓ ":""}{interest}</button>)}</div>}
          {current.kind!=="interests"&&<div className={`onboarding-preview ${current.kind}`} aria-hidden="true"><i/><i/><i/><span>{current.kind==="schedule"?"이번 주 · 다음 주":current.kind==="share"?"복사 · Excel · PDF":current.kind==="news"?"News Monitoring":"자동 갱신 · 수동 업데이트"}</span></div>}
        </article>
        <footer><button className="onboarding-skip" type="button" onClick={finish}>건너뛰기</button><div>{step>0&&<button type="button" onClick={()=>setStep(value=>value-1)}>이전</button>}<button className="onboarding-next" type="button" onClick={()=>step===steps.length-1?finish():setStep(value=>value+1)}>{step===steps.length-1?"시작하기":"다음"}</button></div></footer>
      </section>
    </div>}
  </>;
}
