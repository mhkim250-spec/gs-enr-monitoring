"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./sidebar";

type AssemblyEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  host: string;
  location: string;
  posterUrl: string;
  detailUrl: string;
  keywords: string[];
};

type KorchamEvent = { id: string; title: string; date: string; detailUrl: string };
type ClimateSourceEvent = { id:string; title:string; date:string; location:string; host:string; posterUrl:string; detailUrl:string };
type UnifiedEvent = { id:string; source:string; date:string; title:string; url:string; section:string };
type SourceStatus = { source:string; updated_at?:number; updatedAt?:number; status:string; error?:string | null };

function isCurrentOrFuture(dateText: string) {
  const matches = [...dateText.matchAll(/(?:^|\D)(20\d{2}|\d{2})\s*(?:년|[.\/-])\s*(\d{1,2})\s*(?:월|[.\/-])\s*(\d{1,2})/g)];
  if (!matches.length) return true;
  const last = matches[matches.length - 1];
  const year = Number(last[1]) < 100 ? 2000 + Number(last[1]) : Number(last[1]);
  const endDate = new Date(year, Number(last[2]) - 1, Number(last[3]), 23, 59, 59);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDate >= today;
}

function ClimateSourceSection({ id, number, title, events, loading, error }: { id:string; number:string; title:string; events:ClimateSourceEvent[]; loading:boolean; error:string }) {
  const currentEvents = events.filter((event) => isCurrentOrFuture(event.date));
  return <section className="events-section climate-section" id={id}>
    <div className="section-head"><div><p className="section-number">{number} / SOURCE</p><h2>{title}</h2></div><div className="section-tools"><p>예정 <strong>{currentEvents.length}</strong>개 행사</p></div></div>
    {loading && <div className="status-card" role="status"><span className="loader" /><p>최신 행사를 확인하고 있습니다.</p></div>}
    {!loading && error && <div className="status-card error" role="alert"><span>!</span><div><h3>데이터를 불러오지 못했습니다</h3><p>{error}</p></div></div>}
    {!loading && !error && currentEvents.length === 0 && <div className="status-card empty"><span>0</span><p>현재 예정된 행사가 없습니다.</p></div>}
    <div className="event-grid climate-grid">{currentEvents.map((event, index) => <article className="event-card" key={event.id}>
      <div className="poster-wrap">{event.posterUrl ? <img src={event.posterUrl} alt={`${event.title} 포스터`} loading="lazy" /> : <div className="poster-fallback"><b>CLIMATE</b><span>POLICY<br />EVENT</span></div>}<span className="card-index">{String(index+1).padStart(2,"0")}</span></div>
      <div className="card-body"><div className="tags"><span>#기후</span><span>#에너지</span></div><h3>{event.title}</h3><dl><div><dt>일시</dt><dd>{event.date}</dd></div><div><dt>장소</dt><dd>{event.location}</dd></div><div><dt>주최</dt><dd>{event.host}</dd></div></dl><div className="card-links"><a href={event.detailUrl} target="_blank" rel="noreferrer">행사 자세히 보기 <span>↗</span></a>{event.posterUrl && <a className="poster-link" href={event.posterUrl} target="_blank" rel="noreferrer">포스터 원본</a>}</div></div>
    </article>)}</div>
  </section>;
}

const KEYWORDS = [
  "탄소", "에너지", "NDC", "배출권", "PPA", "분산에너지", "수소", "특구", "원전",
  "석탄", "전력", "LNG", "전기", "전기요금", "SMP", "REC", "열병합", "송전", "배전",
  "계통", "ESS", "출력제어", "열요금", "데이터센터", "RE100", "에너지 고속도로", "온실가스",
  "신재생", "산업안전", "탄소중립", "전력망", "공시", "지속가능", "집단에너지", "VPP",
  "EMS", "에너지 플랫폼", "디지털 트윈", "CBAM", "직접전력거래", "송배전 요금", "ESG 공시",
  "공급망 실사", "CCUS", "Scope 3", "유연성 자원", "전력 계통 보강", "AI", "메가",
];

function formatDate(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return value || "일정 확인 중";
  const date = new Date(`${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long", day: "numeric", weekday: "short",
  }).format(date);
}

function eventTimestamp(value: string) {
  const match = value.match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

export default function Home() {
  const [events, setEvents] = useState<AssemblyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(6);
  const [korchamEvents, setKorchamEvents] = useState<KorchamEvent[]>([]);
  const [korchamLoading, setKorchamLoading] = useState(true);
  const [korchamError, setKorchamError] = useState("");
  const [kweiaEvents, setKweiaEvents] = useState<KorchamEvent[]>([]);
  const [kweiaLoading, setKweiaLoading] = useState(true);
  const [kweiaError, setKweiaError] = useState("");
  const [kpxEvents, setKpxEvents] = useState<KorchamEvent[]>([]);
  const [kpxLoading, setKpxLoading] = useState(true);
  const [kpxError, setKpxError] = useState("");
  const [climateForumEvents, setClimateForumEvents] = useState<ClimateSourceEvent[]>([]);
  const [pcccrEvents, setPcccrEvents] = useState<ClimateSourceEvent[]>([]);
  const [climateLoading, setClimateLoading] = useState(true);
  const [climateError, setClimateError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sourceStatuses, setSourceStatuses] = useState<SourceStatus[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState("");

  const refreshEvents = useCallback(async (refreshSource = false) => {
    if (refreshSource) setRefreshing(true);
    setError(""); setKorchamError(""); setKweiaError(""); setKpxError(""); setClimateError("");
    const cacheBuster = Date.now();
    const getJson = async (path: string) => {
      const response = await fetch(refreshSource ? `${path}?refresh=${cacheBuster}` : path, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "행사 정보를 불러오지 못했습니다.");
      return data;
    };
    const results = await Promise.allSettled([
      getJson("/api/events"), getJson("/api/korcham"), getJson("/api/kweia"), getJson("/api/climate-sources"), getJson("/api/kpx"),
    ]);
    if (results[0].status === "fulfilled") setEvents(results[0].value.events || []);
    else setError(results[0].reason.message);
    if (results[1].status === "fulfilled") setKorchamEvents(results[1].value.events || []);
    else setKorchamError(results[1].reason.message);
    if (results[2].status === "fulfilled") setKweiaEvents(results[2].value.events || []);
    else setKweiaError(results[2].reason.message);
    if (results[3].status === "fulfilled") {
      setClimateForumEvents(results[3].value.climateForum || []);
      setPcccrEvents(results[3].value.pcccr || []);
    } else setClimateError(results[3].reason.message);
    if (results[4].status === "fulfilled") setKpxEvents(results[4].value.events || []);
    else setKpxError(results[4].reason.message);
    setLoading(false); setKorchamLoading(false); setKweiaLoading(false); setClimateLoading(false); setKpxLoading(false);
    const statuses = results.flatMap((result) => result.status === "fulfilled" && result.value.sourceStatus ? [result.value.sourceStatus] : []);
    const persisted = await fetch(`/api/source-status?refresh=${cacheBuster}`, { cache:"no-store" }).then((response) => response.json()).catch(() => ({ statuses:[] }));
    setSourceStatuses(persisted.statuses?.length ? persisted.statuses : statuses);
    const latest = (persisted.statuses || statuses).reduce((value: number, status: SourceStatus) => Math.max(value, status.updated_at || status.updatedAt || 0), 0);
    if (latest) setLastUpdated(new Date(latest));
    setRefreshing(false);
  }, []);

  useEffect(() => { void refreshEvents(); }, [refreshEvents]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNextRefresh = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(9, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      timer = setTimeout(async () => {
        await refreshEvents(true);
        scheduleNextRefresh();
      }, next.getTime() - now.getTime());
    };
    scheduleNextRefresh();
    return () => clearTimeout(timer);
  }, [refreshEvents]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ko");
    const currentEvents = events.filter((event) => isCurrentOrFuture(event.date));
    if (!needle) return currentEvents;
    return currentEvents.filter((event) =>
      [event.title, event.host, event.location, ...event.keywords]
        .join(" ")
        .toLocaleLowerCase("ko")
        .includes(needle),
    );
  }, [events, query]);

  const needle = query.trim().toLocaleLowerCase("ko");
  const matchesQuery = useCallback((...values:string[]) => !needle || values.join(" ").toLocaleLowerCase("ko").includes(needle), [needle]);
  const currentKorchamEvents = useMemo(() => korchamEvents.filter((event) => isCurrentOrFuture(event.date) && matchesQuery(event.title, event.date)), [korchamEvents, matchesQuery]);
  const currentKweiaEvents = useMemo(() => kweiaEvents.filter((event) => isCurrentOrFuture(event.date) && matchesQuery(event.title, event.date)), [kweiaEvents, matchesQuery]);
  const currentKpxEvents = useMemo(() => kpxEvents.filter((event) => matchesQuery(event.title, event.date)).slice(0,5), [kpxEvents, matchesQuery]);
  const filteredClimateForumEvents = useMemo(() => climateForumEvents.filter((event) => matchesQuery(event.title, event.date, event.host, event.location)), [climateForumEvents, matchesQuery]);
  const filteredPcccrEvents = useMemo(() => pcccrEvents.filter((event) => matchesQuery(event.title, event.date, event.host, event.location)), [pcccrEvents, matchesQuery]);
  const allCurrentEvents = useMemo<UnifiedEvent[]>(() => [
    ...events.filter((event) => isCurrentOrFuture(event.date)).map((event) => ({ id:`assembly-${event.id}`, source:"국회", date:event.date, title:event.title, url:event.detailUrl || event.posterUrl, section:"#assembly" })),
    ...currentKorchamEvents.map((event) => ({ id:`korcham-${event.id}`, source:"대한상의", date:event.date, title:event.title, url:event.detailUrl, section:"#korcham" })),
    ...currentKweiaEvents.map((event) => ({ id:`kweia-${event.id}`, source:"풍력산업협회", date:event.date, title:event.title, url:event.detailUrl, section:"#kweia" })),
    ...climateForumEvents.filter((event) => isCurrentOrFuture(event.date)).map((event) => ({ id:`forum-${event.id}`, source:"기후변화포럼", date:event.date, title:event.title, url:event.detailUrl, section:"#climateforum" })),
    ...pcccrEvents.filter((event) => isCurrentOrFuture(event.date)).map((event) => ({ id:`pcccr-${event.id}`, source:"기후위기위원회", date:event.date, title:event.title, url:event.detailUrl, section:"#pcccr" })),
  ].filter((event) => matchesQuery(event.title, event.source, event.date)).sort((a, b) => eventTimestamp(a.date) - eventTimestamp(b.date)), [events, currentKorchamEvents, currentKweiaEvents, climateForumEvents, pcccrEvents, matchesQuery]);
  const calendarStart = useMemo(() => { const date=new Date(); const day=(date.getDay()+6)%7; date.setDate(date.getDate()-day); date.setHours(0,0,0,0); return date; }, []);
  const calendarDays = useMemo(() => Array.from({ length:14 }, (_, index) => { const date=new Date(calendarStart); date.setDate(date.getDate()+index); return date; }), [calendarStart]);
  const calendarEnd = useMemo(() => { const date=new Date(calendarStart); date.setDate(date.getDate()+14); return date.getTime(); }, [calendarStart]);
  const summaryEvents = useMemo(() => allCurrentEvents.filter((event) => { const stamp=eventTimestamp(event.date); return stamp >= calendarStart.getTime() && stamp < calendarEnd; }), [allCurrentEvents, calendarStart, calendarEnd]);
  const reportEvents = selectedIds.length ? summaryEvents.filter((event) => selectedIds.includes(event.id)) : summaryEvents;
  const reportText = reportEvents.map((event, index) => `${index+1}. [${event.source}] ${event.date} ${event.title}\n${event.url}`).join("\n\n");
  const copyText = async (text:string, message:string) => { await navigator.clipboard.writeText(text); setActionMessage(message); setTimeout(() => setActionMessage(""), 2200); };
  const downloadFile = (content:string, type:string, name:string) => { const url=URL.createObjectURL(new Blob([content], { type })); const anchor=document.createElement("a"); anchor.href=url; anchor.download=name; anchor.click(); URL.revokeObjectURL(url); };
  const downloadTable = () => downloadFile(`\ufeff출처,일정,행사명,링크\n${reportEvents.map((event) => [event.source,event.date,event.title,event.url].map((value) => `"${value.replaceAll('"','""')}"`).join(",")).join("\n")}`, "text/csv;charset=utf-8", "주간-행사목록.csv");
  const downloadExcel = () => downloadFile(`\ufeff<html><meta charset="utf-8"><table><tr><th>출처</th><th>일정</th><th>행사명</th><th>링크</th></tr>${reportEvents.map((event) => `<tr><td>${event.source}</td><td>${event.date}</td><td>${event.title}</td><td>${event.url}</td></tr>`).join("")}</table></html>`, "application/vnd.ms-excel", "주간-행사목록.xls");
  const emailReport = () => { const body=`안녕하세요.\n\n이번 주 및 다음 주 주요 행사 ${reportEvents.length}건을 공유드립니다.\n\n${reportText}\n\n감사합니다.`; window.location.href=`mailto:?subject=${encodeURIComponent("[데일리 브리핑] 주요 대외 행사")}&body=${encodeURIComponent(body)}`; };

  return (
    <main className="site-content">
      <Sidebar />
      <header className="topbar">
        <div className="topbar-title"><b>대외협력 행사 모니터링</b></div>
        <div className="refresh-controls">
          <div className="live"><i /> 매일 09:00 자동 업데이트</div>
          <button className="refresh-button" onClick={() => void refreshEvents(true)} disabled={refreshing}>
            <span aria-hidden="true" className={refreshing ? "spinning" : ""}>↻</span>
            {refreshing ? "업데이트 중" : "지금 업데이트"}
          </button>
          {lastUpdated && <time dateTime={lastUpdated.toISOString()}>최근 {lastUpdated.toLocaleTimeString("ko-KR", { hour:"2-digit", minute:"2-digit" })}</time>}
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">GS E&R · PUBLIC AFFAIRS</div>
        <h1>GS E&R<br /><em>대외협력 행사 모니터링</em></h1>
        <div className="hero-bottom">
          <a href="#assembly" className="discover">행사 살펴보기 <span>↓</span></a>
        </div>
      </section>

      <section className="ticker" aria-label="관심 키워드">
        <div>{KEYWORDS.slice(0, 14).map((keyword) => <span key={keyword}>#{keyword}</span>)}</div>
      </section>

      <section className="events-section" id="assembly">
        <div className="section-head">
          <div>
            <p className="section-number">01 / SOURCE</p>
            <img className="source-heading-logo assembly-heading-logo" src="/assembly-logo.png" alt="국회" />
          </div>
          <div className="section-tools">
            <label className="search">
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setVisible(6); }}
                placeholder="제목, 주최, 키워드 검색"
                aria-label="행사 검색"
              />
            </label>
            <p>총 <strong>{filtered.length}</strong>개의 관련 행사</p>
          </div>
        </div>

        {loading && (
          <div className="status-card" role="status">
            <span className="loader" />
            <p>최신 국회 행사를 선별하고 있습니다.</p>
          </div>
        )}

        {!loading && error && (
          <div className="status-card error" role="alert">
            <span>!</span>
            <div><h3>데이터를 불러오지 못했습니다</h3><p>{error}</p></div>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="status-card empty">
            <span>0</span><p>{query ? "검색어와 일치하는 행사가 없습니다." : "현재 조건에 맞는 최근 행사가 없습니다."}</p>
          </div>
        )}

        <div className="event-grid">
          {filtered.slice(0, visible).map((event, index) => (
            <article className="event-card" key={event.id}>
              <div className="poster-wrap">
                {event.posterUrl ? (
                  <img src={event.posterUrl} alt={`${event.title} 포스터`} loading="lazy" />
                ) : (
                  <div className="poster-fallback"><b>ASSEMBLY</b><span>POLICY<br />EVENT</span></div>
                )}
                <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="card-body">
                <div className="tags">{event.keywords.slice(0, 3).map((keyword) => <span key={keyword}>#{keyword}</span>)}</div>
                <h3>{event.title}</h3>
                <dl>
                  <div><dt>일시</dt><dd>{formatDate(event.date)} {event.time}</dd></div>
                  <div><dt>주최</dt><dd>{event.host || "국회"}</dd></div>
                  {event.location && <div><dt>장소</dt><dd>{event.location}</dd></div>}
                </dl>
                <div className="card-links">
                  <a href={event.detailUrl || event.posterUrl} target="_blank" rel="noreferrer">행사 자세히 보기 <span>↗</span></a>
                  {event.posterUrl && <a className="poster-link" href={event.posterUrl} target="_blank" rel="noreferrer">포스터 원본</a>}
                </div>
              </div>
            </article>
          ))}
        </div>

        {visible < filtered.length && (
          <button className="more" onClick={() => setVisible((count) => count + 6)}>
            더 많은 행사 보기 <span>＋</span>
          </button>
        )}
      </section>

      <section className="events-section kcci-section" id="korcham">
        <div className="section-head">
          <div>
            <p className="section-number">02 / SOURCE</p>
            <img className="source-heading-logo korcham-heading-logo" src="/korcham-logo.png" alt="대한상공회의소" />
          </div>
          <div className="section-tools">
            <span className="open-badge">● 접수중</span>
            <p>예정 <strong>{currentKorchamEvents.length}</strong>개의 행사</p>
          </div>
        </div>

        {korchamLoading && <div className="status-card" role="status"><span className="loader" /><p>접수중인 대한상의 행사를 확인하고 있습니다.</p></div>}
        {!korchamLoading && korchamError && <div className="status-card error" role="alert"><span>!</span><div><h3>대한상의 데이터를 불러오지 못했습니다</h3><p>{korchamError}</p></div></div>}
        {!korchamLoading && !korchamError && currentKorchamEvents.length === 0 && <div className="status-card empty"><span>0</span><p>현재 접수중인 예정 행사가 없습니다.</p></div>}

        <div className="kcci-grid">
          {currentKorchamEvents.map((event, index) => (
            <a className="kcci-card" href={event.detailUrl} target="_blank" rel="noreferrer" key={event.id}>
              <div className="kcci-card-top"><span>접수중</span><b>{String(index + 1).padStart(2, "0")}</b></div>
              <h3>{event.title}</h3>
              <div className="kcci-date"><span>행사일자</span><strong>{event.date}</strong></div>
              <div className="kcci-link">행사 페이지로 이동 <span>↗</span></div>
            </a>
          ))}
        </div>
      </section>

      <section className="events-section kweia-section" id="kweia">
        <div className="section-head">
          <div><p className="section-number">03 / SOURCE</p><h2>한국풍력산업협회</h2></div>
          <div className="section-tools"><span className="open-badge">협회행사</span><p>최근 <strong>{currentKweiaEvents.length}</strong>개의 행사</p></div>
        </div>
        {kweiaLoading && <div className="status-card" role="status"><span className="loader" /><p>한국풍력산업협회 행사를 확인하고 있습니다.</p></div>}
        {!kweiaLoading && kweiaError && <div className="status-card error" role="alert"><span>!</span><div><h3>한국풍력산업협회 데이터를 불러오지 못했습니다.</h3><p>{kweiaError}</p></div></div>}
        {!kweiaLoading && !kweiaError && currentKweiaEvents.length === 0 && <div className="status-card empty"><span>0</span><p>현재 확인되는 협회행사가 없습니다.</p></div>}
        <div className="kcci-grid">
          {currentKweiaEvents.map((event, index) => <a className="kcci-card kweia-card" href={event.detailUrl} target="_blank" rel="noreferrer" key={event.id}>
            <div className="kcci-card-top"><span>협회행사</span><b>{String(index + 1).padStart(2, "0")}</b></div>
            <h3>{event.title}</h3>
            <div className="kcci-date"><span>게시일·행사일</span><strong>{event.date}</strong></div>
            <div className="kcci-link">한국풍력산업협회에서 보기 <span>↗</span></div>
          </a>)}
        </div>
      </section>

      <section className="events-section kpx-section" id="kpx">
        <div className="section-head">
          <div><p className="section-number">04 / SOURCE</p><div className="source-title-with-logo"><img src="/kpx-logo.svg" alt="KPX 전력거래소" /></div></div>
          <div className="section-tools"><span className="open-badge">공지사항</span><p>최근 <strong>{currentKpxEvents.length}</strong>개 게시물</p></div>
        </div>
        {kpxLoading && <div className="status-card" role="status"><span className="loader" /><p>전력거래소 공지사항을 확인하고 있습니다.</p></div>}
        {!kpxLoading && kpxError && <div className="status-card error" role="alert"><span>!</span><div><h3>전력거래소 데이터를 불러오지 못했습니다.</h3><p>{kpxError}</p></div></div>}
        <div className="kcci-grid kpx-grid">{currentKpxEvents.map((event,index)=><a className="kcci-card kpx-card" href={event.detailUrl} target="_blank" rel="noreferrer" key={event.id}><div className="kcci-card-top"><span>KPX 공지</span><b>{String(index+1).padStart(2,"0")}</b></div><h3>{event.title}</h3><div className="kcci-date"><span>등록일</span><strong>{event.date}</strong></div><div className="kcci-link">전력거래소에서 보기 <span>↗</span></div></a>)}</div>
      </section>

      <ClimateSourceSection id="climateforum" number="05" title="국회기후변화포럼" events={filteredClimateForumEvents} loading={climateLoading} error={climateError} />
      <ClimateSourceSection id="pcccr" number="06" title="기후위기위원회" events={filteredPcccrEvents} loading={climateLoading} error={climateError} />

      <footer>
        <a className="brand footer-logo" href="#top"><img src="/gs-enr-logo.png" alt="GS E&R" /></a>
        <p>정책과 비즈니스가 만나는 순간을<br />가장 먼저 발견하세요.</p>
        <div><span>DATA SOURCES</span><a href="https://open.assembly.go.kr" target="_blank" rel="noreferrer">열린국회정보 ↗</a><a href="https://www.korcham.net/nCham/Service/Event/appl/KcciNewsList.asp" target="_blank" rel="noreferrer">대한상공회의소 ↗</a><a href="https://www.kweia.or.kr/bbs/board.php?bo_table=notice&sca=%ED%98%91%ED%9A%8C%ED%96%89%EC%82%AC" target="_blank" rel="noreferrer">한국풍력산업협회 ↗</a><a href="https://www.kpx.or.kr/board.es?mid=a11201000000&bid=0042" target="_blank" rel="noreferrer">전력거래소 ↗</a><a href="https://www.climateforum.or.kr/event" target="_blank" rel="noreferrer">국회기후변화포럼 ↗</a><a href="https://www.pcccr.go.kr/base/board/list?boardManagementNo=56&menuLevel=2&menuNo=150" target="_blank" rel="noreferrer">국가기후위기대응위원회 ↗</a></div>
        <small>© 2026 AGENDA NOW</small>
      </footer>
    </main>
  );
}
