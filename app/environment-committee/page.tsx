"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "../sidebar";

type Schedule = {
  id: string;
  date: string;
  title: string;
  previewUrl: string;
  downloadUrl: string;
};

type Legislation = {
  id: string;
  title: string;
  period: string;
  url: string;
};

export default function CommitteePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [legislation, setLegislation] = useState<Legislation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError("");
    try {
      const response = await fetch(
        refresh ? `/api/environment-committee?refresh=${Date.now()}` : "/api/environment-committee",
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "위원회 정보를 불러오지 못했습니다.");
      setSchedules(data.schedules || []);
      setLegislation(data.legislation || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "위원회 연결 실패");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="committee-page site-content">
      <Sidebar active="envcommittee" />
      <header className="topbar">
        <div className="topbar-title"><b>기후에너지환경노동위원회</b></div>
        <button className="refresh-button" onClick={() => void load(true)} disabled={refreshing}>
          {refreshing ? "업데이트 중" : "지금 업데이트"}
        </button>
      </header>
      <section className="committee-content">
        <header className="committee-hero">
          <img src="/assembly-environment-logo.webp" alt="기후에너지환경노동위원회" />
          <div>
            <span>NATIONAL ASSEMBLY COMMITTEE</span>
            <h1>위원회 일정과<br />입법예고</h1>
            <p>회의 일정과 관련 자료, 현재 진행 중인 입법예고를 한곳에서 확인하세요.</p>
          </div>
        </header>
        {loading && <div className="committee-state"><span className="loader" />위원회 정보를 불러오고 있습니다.</div>}
        {error && <div className="committee-state error">{error}</div>}
        <div className="committee-sections">
          <section className="committee-panel schedule-panel">
            <header>
              <div><span>COMMITTEE SCHEDULE</span><h2>위원회 일정</h2></div>
              <a href="https://environment.na.go.kr:444/cmmit/schl/cmitSchl/schlList.do?menuNo=2000048" target="_blank" rel="noreferrer">전체 일정 ↗</a>
            </header>
            <div className="schedule-list">
              {schedules.map((item, index) => (
                <article key={item.id}>
                  <div className="schedule-date"><small>회의일자</small><strong>{item.date}</strong></div>
                  <div><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3></div>
                  <nav>
                    <a href={item.previewUrl} target="_blank" rel="noreferrer">미리보기</a>
                    <a className="download" href={item.downloadUrl} target="_blank" rel="noreferrer" download>다운로드</a>
                  </nav>
                </article>
              ))}
            </div>
          </section>
          <section className="committee-panel legislation-panel">
            <header>
              <div><span>LEGISLATION NOTICE</span><h2>입법예고</h2></div>
              <a href="https://environment.na.go.kr:444/cmmit/lgsltpa/lgsltpa/ongoingList.do?menuNo=2000082" target="_blank" rel="noreferrer">전체보기 ↗</a>
            </header>
            <ol>
              {legislation.map((item, index) => (
                <li key={item.id}>
                  <div className="legislation-copy">
                    <div><b>{String(index + 1).padStart(2, "0")}</b><span>{item.period || "진행 중"}</span></div>
                    <h3>{item.title}</h3>
                  </div>
                  <a className="legislation-link" href={item.url} target="_blank" rel="noreferrer">
                    바로가기 <span aria-hidden="true">→</span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </section>
    </main>
  );
}
