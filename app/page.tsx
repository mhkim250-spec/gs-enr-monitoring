"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function Home() {
  const [events, setEvents] = useState<AssemblyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(6);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/events", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "행사 정보를 불러오지 못했습니다.");
        setEvents(data.events || []);
      })
      .catch((reason) => {
        if (reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ko");
    if (!needle) return events;
    return events.filter((event) =>
      [event.title, event.host, event.location, ...event.keywords]
        .join(" ")
        .toLocaleLowerCase("ko")
        .includes(needle),
    );
  }, [events, query]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="어젠다 홈">AGENDA<span>·</span>NOW</a>
        <nav aria-label="주요 메뉴">
          <a className="active" href="#assembly">국회</a>
          <span className="coming">다음 소스 준비 중</span>
        </nav>
        <div className="live"><i /> 매일 업데이트</div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">PUBLIC AFFAIRS · EVENT INTELLIGENCE</div>
        <h1>놓치지 말아야 할<br /><em>정책의 순간들.</em></h1>
        <div className="hero-bottom">
          <p>국회에 흩어진 행사 중 에너지·기후·산업 의제와<br />연결된 일정만 선별해 한곳에 모았습니다.</p>
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
            <h2>국회</h2>
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

      <footer>
        <a className="brand inverse" href="#top">AGENDA<span>·</span>NOW</a>
        <p>정책과 비즈니스가 만나는 순간을<br />가장 먼저 발견하세요.</p>
        <div><span>DATA SOURCE</span><a href="https://open.assembly.go.kr" target="_blank" rel="noreferrer">열린국회정보 ↗</a></div>
        <small>© 2026 AGENDA NOW</small>
      </footer>
    </main>
  );
}
