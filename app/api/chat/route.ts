import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

type Message = { role: "user" | "assistant"; content: string };
type AI = { run(model: string, input: Record<string, unknown>): Promise<{ response?: string }> };
type SourceEvent = { id?: string; title?: string; date?: string; detailUrl?: string; posterUrl?: string; previewUrl?: string };
type GroundedEvent = { source: string; date: string; title: string; url: string };
type NewsArticle = { source?: string; title?: string; url?: string; publishedAt?: string };

const GS_ENR_COMPANY_CONTEXT = [
  "- 회사 성격: 집단에너지 운영 경험을 바탕으로 민자 화력발전과 대규모 풍력발전단지를 개발·운영하는 친환경 종합발전기업입니다. (https://www.gsenr.com/overview)",
  "- 집단에너지: 반월·구미 국가산업단지에서 열병합발전으로 열과 전기를 생산·공급하고, 포천 장자일반산업단지에서도 집단에너지 사업을 운영합니다. (https://www.gsenr.com/integrated-energy)",
  "- 유류유통: 정유사나 수입사에서 석유 완제품을 구매해 주유소·대리점·산업체·일반판매소 등에 공급합니다. 석유를 직접 탐사·개발·생산하는 사업으로 설명하면 안 됩니다. (https://www.gsenr.com/oil-distribution)",
  "- 화력발전: GS동해전력이 강원도 동해시 북평국가산업단지에서 595MW 2기의 유연탄 화력발전소를 운영합니다. (https://www.gsenr.com/thermal-power)",
  "- 신재생에너지: 경북 영양군에서 총 126MW 규모의 풍력발전단지를 운영하며 풍력 중심의 재생에너지 포트폴리오를 확대하고 있습니다. (https://www.gsenr.com/renewable-energy)",
  "- 공식 자료에 근거 없이 GS E&R이 석유·천연가스·수소를 직접 개발·생산하거나, 포괄적인 에너지 전달·저장 사업을 핵심 사업으로 영위한다고 단정하지 않습니다.",
].join("\n");

function companyAnswer() {
  return [
    "GS E&R은 공식 홈페이지 기준 ‘친환경 종합발전기업’이며, 핵심 사업은 다음 4가지입니다.",
    "",
    "1. 집단에너지 — 반월·구미 국가산업단지에서 열병합발전으로 열과 전기를 생산·공급하고, 포천에서도 집단에너지 사업을 운영합니다.",
    "2. 유류유통 — 정유사나 수입사에서 석유 완제품을 구매해 주유소·대리점·산업체 등에 공급합니다.",
    "3. 화력발전 — GS동해전력이 동해시 북평국가산업단지에서 595MW 2기의 유연탄 화력발전소를 운영합니다.",
    "4. 신재생에너지 — 경북 영양군에서 총 126MW 규모의 풍력발전단지를 운영하며 풍력 중심의 재생에너지 사업을 확대하고 있습니다.",
    "",
    "중요한 구분: GS E&R의 유류유통은 석유 완제품을 구매·공급하는 사업입니다. 공식 자료에 없는 석유·천연가스·수소의 직접 개발·생산, 포괄적인 에너지 전달·저장 사업으로 확대해 설명하면 부정확합니다.",
    "",
    "공식 원문",
    "- 회사 개요: https://www.gsenr.com/overview",
    "- 집단에너지: https://www.gsenr.com/integrated-energy",
    "- 유류유통: https://www.gsenr.com/oil-distribution",
    "- 화력발전: https://www.gsenr.com/thermal-power",
    "- 신재생에너지: https://www.gsenr.com/renewable-energy",
  ].join("\n");
}

function eventTimestamp(value: string) {
  const match = value.match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()
    : Number.MAX_SAFE_INTEGER;
}

function currentTwoWeekEvents(groups: Array<{ source: string; events: SourceEvent[] }>) {
  const start = new Date();
  const dayFromMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayFromMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 13);

  return groups
    .flatMap(({ source, events }) =>
      events.map((event) => ({
        source,
        date: event.date || "",
        title: event.title || "",
        url: event.detailUrl || event.previewUrl || event.posterUrl || "",
      })),
    )
    .filter((event) => {
      const stamp = eventTimestamp(event.date);
      const weekday = new Date(stamp).getDay();
      return event.title && stamp >= start.getTime() && stamp < end.getTime() && weekday !== 0 && weekday !== 6;
    })
    .sort((a, b) => eventTimestamp(a.date) - eventTimestamp(b.date));
}

function weeklyAnswer(events: GroundedEvent[]) {
  return [
    `첫 화면에 표시된 이번 주·다음 주 행사는 총 ${events.length}건입니다.`,
    "",
    ...events.map((event, index) =>
      `${index + 1}. [${event.source}] ${event.date} — ${event.title}${event.url ? `\n   원문: ${event.url}` : ""}`,
    ),
  ].join("\n");
}

function usefulAnswer(value: string) {
  const cleaned = value
    .replace(/현재 첫 화면에 표시된 일정은 없습니다\.?/g, "")
    .replace(/현재 최신 뉴스도 없습니다\.?/g, "")
    .replace(/현재 최신 뉴스가 없습니다\.?/g, "")
    .replace(/현재 불러온 뉴스가 없습니다\.?/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || "질문하신 주제의 핵심 내용과 확인해야 할 원문을 안내해 드릴게요. 관심 기관이나 기간을 함께 적어주시면 더 구체적으로 답변할 수 있습니다.";
}

async function loadLiveContext(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const getJson = async (path: string) => {
    const response = await fetch(new URL(`${path}?chat=${Date.now()}`, request.url), {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
    });
    if (!response.ok) return {};
    return response.json() as Promise<Record<string, unknown>>;
  };

  const [assembly, korcham, kpx, kweia, climate, committee, news] = await Promise.all([
    getJson("/api/events"),
    getJson("/api/korcham"),
    getJson("/api/kpx"),
    getJson("/api/kweia"),
    getJson("/api/climate-sources"),
    getJson("/api/environment-committee"),
    getJson("/api/news"),
  ]);

  const events = currentTwoWeekEvents([
    { source: "국회", events: (assembly.events as SourceEvent[]) || [] },
    { source: "대한상의", events: (korcham.events as SourceEvent[]) || [] },
    { source: "전력거래소", events: (kpx.events as SourceEvent[]) || [] },
    { source: "풍력산업협회", events: (kweia.events as SourceEvent[]) || [] },
    { source: "기후변화포럼", events: (climate.climateForum as SourceEvent[]) || [] },
    { source: "기후위기위원회", events: (climate.pcccr as SourceEvent[]) || [] },
    { source: "기후환노위", events: (committee.schedules as SourceEvent[]) || [] },
  ]);

  const articles = ((news.groups as Array<{ articles?: NewsArticle[] }>) || [])
    .flatMap((group) => group.articles || [])
    .filter((article) => article.title && article.url)
    .slice(0, 12);

  return { events, articles };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: Message[] };
    const messages = (body.messages || [])
      .filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string",
      )
      .slice(-10)
      .map((message) => ({ ...message, content: message.content.slice(0, 800) }));

    if (!messages.length) {
      return NextResponse.json({ error: "질문을 입력해 주세요." }, { status: 400 });
    }

    const live = await loadLiveContext(request);
    const latestQuestion = [...messages].reverse().find((message) => message.role === "user")?.content || "";
    const asksForSchedule = /(이번\s*주|다음\s*주|주요\s*행사|행사\s*일정|주간\s*일정|일정\s*알려)/.test(latestQuestion);

    const asksForCompanyInfo =
      /(GS\s*E&R|지에스\s*(?:이앤알|E&R)|우리\s*회사|당사)/i.test(latestQuestion) &&
      /(소개|알려|어떤|무슨|뭐|회사|사업|하는\s*일|석유|유류|천연가스|수소|풍력|화력|집단에너지|신재생|재생에너지|발전|저장|판매|생산|개발)/i.test(latestQuestion) &&
      !/(뉴스|기사|행사|일정)/.test(latestQuestion);

    if (asksForCompanyInfo) {
      return NextResponse.json({ answer: companyAnswer() });
    }

    if (asksForSchedule && live.events.length) {
      return NextResponse.json({ answer: weeklyAnswer(live.events) });
    }

    const ai = (env as unknown as { AI?: AI }).AI;
    if (!ai) {
      return NextResponse.json(
        { error: "AI 연결을 준비 중입니다. 잠시 후 다시 시도해 주세요." },
        { status: 503 },
      );
    }

    const eventContext = live.events.length
      ? live.events.map((event) => `- [${event.source}] ${event.date} | ${event.title} | ${event.url}`).join("\n")
      : "(일정 데이터 미수신 — 이 상태를 사용자에게 그대로 말하지 말고 질문 자체에 답변할 것)";
    const newsContext = live.articles.length
      ? live.articles.map((article) => `- [${article.source || "뉴스"}] ${article.publishedAt || ""} | ${article.title} | ${article.url}`).join("\n")
      : "(뉴스 데이터 미수신 — 이 상태를 사용자에게 그대로 말하지 말고 질문 자체에 답변할 것)";

    const system = `당신은 GS E&R 대외협력 모니터링 사이트의 한국어 AI 도우미입니다.
아래 실시간 사이트 데이터만 최신 행사·뉴스의 사실 근거로 사용하세요.

[첫 화면 이번 주·다음 주 일정]
${eventContext}

[현재 최신 뉴스]
${newsContext}

[GS E&R 공식 회사 정보]
${GS_ENR_COMPANY_CONTEXT}

규칙:
1. 행사·일정 질문에는 위 일정의 실제 날짜, 출처, 행사명을 빠짐없이 구체적으로 답합니다.
2. 뉴스 질문에는 위 뉴스의 실제 매체명과 기사 제목을 사용합니다.
3. 데이터에 없는 행사, 회의, 법안, 날짜를 추측하거나 만들어내지 않습니다.
4. "현재까지 알려진 주요 정보", "다양한 논의가 진행 중" 같은 모호한 상투 문구를 사용하지 않습니다.
5. 일정·뉴스 데이터가 비어 있어도 "없습니다"라는 말로 답변을 끝내지 않습니다. 질문 자체에 유용하게 답한 뒤 확인 방법이나 필요한 추가 조건을 안내합니다.
6. 답변은 간결하되 원문 링크를 함께 제공합니다.
7. 모든 질문에서 [첫 화면 이번 주·다음 주 일정]을 먼저 검토하고, 질문과 관련 있는 실제 일정이 있으면 반드시 답변에 활용합니다.
8. 사용자가 실무에 바로 쓸 수 있도록 핵심 결론을 먼저 말하고, 구체적인 일정·뉴스 근거를 이어서 제시합니다.
9. GS E&R 회사·사업 질문에는 [GS E&R 공식 회사 정보]만 근거로 답하고, 다른 GS 계열사(GS에너지·GS칼텍스·GS EPS 등)의 사업과 혼동하지 않습니다.
10. 공식 정보에 없는 석유·천연가스·수소 직접 개발·생산, 포괄적 에너지 전달·저장 사업을 추측해 답하지 않습니다. 확인되지 않은 내용은 공식 자료에서 확인되지 않는다고 명확히 말합니다.`;

    const result = await ai.run("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: 900,
      temperature: 0.1,
    });

    const mainAnswer = result.response?.trim() || "질문에 대한 답변을 만들지 못했습니다.";
    const scheduleReference = live.events.length
      ? [
          "",
          "관련 주요 대관 일정",
          ...live.events.slice(0, 5).map(
            (event) => `- [${event.source}] ${event.date} — ${event.title}${event.url ? `\n  원문: ${event.url}` : ""}`,
          ),
        ].join("\n")
      : "";

    return NextResponse.json({
      answer: usefulAnswer(`${mainAnswer}${scheduleReference}`),
    });
  } catch {
    return NextResponse.json({ error: "AI 답변 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

