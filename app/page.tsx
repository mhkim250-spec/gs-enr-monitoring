"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Sidebar from "./sidebar";
import {parseDate} from "./intelligence";

type EventItem={id:string;source:string;title:string;date:string;url:string;host?:string;location?:string};
type Status={source:string;updated_at?:number;updatedAt?:number;status:string;error?:string};
type Weather={temperature:number;weatherCode:number};

function weatherLabel(code:number){if(code===0)return"맑음";if(code<=3)return"구름 조금";if(code<=67)return"비";if(code<=77)return"눈";return"흐림"}
function dayKey(date:Date){return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`}

export default function TodayDashboard(){
 const [events,setEvents]=useState<EventItem[]>([]);const [statuses,setStatuses]=useState<Status[]>([]);const [weather,setWeather]=useState<Weather|null>(null);const [loading,setLoading]=useState(true);const [refreshing,setRefreshing]=useState(false);
 const load=useCallback(async(refresh=false)=>{if(refresh)setRefreshing(true);const suffix=refresh?`?refresh=${Date.now()}`:"";const get=async(path:string)=>{const response=await fetch(path+suffix,{cache:"no-store"});return response.ok?response.json():{};};const [assembly,korcham,kweia,climate,kpx,status]=await Promise.all([get("/api/events"),get("/api/korcham"),get("/api/kweia"),get("/api/climate-sources"),get("/api/kpx"),get("/api/source-status")]);setEvents([
 ...(assembly.events||[]).map((e:any)=>({id:`assembly-${e.id}`,source:"국회",title:e.title,date:e.date,url:e.detailUrl||e.posterUrl,host:e.host,location:e.location})),
 ...(korcham.events||[]).map((e:any)=>({id:`korcham-${e.id}`,source:"대한상의",title:e.title,date:e.date,url:e.detailUrl})),
 ...(kweia.events||[]).map((e:any)=>({id:`kweia-${e.id}`,source:"풍력산업협회",title:e.title,date:e.date,url:e.detailUrl})),
 ...((climate.climateForum||[]).map((e:any)=>({id:`forum-${e.id}`,source:"기후변화포럼",title:e.title,date:e.date,url:e.detailUrl,host:e.host,location:e.location}))),
 ...((climate.pcccr||[]).map((e:any)=>({id:`pcccr-${e.id}`,source:"기후위기위원회",title:e.title,date:e.date,url:e.detailUrl,host:e.host,location:e.location}))),
 ...(kpx.events||[]).map((e:any)=>({id:`kpx-${e.id}`,source:"전력거래소",title:e.title,date:e.date,url:e.detailUrl}))
 ]);setStatuses(status.statuses||[]);setLoading(false);setRefreshing(false);},[]);
 useEffect(()=>{void load();fetch("https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,weather_code&timezone=Asia%2FSeoul").then(r=>r.json()).then(d=>setWeather({temperature:d.current.temperature_2m,weatherCode:d.current.weather_code})).catch(()=>{});},[load]);
 const now=new Date();const today=dayKey(now);const sorted=useMemo(()=>events.map(event=>({...event,parsed:parseDate(event.date)})).filter(event=>event.parsed).sort((a,b)=>a.parsed!.getTime()-b.parsed!.getTime()),[events]);
 const todayEvents=sorted.filter(e=>dayKey(e.parsed!)===today);const weekEvents=sorted.filter(e=>e.parsed!.getTime()>=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()&&e.parsed!.getTime()<Date.now()+7*86400000);const upcomingEvents=weekEvents.slice(0,5);const lastUpdated=statuses.reduce((v,s)=>Math.max(v,s.updated_at||s.updatedAt||0),0);
 return <main className="today-page site-content"><Sidebar active="today"/><header className="topbar"><div className="topbar-title"><b>GS E&amp;R 대외협력 업무 대시보드</b></div><button className="refresh-button" onClick={()=>void load(true)} disabled={refreshing}>{refreshing?"업데이트 중":"지금 업데이트"}</button></header>
 <section className="today-dashboard"><div className="today-intro"><div><p>PUBLIC AFFAIRS BRIEFING</p><h1>{now.toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"long"})}<br/><em>오늘의 업무 브리핑</em></h1></div><a href="/events">전체 행사 탐색 →</a></div>
 <section className="signal-grid" aria-label="오늘의 외부 지표"><article><span>서울 날씨</span><strong>{weather?`${Math.round(weather.temperature)}℃` : "확인 중"}</strong><small>{weather?weatherLabel(weather.weatherCode):"공개 기상 데이터"}</small></article><article><span>전력수급 현황</span><strong>API 연결 준비</strong><small>전력거래소 실시간 데이터 연동 필요</small></article><article><span>배출권 가격</span><strong>API 연결 준비</strong><small>KAU 기준 데이터 연동 필요</small></article><article><span>최근 서버 갱신</span><strong>{lastUpdated?new Date(lastUpdated).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"}):"확인 중"}</strong><small>{statuses.filter(s=>s.status==="ok").length}/{statuses.length||6}개 출처 정상</small></article></section>
 <section className="brief-overview"><article><span>오늘 행사</span><strong>{todayEvents.length}</strong><small>건</small></article><article><span>7일 이내</span><strong>{weekEvents.length}</strong><small>건</small></article><article><span>수집 출처</span><strong>{statuses.length||6}</strong><small>곳</small></article></section>
 <div className="dashboard-columns"><section className="dashboard-panel"><header><div><span>TODAY</span><h2>오늘 확인할 행사</h2></div><a href="/summary">주간 일정 →</a></header>{loading?<p className="dashboard-empty">행사를 정리하고 있습니다.</p>:todayEvents.length?todayEvents.map(event=><a className="brief-event" href={event.url} target="_blank" rel="noreferrer" key={event.id}><div><span>{event.source}</span><b>{event.title}</b><small>{event.host||event.location||event.date}</small></div><em>{event.intel.score}<small>/100</small></em></a>):<p className="dashboard-empty">오늘 예정된 행사가 없습니다. 다음 일정을 미리 검토해 보세요.</p>}</section>
 <section className="dashboard-panel"><header><div><span>UPCOMING</span><h2>다가오는 주요 일정</h2></div><a href="/events">전체 보기 →</a></header>{upcomingEvents.map(event=><a className="brief-event simple" href={event.url} target="_blank" rel="noreferrer" key={event.id}><div><span>{event.source}</span><b>{event.title}</b><small>{event.date}</small></div><u>↗</u></a>)}</section></div>
 </section></main>;
}
