import { NextResponse } from "next/server";
import { cachedSourceData, getCachedSourceData, saveSourceData } from "../source-cache";
export const dynamic = "force-dynamic";

const KEYWORDS = ["탄소","에너지","NDC","배출권","PPA","분산에너지","수소","특구","원전","석탄","전력","LNG","전기","전기요금","SMP","REC","열병합","송전","배전","계통","ESS","출력제어","열요금","데이터센터","RE100","에너지 고속도로","온실가스","신재생","산업안전","탄소중립","전력망","공시","지속가능","집단에너지","VPP","EMS","에너지 플랫폼","디지털 트윈","CBAM","직접전력거래","송배전 요금","ESG 공시","공급망 실사","CCUS","Scope 3","유연성 자원","전력 계통 보강","AI","메가"];
const EXCLUDED_TITLE_WORDS = ["교육", "음악"];
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
  const container = root.nfcoioopazrwmjrgs;
  if (Array.isArray(container)) {
    for (const segment of container) {
      if (segment && typeof segment === "object" && Array.isArray((segment as Record<string, unknown>).row)) return (segment as { row: RawEvent[] }).row;
    }
  }
  if (container && typeof container === "object" && Array.isArray((container as Record<string, unknown>).row)) return (container as { row: RawEvent[] }).row;
  if (Array.isArray(root.row)) return root.row as RawEvent[];
  return [];
}

const dateKey = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(0, 8) : "00000000";
};

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
    const standard = new URL(base);
    standard.searchParams.set("KEY", cleanKey);
    standard.searchParams.set("Type", "json");
    standard.searchParams.set("pIndex", "1");
    // The API's first 100 rows can consist entirely of older events. Request a
    // wider window, then sort and filter locally so current events are not lost.
    standard.searchParams.set("pSize", "1000");
    const candidates = [
      standard.toString(),
      `${base}?KEY=${encodeURIComponent(cleanKey)}%26Type=json%26pIndex=1%26pSize=1000`,
    ];
    let payload: unknown = null;
    let lastStatus = 502;
    for (const candidate of candidates) {
      const response = await fetch(candidate, {
        headers: { Accept: "application/json, text/plain, */*", "User-Agent": "AgendaNow/1.0" },
        cache: "no-store",
      });
      lastStatus = response.status;
      if (response.ok) { payload = await response.json(); break; }
    }
    if (!payload) throw new Error(`국회 API가 ${lastStatus} 상태를 반환했습니다.`);
    const rows = extractRows(payload);
    const events = rows.map((row, index) => {
      const title = text(row, "TITLE");
      const description = text(row, "DESCRIPTION");
      const host = text(row, "NAME");
      const searchable = `${title} ${description} ${host}`.toLocaleLowerCase("ko");
      const keywords = KEYWORDS.filter((keyword) => searchable.includes(keyword.toLocaleLowerCase("ko")));
      return { id:text(row,"ID","EVENT_ID")||`${dateKey(text(row,"SDATE"))}-${index}`, title, date:text(row,"SDATE"), time:text(row,"STIME"), host:text(row,"NAME"), location:text(row,"LOCATION"), posterUrl:text(row,"IMGLINK","IMG_LINK"), detailUrl:text(row,"LINK"), keywords };
    }).filter((event) => {
      const normalized = event.title.toLocaleLowerCase("ko");
      return event.title && event.keywords.length > 0 && !EXCLUDED_TITLE_WORDS.some((word) => normalized.includes(word));
    }).sort((a,b) => dateKey(b.date).localeCompare(dateKey(a.date)));
    return NextResponse.json(await saveSourceData("assembly", { events, total:events.length }), { headers:{ "Cache-Control":"public, s-maxage=1800, stale-while-revalidate=86400" } });
  } catch (error) {
    const cached = await cachedSourceData("assembly", error);
    return cached ? NextResponse.json(cached) : NextResponse.json({ error:error instanceof Error ? error.message : "국회 API 연결에 실패했습니다." }, { status:502 });
  }
}
