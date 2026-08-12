"use client";
import { useCallback,useEffect,useMemo,useState } from "react";
import Sidebar from "../sidebar";
type Article={id:string;source:string;sourceKey:string;title:string;url:string;imageUrl:string;color:string};
type Group={key:string;name:string;url:string;color:string;articles:Article[]};
export default function NewsPage(){
 const [groups,setGroups]=useState<Group[]>([]);const [loading,setLoading]=useState(true);const [refreshing,setRefreshing]=useState(false);const [query,setQuery]=useState("");const [active,setActive]=useState("all");const [error,setError]=useState("");
 const load=useCallback(async(refresh=false)=>{if(refresh)setRefreshing(true);setError("");const response=await fetch(refresh?`/api/news?refresh=${Date.now()}`:"/api/news",{cache:"no-store"});const data=await response.json();if(response.ok)setGroups(data.groups||[]);else setError(data.error||"뉴스를 불러오지 못했습니다.");setLoading(false);setRefreshing(false);},[]);
 useEffect(()=>{void load();},[load]);
 const all=useMemo(()=>groups.flatMap((group)=>group.articles),[groups]);const needle=query.trim().toLocaleLowerCase("ko");
 const filtered=all.filter((article)=>(active==="all"||article.sourceKey===active)&&(!needle||`${article.title} ${article.source}`.toLocaleLowerCase("ko").includes(needle)));
 const lead=filtered[0];const secondary=filtered.slice(1,5);
 return <main className="news-page site-content"><Sidebar active="news"/><header className="topbar news-topbar"><div className="topbar-title"><b>에너지 뉴스</b></div><button className="refresh-button" onClick={()=>void load(true)} disabled={refreshing}><span className={refreshing?"spinning":""}>↻</span>{refreshing?"업데이트 중":"뉴스 업데이트"}</button></header>
 <section className="news-portal"><div className="news-masthead"><div><span>ENERGY NEWS DESK</span><h1>뉴스</h1><p>에너지·전력·기후 산업의 주요 보도를 매체별로 모았습니다.</p></div><label className="news-search"><span>⌕</span><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="뉴스 전체 검색"/></label></div>
 <nav className="news-tabs" aria-label="언론사 선택"><button className={active==="all"?"active":""} onClick={()=>setActive("all")}>전체</button>{groups.map((group)=><button className={active===group.key?"active":""} onClick={()=>setActive(group.key)} key={group.key}>{group.name}</button>)}</nav>
 {loading&&<div className="news-state"><span className="loader"/>최신 뉴스를 모으고 있습니다.</div>}{error&&<div className="news-state error">{error}</div>}
 {!loading&&lead&&<section className="news-lead"><a className="lead-story" href={lead.url} target="_blank" rel="noreferrer" style={{"--source-color":lead.color} as React.CSSProperties}>{lead.imageUrl?<img src={lead.imageUrl} alt=""/>:<div className="lead-visual"><span>ENERGY</span><b>NEWS</b></div>}<div><span>{lead.source} · 주요 뉴스</span><h2>{lead.title}</h2><em>원문에서 읽기 →</em></div></a><div className="headline-stack">{secondary.map((article,index)=><a href={article.url} target="_blank" rel="noreferrer" key={article.id}><b>{String(index+1).padStart(2,"0")}</b><div><span>{article.source}</span><h3>{article.title}</h3></div></a>)}</div></section>}
 <section className="publisher-grid">{groups.filter((group)=>active==="all"||group.key===active).map((group)=><article className="publisher-card" key={group.key} style={{"--source-color":group.color} as React.CSSProperties}><header><div><i/><h2>{group.name}</h2></div><a href={group.url} target="_blank" rel="noreferrer">매체 홈 ↗</a></header><ol>{group.articles.filter((article)=>!needle||article.title.toLocaleLowerCase("ko").includes(needle)).slice(0,6).map((article,index)=><li key={article.id}><a href={article.url} target="_blank" rel="noreferrer"><b>{index+1}</b><span>{article.title}</span><em>↗</em></a></li>)}</ol></article>)}</section>
 <p className="news-notice">기사 제목을 누르면 각 언론사의 원문 페이지로 이동합니다.</p></section></main>;
}
