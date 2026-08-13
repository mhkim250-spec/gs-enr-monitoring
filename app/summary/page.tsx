"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../sidebar";
import { classifyText } from "../intelligence";

type AssemblyEvent = { id:string; title:string; date:string; detailUrl:string; posterUrl:string; host?:string; location?:string };
type SimpleEvent = { id:string; title:string; date:string; detailUrl:string };
type ClimateEvent = { id:string; title:string; date:string; detailUrl:string };
type CommitteeSchedule = { id:string; title:string; date:string; previewUrl:string; downloadUrl:string };
type UnifiedEvent = { id:string; source:string; date:string; title:string; url:string; posterUrl?:string; host:string; location:string; topics:string[]; score:number; importance:string };
type SourceStatus = { source:string; updated_at?:number; updatedAt?:number; status:string };
type Weather = { temperature:number; weatherCode:number; locationLabel:string };

function weatherLabel(code:number) {
  if(code===0)return "맑음";
  if(code<=3)return "구름 조금";
  if(code<=67)return "비";
  if(code<=77)return "눈";
  return "흐림";
}

function weatherIcon(code:number) {
  if(code===0)return "☀️";
  if(code<=3)return "⛅";
  if(code<=48)return "🌫️";
  if(code<=67)return "🌧️";
  if(code<=77)return "🌨️";
  if(code<=82)return "🌦️";
  if(code<=86)return "❄️";
  return "⛈️";
}

function isCurrentOrFuture(dateText:string) {
  const matches=[...dateText.matchAll(/(?:^|\D)(20\d{2}|\d{2})\s*(?:년|[.\/-])\s*(\d{1,2})\s*(?:월|[.\/-])\s*(\d{1,2})/g)];
  if (!matches.length) return true;
  const last=matches[matches.length-1];
  const year=Number(last[1])<100 ? 2000+Number(last[1]) : Number(last[1]);
  const end=new Date(year,Number(last[2])-1,Number(last[3]),23,59,59);
  const today=new Date(); today.setHours(0,0,0,0);
  return end>=today;
}

function eventTimestamp(value:string) {
  const match=value.match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
  return match ? new Date(Number(match[1]),Number(match[2])-1,Number(match[3])).getTime() : Number.MAX_SAFE_INTEGER;
}

function escapeHtml(value:string) {
  return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}

export default function SummaryPage() {
  const [events,setEvents]=useState<AssemblyEvent[]>([]);
  const [korcham,setKorcham]=useState<SimpleEvent[]>([]);
  const [kweia,setKweia]=useState<SimpleEvent[]>([]);
  const [forum,setForum]=useState<ClimateEvent[]>([]);
  const [pcccr,setPcccr]=useState<ClimateEvent[]>([]);
  const [committeeSchedules,setCommitteeSchedules]=useState<CommitteeSchedule[]>([]);
  const [statuses,setStatuses]=useState<SourceStatus[]>([]);
  const [query,setQuery]=useState("");
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [message,setMessage]=useState("");
  const [lastUpdated,setLastUpdated]=useState<Date|null>(null);
  const [weather,setWeather]=useState<Weather|null>(null);

  const refresh=useCallback(async (refreshSource=false) => {
    if (refreshSource) setRefreshing(true);
    const stamp=Date.now();
    const getJson=async (path:string) => { const response=await fetch(refreshSource?`${path}?refresh=${stamp}`:path,{cache:"no-store"}); const data=await response.json(); if(!response.ok) throw new Error(data.error||"행사 정보를 불러오지 못했습니다."); return data; };
    const results=await Promise.allSettled([getJson("/api/events"),getJson("/api/korcham"),getJson("/api/kweia"),getJson("/api/climate-sources"),getJson("/api/environment-committee")]);
    if(results[0].status==="fulfilled") setEvents(results[0].value.events||[]);
    if(results[1].status==="fulfilled") setKorcham(results[1].value.events||[]);
    if(results[2].status==="fulfilled") setKweia(results[2].value.events||[]);
    if(results[3].status==="fulfilled") { setForum(results[3].value.climateForum||[]); setPcccr(results[3].value.pcccr||[]); }
    if(results[4].status==="fulfilled") setCommitteeSchedules((results[4].value.schedules||[]).slice(0,5));
    const persisted=await fetch(`/api/source-status?refresh=${stamp}`,{cache:"no-store"}).then((response)=>response.json()).catch(()=>({statuses:[]}));
    setStatuses(persisted.statuses||[]); setLoading(false); setRefreshing(false);
    const latest=(persisted.statuses||[]).reduce((value:number,status:SourceStatus)=>Math.max(value,status.updated_at||status.updatedAt||0),0); if(latest) setLastUpdated(new Date(latest));
  },[]);

  useEffect(()=>{
    void refresh();
    const loadWeather=(latitude:number,longitude:number,locationLabel:string)=>fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`)
      .then(response=>response.json())
      .then(data=>setWeather({temperature:data.current.temperature_2m,weatherCode:data.current.weather_code,locationLabel}));
    const seoulFallback=()=>void loadWeather(37.5665,126.9780,"서울").catch(()=>{});
    if(!navigator.geolocation){seoulFallback();return;}
    navigator.geolocation.getCurrentPosition(
      (position)=>void loadWeather(position.coords.latitude,position.coords.longitude,"현재 위치").catch(seoulFallback),
      seoulFallback,
      {enableHighAccuracy:false,timeout:7000,maximumAge:30*60*1000},
    );
  },[refresh]);

  const allEvents=useMemo<UnifiedEvent[]>(()=>[
    ...events.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`assembly-${event.id}`,source:"국회",date:event.date,title:event.title,url:event.detailUrl||event.posterUrl,posterUrl:event.posterUrl,host:event.host||"국회",location:event.location||""})),
    ...korcham.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`korcham-${event.id}`,source:"대한상의",date:event.date,title:event.title,url:event.detailUrl,host:"대한상공회의소",location:""})),
    ...kweia.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`kweia-${event.id}`,source:"풍력산업협회",date:event.date,title:event.title,url:event.detailUrl,host:"한국풍력산업협회",location:""})),
    ...forum.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`forum-${event.id}`,source:"기후변화포럼",date:event.date,title:event.title,url:event.detailUrl,host:"국회기후변화포럼",location:""})),
    ...pcccr.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`pcccr-${event.id}`,source:"기후위기위원회",date:event.date,title:event.title,url:event.detailUrl,host:"기후위기특별위원회",location:""})),
    ...committeeSchedules.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`envcommittee-${event.id}`,source:"기후환노위",date:event.date,title:event.title,url:event.previewUrl,host:"기후에너지환경노동위원회",location:"국회"})),
  ].map((event)=>({...event,...classifyText(event.title,event.source)})).sort((a,b)=>eventTimestamp(a.date)-eventTimestamp(b.date)),[events,korcham,kweia,forum,pcccr,committeeSchedules]);

  const calendarStart=useMemo(()=>{ const date=new Date(); const day=(date.getDay()+6)%7; date.setDate(date.getDate()-day); date.setHours(0,0,0,0); return date; },[]);
  const calendarDays=useMemo(()=>Array.from({length:10},(_,index)=>{ const date=new Date(calendarStart); date.setDate(date.getDate()+(index<5?index:index+2)); return date; }),[calendarStart]);
  const calendarEnd=useMemo(()=>{ const date=new Date(calendarStart); date.setDate(date.getDate()+12); return date.getTime()+86400000; },[calendarStart]);
  const needle=query.trim().toLocaleLowerCase("ko");
  const summaryEvents=useMemo(()=>allEvents.filter((event)=>{ const stamp=eventTimestamp(event.date); const weekday=new Date(stamp).getDay(); return stamp>=calendarStart.getTime()&&stamp<calendarEnd&&weekday!==0&&weekday!==6&&(!needle||`${event.source} ${event.title} ${event.date}`.toLocaleLowerCase("ko").includes(needle)); }),[allEvents,calendarStart,calendarEnd,needle]);
  const reportEvents=selectedIds.length ? summaryEvents.filter((event)=>selectedIds.includes(event.id)) : summaryEvents;
  const reportText=reportEvents.map((event,index)=>`${index+1}. [${event.source}] ${event.date} ${event.title}\n${event.url}`).join("\n\n");
  const copyText=async (text:string,nextMessage:string)=>{ await navigator.clipboard.writeText(text); setMessage(nextMessage); setTimeout(()=>setMessage(""),2200); };
  const download=(content:string,type:string,name:string)=>{ const url=URL.createObjectURL(new Blob([content],{type})); const anchor=document.createElement("a"); anchor.href=url; anchor.download=name; anchor.click(); URL.revokeObjectURL(url); };
  const downloadTable=()=>download(`\ufeff출처,일정,행사명,링크\n${reportEvents.map((event)=>[event.source,event.date,event.title,event.url].map((value)=>`"${value.replaceAll('"','""')}"`).join(",")).join("\n")}`,"text/csv;charset=utf-8","주간-행사목록.csv");
  const downloadExcel=()=>download(`\ufeff<html><meta charset="utf-8"><style>body{font-family:Arial,sans-serif}h1{color:#0867a1}table{border-collapse:collapse;width:100%}th{background:#073d5c;color:white}th,td{border:1px solid #ccdadd;padding:8px;font-size:11px}tr:nth-child(even){background:#f2f7f7}</style><h1>GS E&amp;R 대외협력 주간 행사 보고</h1><p>보고일: ${new Date().toLocaleDateString("ko-KR")} · 총 ${reportEvents.length}건</p><table><tr><th>일자</th><th>출처</th><th>행사명</th><th>주최</th><th>장소</th><th>관련 의제</th><th>중요도</th><th>참석 여부</th><th>담당자</th><th>링크</th><th>메모</th></tr>${reportEvents.map((event)=>`<tr><td>${escapeHtml(event.date)}</td><td>${escapeHtml(event.source)}</td><td>${escapeHtml(event.title)}</td><td>${escapeHtml(event.host)}</td><td>${escapeHtml(event.location)}</td><td>${escapeHtml(event.topics.join(", "))}</td><td>${event.importance} (${event.score})</td><td>검토 전</td><td></td><td><a href="${escapeHtml(event.url)}">원문</a></td><td></td></tr>`).join("")}</table></html>`,"application/vnd.ms-excel","GS-ENR-주간-행사보고.xls");
  const emailReport=()=>{ const body=`안녕하세요.\n\n이번 주 및 다음 주 주요 행사 ${reportEvents.length}건을 공유드립니다.\n\n${reportText}\n\n감사합니다.`; window.location.href=`mailto:?subject=${encodeURIComponent("[데일리 브리핑] 주요 대외 행사")}&body=${encodeURIComponent(body)}`; };

  return <main className="summary-page site-content">
    <Sidebar active="summary" />
    <header className="topbar summary-topbar">
      <div className="topbar-title"><b>Upcoming Events</b><span>이번 주와 다음 주 주요 일정</span></div>
      <div className="refresh-controls"><button className="refresh-button" onClick={()=>void refresh(true)} disabled={refreshing}><span className={refreshing?"spinning":""}>↻</span> {refreshing?"업데이트 중":"지금 업데이트"}</button>{lastUpdated&&<time>{lastUpdated.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}</time>}</div>
    </header>
    <section className="summary-dashboard" aria-labelledby="summary-title"><div className="print-report-head"><img src="/gs-enr-logo.png" alt="GS E&R"/><div><h1>대외협력 주간 행사 보고</h1><p>보고일 {new Date().toLocaleDateString("ko-KR")} · 총 {reportEvents.length}건</p></div></div>
      <div className="summary-heading"><div><p className="section-number">WEEKDAY CALENDAR</p></div><label className="global-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="전체 출처 검색" aria-label="전체 출처 행사 검색" /></label></div>
      <div className="summary-visual" aria-label="에너지 정책과 일정 모니터링 이미지"><img src="/summary-monitor-banner-v2.png" alt="컴퓨터 화면으로 에너지 정책과 산업 동향을 모니터링하는 풍경" /><div className="summary-visual-title"><span>GS E&amp;R · PUBLIC AFFAIRS</span><h1 id="summary-title">Upcoming Events</h1></div><div className="seoul-weather"><span>{weather?.locationLabel||"현재 위치"} WEATHER</span><div className="weather-reading"><i aria-hidden="true">{weather?weatherIcon(weather.weatherCode):"🌤️"}</i><strong>{weather?`${Math.round(weather.temperature)}℃`:"--℃"}</strong></div><p>{weather?weatherLabel(weather.weatherCode):"날씨 확인 중"}</p><time>{new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"long"})}</time></div></div>
      {loading&&<div className="summary-loading"><span className="loader" /> 최신 행사를 모으고 있습니다.</div>}
      {!loading&&summaryEvents.length===0&&<div className="summary-loading">현재 표시할 평일 행사가 없습니다.</div>}
      <div className="calendar-toolbar"><span>{selectedIds.length?`${selectedIds.length}개 선택됨`:`${summaryEvents.length}개 행사`}</span><button onClick={()=>void copyText(reportText,"행사 목록을 복사했습니다.")}>선택 목록 복사</button><button onClick={downloadTable}>표 다운로드</button><button onClick={downloadExcel}>Excel</button><button onClick={()=>window.print()}>PDF</button><button onClick={emailReport}>이메일 보고문</button>{selectedIds.length>0&&<button onClick={()=>setSelectedIds([])}>선택 해제</button>}</div>
      {message&&<p className="action-message" role="status">{message}</p>}
      <div className="two-week-calendar">{[0,1].map((week)=><section className="calendar-week" key={week}><div className="calendar-week-title"><span>{week===0?"THIS WEEK":"NEXT WEEK"}</span><h2>{week===0?"이번 주":"다음 주"}</h2></div><div className="calendar-days">{calendarDays.slice(week*5,week*5+5).map((day)=>{ const dayEvents=summaryEvents.filter((event)=>{ const stamp=eventTimestamp(event.date); return stamp>=day.getTime()&&stamp<day.getTime()+86400000; }); return <div className={`calendar-day ${day.toDateString()===new Date().toDateString()?"today":""}`} key={day.toISOString()}><div className="day-head"><span>{["일","월","화","수","목","금","토"][day.getDay()]}요일</span><strong>{day.getMonth()+1}월 {day.getDate()}일</strong><em>{dayEvents.length}건</em></div><div className="day-events">{dayEvents.map((event)=><label className="calendar-event" key={event.id}><input type="checkbox" checked={selectedIds.includes(event.id)} onChange={(change)=>setSelectedIds((current)=>change.target.checked?[...current,event.id]:current.filter((id)=>id!==event.id))}/><span className="event-source">{event.source}</span><b>{event.title}</b><span className="event-actions"><a href={event.url} target="_blank" rel="noreferrer">원문 ↗</a>{event.source==="국회"&&event.posterUrl&&<a href={event.posterUrl} target="_blank" rel="noreferrer">포스터 ↗</a>}<button type="button" onClick={(click)=>{click.preventDefault();void copyText(`${event.title}\n${event.url}`,"행사 링크를 복사했습니다.");}}>링크 복사</button></span></label>)}</div></div>; })}</div></section>)}</div>
      <aside className="daily-briefing"><div><span>WEEKLY INSIGHT</span><h2>주간 핵심 일정 요약</h2><p>이번 주와 다음 주 평일 일정은 총 {summaryEvents.length}건이며, GS E&amp;R 핵심·관심 의제 일정은 {summaryEvents.filter(event=>event.score>=65).length}건입니다. 전력·에너지·탄소 정책 영향을 중심으로 참석 필요성을 검토해 주세요.</p></div><button onClick={emailReport}>메일로 작성하기 ↗</button></aside><div className="print-source-note">출처: 국회, 대한상공회의소, 한국풍력산업협회, 국회기후변화포럼, 기후위기특별위원회, 기후에너지환경노동위원회 · 최종 갱신 {lastUpdated?lastUpdated.toLocaleString("ko-KR"):"확인 중"}</div>
    </section>
  </main>;
}
