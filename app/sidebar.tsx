"use client";

import { useState } from "react";
import OnboardingGuide from "./onboarding-guide";

type SidebarProps={active?:string};
type IconName="calendar"|"events"|"ministry"|"committee"|"news";
const items:{key:string;icon:IconName;label:string;href:string}[]=[
  {key:"summary",icon:"calendar",label:"주요 대관 일정",href:"/"},
  {key:"events",icon:"events",label:"주요 행사",href:"/events"},
  {key:"mcee",icon:"ministry",label:"기후부",href:"/mcee"},
  {key:"envcommittee",icon:"committee",label:"기후노동위",href:"/environment-committee"},
  {key:"news",icon:"news",label:"뉴스",href:"/news"},
];

function MenuIcon({name}:{name:IconName}) {
  const paths={
    calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h2M14 14h2M8 18h2"/></>,
    events:<><path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    ministry:<><path d="M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M3 21h18M12 3l9 5H3l9-5Z"/></>,
    committee:<><path d="M12 3 4 7v5c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V7l-8-4Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    news:<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h6M7 12h10M7 16h10M16 8h1"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Sidebar({active}:SidebarProps){
  const[open,setOpen]=useState(false);
  return <>
    <button className="mobile-menu-button" type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-label="메뉴 열기"><i/><i/><i/></button>
    {open&&<button className="sidebar-scrim" type="button" aria-label="메뉴 닫기" onClick={()=>setOpen(false)}/>}
    <aside className={`app-sidebar ${open?"mobile-open":""}`} aria-label="업무 메뉴">
      <a className="sidebar-brand" href="/"><img src="/gs-enr-logo.png" alt="GS E&R"/><span>행사 모니터링</span></a>
      <nav>{items.map(item=><a className={`${active===item.key?"active":""} nav-${item.key}`} href={item.href} key={item.key}><i><MenuIcon name={item.icon}/></i><span>{item.label}</span></a>)}</nav>
      <OnboardingGuide/>
      <div className="sidebar-status"><i/>3시간마다 서버 갱신</div>
    </aside>
  </>;
}
