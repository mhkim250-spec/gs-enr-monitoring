"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AssemblyEvent = { id:string; title:string; date:string; detailUrl:string; posterUrl:string };
type SimpleEvent = { id:string; title:string; date:string; detailUrl:string };
type ClimateEvent = { id:string; title:string; date:string; detailUrl:string };
type UnifiedEvent = { id:string; source:string; date:string; title:string; url:string };
type SourceStatus = { source:string; updated_at?:number; updatedAt?:number; status:string };

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
  const [statuses,setStatuses]=useState<SourceStatus[]>([]);
  const [query,setQuery]=useState("");
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [message,setMessage]=useState("");
  const [lastUpdated,setLastUpdated]=useState<Date|null>(null);

  const refresh=useCallback(async (refreshSource=false) => {
    if (refreshSource) setRefreshing(true);
    const stamp=Date.now();
    const getJson=async (path:string) => { const response=await fetch(refreshSource?`${path}?refresh=${stamp}`:path,{cache:"no-store"}); const data=await response.json(); if(!response.ok) throw new Error(data.error||"행사 정보를 불러오지 못했습니다."); return data; };
    const results=await Promise.allSettled([getJson("/api/events"),getJson("/api/korcham"),getJson("/api/kweia"),getJson("/api/climate-sources")]);
    if(results[0].status==="fulfilled") setEvents(results[0].value.events||[]);
    if(results[1].status==="fulfilled") setKorcham(results[1].value.events||[]);
    if(results[2].status==="fulfilled") setKweia(results[2].value.events||[]);
    if(results[3].status==="fulfilled") { setForum(results[3].value.climateForum||[]); setPcccr(results[3].value.pcccr||[]); }
    const persisted=await fetch(`/api/source-status?refresh=${stamp}`,{cache:"no-store"}).then((response)=>response.json()).catch(()=>({statuses:[]}));
    setStatuses(persisted.statuses||[]); setLoading(false); setRefreshing(false);
    const latest=(persisted.statuses||[]).reduce((value:number,status:SourceStatus)=>Math.max(value,status.updated_at||status.updatedAt||0),0); if(latest) setLastUpdated(new Date(latest));
  },[]);

  useEffect(()=>{ void refresh(); },[refresh]);

  const allEvents=useMemo<UnifiedEvent[]>(()=>[
    ...events.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`assembly-${event.id}`,source:"국회",date:event.date,title:event.title,url:event.detailUrl||event.posterUrl})),
    ...korcham.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`korcham-${event.id}`,source:"대한상의",date:event.date,title:event.title,url:event.detailUrl})),
    ...kweia.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`kweia-${event.id}`,source:"풍력산업협회",date:event.date,title:event.title,url:event.detailUrl})),
    ...forum.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`forum-${event.id}`,source:"기후변화포럼",date:event.date,title:event.title,url:event.detailUrl})),
    ...pcccr.filter((event)=>isCurrentOrFuture(event.date)).map((event)=>({id:`pcccr-${event.id}`,source:"기후위기위원회",date:event.date,title:event.title,url:event.detailUrl})),
  ].sort((a,b)=>eventTimestamp(a.date)-eventTimestamp(b.date)),[events,korcham,kweia,forum,pcccr]);

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
  const downloadExcel=()=>download(`\ufeff<html><meta charset="utf-8"><table><tr><th>출처</th><th>일정</th><th>행사명</th><th>링크</th></tr>${reportEvents.map((event)=>`<tr><td>${escapeHtml(event.source)}</td><td>${escapeHtml(event.date)}</td><td>${escapeHtml(event.title)}</td><td>${escapeHtml(event.url)}</td></tr>`).join("")}</table></html>`,"application/vnd.ms-excel","주간-행사목록.xls");
  const emailReport=()=>{ const body=`안녕하세요.\n\n이번 주 및 다음 주 주요 행사 ${reportEvents.length}건을 공유드립니다.\n\n${reportText}\n\n감사합니다.`; window.location.href=`mailto:?subject=${encodeURIComponent("[데일리 브리핑] 주요 대외 행사")}&body=${encodeURIComponent(body)}`; };

  return <main className="summary-page">
    <header className="topbar summary-topbar">
      <a className="brand logo-brand" href="/" aria-label="GS E&R 대외협력 모니터링 홈"><img src="/gs-enr-logo.png" alt="GS E&R" /></a>
      <nav aria-label="요약 메뉴"><a className="active" href="/summary">요약 대시보드</a><a href="/">전체 행사 보기</a></nav>
      <div className="refresh-controls"><button className="refresh-button" onClick={()=>void refresh(true)} disabled={refreshing}><span className={refreshing?"spinning":""}>↻</span> {refreshing?"업데이트 중":"지금 업데이트"}</button>{lastUpdated&&<time>{lastUpdated.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}</time>}</div>
    </header>
    <section className="summary-dashboard" aria-labelledby="summary-title">
      <div className="summary-heading"><div><p className="section-number">WEEKDAY CALENDAR</p><h1 id="summary-title">이번 주 · 다음 주</h1><p className="summary-description">토·일을 제외한 평일 행사만 모았습니다.</p></div><label className="global-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="전체 출처 검색" aria-label="전체 출처 행사 검색" /></label></div>
      <div className="summary-overview" aria-label="행사 요약"><div><span>표시 중인 행사</span><strong>{summaryEvents.length}</strong><small>건</small></div><div><span>선택한 행사</span><strong>{selectedIds.length}</strong><small>건</small></div><div><span>조회 범위</span><b>이번 주 + 다음 주</b><small>월–금</small></div></div>
      {loading&&<div className="summary-loading"><span className="loader" /> 최신 행사를 모으고 있습니다.</div>}
      {!loading&&summaryEvents.length===0&&<div className="summary-loading">현재 표시할 평일 행사가 없습니다.</div>}
      <div className="calendar-toolbar"><span>{selectedIds.length?`${selectedIds.length}개 선택됨`:`${summaryEvents.length}개 행사`}</span><button onClick={()=>void copyText(reportText,"행사 목록을 복사했습니다.")}>선택 목록 복사</button><button onClick={downloadTable}>표 다운로드</button><button onClick={downloadExcel}>Excel</button><button onClick={()=>window.print()}>PDF</button><button onClick={emailReport}>이메일 보고문</button>{selectedIds.length>0&&<button onClick={()=>setSelectedIds([])}>선택 해제</button>}</div>
      {message&&<p className="action-message" role="status">{message}</p>}
      <div className="two-week-calendar">{[0,1].map((week)=><section className="calendar-week" key={week}><h2>{week===0?"이번 주":"다음 주"}</h2><div className="calendar-days">{calendarDays.slice(week*5,week*5+5).map((day)=>{ const dayEvents=summaryEvents.filter((event)=>{ const stamp=eventTimestamp(event.date); return stamp>=day.getTime()&&stamp<day.getTime()+86400000; }); return <div className={`calendar-day ${day.toDateString()===new Date().toDateString()?"today":""}`} key={day.toISOString()}><div className="day-head"><span>{["일","월","화","수","목","금","토"][day.getDay()]}</span><strong>{day.getMonth()+1}/{day.getDate()}</strong></div><div className="day-events">{dayEvents.map((event)=><label className="calendar-event" key={event.id}><input type="checkbox" checked={selectedIds.includes(event.id)} onChange={(change)=>setSelectedIds((current)=>change.target.checked?[...current,event.id]:current.filter((id)=>id!==event.id))}/><span className="event-source">{event.source}</span><b>{event.title}</b><span className="event-actions"><a href={event.url} target="_blank" rel="noreferrer">원문 ↗</a><button type="button" onClick={(click)=>{click.preventDefault();void copyText(`${event.title}\n${event.url}`,"행사 링크를 복사했습니다.");}}>링크 복사</button></span></label>)}</div></div>; })}</div></section>)}</div>
      <div className="source-health" aria-label="출처별 갱신 상태">{[{key:"assembly",label:"국회"},{key:"korcham",label:"대한상의"},{key:"kweia",label:"풍력산업협회"},{key:"climate",label:"기후변화포럼·기후위기위원회"}].map((item)=>{ const status=statuses.find((entry)=>entry.source===item.key); const updated=status?.updated_at||status?.updatedAt; return <div key={item.key}><i className={status?.status==="stale"?"stale":""}/><span>{item.label}</span><b>{status?.status==="stale"?"저장 데이터":status?"정상":"확인 중"}</b>{updated&&<time>{new Date(updated).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</time>}</div>;})}</div>
      <aside className="daily-briefing"><div><span>DAILY BRIEFING</span><h2>오늘의 대외 행사 브리핑</h2><p>이번 주와 다음 주 평일 일정은 총 {summaryEvents.length}건입니다. 선택한 행사만 복사하거나 이메일 보고문으로 정리할 수 있습니다.</p></div><button onClick={emailReport}>메일로 작성하기 ↗</button></aside>
    </section>
  </main>;
}
