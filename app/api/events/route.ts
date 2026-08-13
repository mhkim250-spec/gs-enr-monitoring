import { NextResponse } from "next/server";
import { cachedSourceData, getCachedSourceData, saveSourceData } from "../source-cache";
export const dynamic = "force-dynamic";

const KEYWORDS = ["탄소","에너지","NDC","배출권","PPA","분산에너지","수소","특구","원전","석탄","전력","LNG","전기","전기요금","SMP","REC","열병합","송전","배전","계통","ESS","출력제어","열요금","데이터센터","RE100","에너지 고속도로","온실가스","신재생","산업안전","탄소중립","전력망","공시","지속가능","집단에너지","VPP","EMS","에너지 플랫폼","디지털 트윈","CBAM","직접전력거래","송배전 요금","ESG 공시","공급망 실사","CCUS","Scope 3","유연성 자원","전력 계통 보강","AI","메가"];
const EXCLUDED_TITLE_WORDS = ["로봇", "음악", "고등"];
type RawEvent = Record<string, unknown>;

const text = (row: RawEvent, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
    if (typeof value === "string" || typeof value === "number") return String(value).trim();
  }
  return "";
};

function extractRows(payload: unknown): RawEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  // 열린국회정보의 데이터셋 키는 서비스에 따라 달라질 수 있다.
  // 특정 키 이름을 전제로 하지 않고 최상위 값의 row 배열을 찾는다.
  for (const value of Object.values(root)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && Array.isArray((item as Record<string, unknown>).row)) {
          return (item as { row: RawEvent[] }).row;
        }
      }
    } else if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).row)) {
      return (value as { row: RawEvent[] }).row;
    }
  }
  if (Array.isArray(root.row)) return root.row as RawEvent[];
  return [];
}

const dateKey = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(0, 8) : "00000000";
};

function apiResponseSummary(payload: unknown) {
  if (!payload || typeof payload !== "object") return "응답 본문이 비어 있습니다.";
  const root = payload as Record<string, unknown>;
  const result = root.RESULT;
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    return [record.CODE, record.MESSAGE].filter(Boolean).join(" · ") || "RESULT 응답에 코드가 없습니다.";
  }
  for (const value of Object.values(root)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const head = (item as Record<string, unknown>).head;
      if (!Array.isArray(head)) continue;
      const resultItem = head.find((entry) => entry && typeof entry === "object" && "RESULT" in (entry as Record<string, unknown>));
      const nested = resultItem && (resultItem as Record<string, unknown>).RESULT;
      if (nested && typeof nested === "object") {
        const record = nested as Record<string, unknown>;
        return [record.CODE, record.MESSAGE].filter(Boolean).join(" · ");
      }
    }
  }
  return `최상위 항목: ${Object.keys(root).join(", ") || "없음"}`;
}

export async function GET(request: Request) {
  if (!new URL(request.url).searchParams.has("refresh")) {
    const cached = await getCachedSourceData("assembly");
    if (cached) return NextResponse.json(cached, { headers:{ "Cache-Control":"private, no-store" } });
  }
  const key = process.env.ASSEMBLY_API_KEY;
  if (!key) return NextResponse.json({ error: "국회 API 키가 설정되지 않았습니다." }, { status: 503 });
  try {
    const base = "https://open.assembly.go.kr/portal/openapi/nfcoioopazrwmjrgs";
    const cleanKey = key.trim();
    // 열린국회정보는 한 번에 큰 pSize를 요청하면 빈 결과를 돌려주는
    // 경우가 있어, 100건씩 여러 페이지를 안정적으로 수집한다.
    const pages: Array<{ rows: RawEvent[]; payload: unknown }> = [];
    const pageErrors: string[] = [];
    // Avoid overwhelming the upstream service with concurrent requests. A
    // failed later page must not discard rows already collected successfully.
    for (let pageIndex = 1; pageIndex <= 10; pageIndex += 1) {
      const url = new URL(base);
      url.searchParams.set("KEY", cleanKey);
      url.searchParams.set("Type", "json");
      url.searchParams.set("pIndex", String(pageIndex));
      url.searchParams.set("pSize", "100");
      try {
        const response = await fetch(url, {
          headers: { Accept: "application/json, text/plain, */*", "User-Agent": "AgendaNow/1.0" },
          cache: "no-store",
        });
        if (!response.ok) {
          pageErrors.push(`${pageIndex}페이지 HTTP ${response.status}`);
          continue;
        }
        const payload = await response.json();
        const pageRows = extractRows(payload);
        pages.push({ rows: pageRows, payload });
        if (pageRows.length === 0 && pageIndex > 1) break;
      } catch (pageError) {
        pageErrors.push(`${pageIndex}페이지 ${pageError instanceof Error ? pageError.message : "요청 실패"}`);
      }
    }
    const rows = pages.flatMap((page) => page.rows);
    if (!rows.length) throw new Error(`국회 API 응답에서 행사 목록을 찾지 못했습니다. ${apiResponseSummary(pages[0]?.payload)}${pageErrors.length ? ` · ${pageErrors.join(", ")}` : ""}`);
    const events = rows.map((row, index) => {
      const title = text(row, "TITLE");
      const description = text(row, "DESCRIPTION");
      const searchable = `${title} ${description}`.toLocaleLowerCase("ko");
      const keywords = KEYWORDS.filter((keyword) => searchable.includes(keyword.toLocaleLowerCase("ko")));
      return { id:text(row,"ID","EVENT_ID")||`${dateKey(text(row,"SDATE"))}-${index}`, title, date:text(row,"SDATE"), time:text(row,"STIME"), host:text(row,"NAME"), location:text(row,"LOCATION"), posterUrl:text(row,"IMGLINK","IMG_LINK"), detailUrl:text(row,"LINK"), keywords };
    }).filter((event) => {
      const normalized = event.title.toLocaleLowerCase("ko");
      return event.title && event.keywords.length > 0 && !EXCLUDED_TITLE_WORDS.some((word) => normalized.includes(word));
    }).sort((a,b) => dateKey(b.date).localeCompare(dateKey(a.date)));
    return NextResponse.json(await saveSourceData("assembly", { events, total:events.length, rawTotal:rows.length, pageErrors }), { headers:{ "Cache-Control":"public, s-maxage=1800, stale-while-revalidate=86400" } });
  } catch (error) {
    const cached = await cachedSourceData("assembly", error);
    return cached ? NextResponse.json(cached) : NextResponse.json({ error:error instanceof Error ? error.message : "국회 API 연결에 실패했습니다." }, { status:502 });
  }
}
