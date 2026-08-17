import { NextResponse } from "next/server";
import { cachedSourceData, getCachedSourceData, saveSourceData } from "../source-cache";

export const dynamic = "force-dynamic";

const SOURCE_URL = "https://www.korcham.net/nCham/Service/Event/appl/KcciNewsList.asp";
const EXCLUDED_EVENT_TERMS = [
  "KBCSD 리더스 포럼",
  "SUSTAINABLE BUSINESS INNOVATION FORUM",
];

const withoutExcludedEvents = (data: Record<string, unknown>) => {
  const events = ((data.events as Array<{ title?: string }>) || []).filter(
    (event) => !EXCLUDED_EVENT_TERMS.some((term) => event.title?.includes(term)),
  );
  return { ...data, events, total: events.length };
};

const clean = (value: string) => value
  .replace(/<br\s*\/?>/gi, " ~ ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, " ")
  .trim();

export async function GET(request: Request) {
  if (!new URL(request.url).searchParams.has("refresh")) {
    const cached = await getCachedSourceData("korcham");
    if (cached) return NextResponse.json(withoutExcludedEvents(cached), { headers:{ "Cache-Control":"private, no-store" } });
  }
  try {
    const response = await fetch(SOURCE_URL, {
      headers: { Accept: "text/html", "User-Agent": "GS-ENR-Monitor/1.0" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`대한상의가 ${response.status} 상태를 반환했습니다.`);
    const html = new TextDecoder("euc-kr").decode(await response.arrayBuffer());
    const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    const events = rows.flatMap((match, index) => {
      const row = match[1];
      if (!/접수중/.test(row)) return [];
      const linkMatch = row.match(/<a[^>]+href=["']javascript:goDetail\(([^)]*)\);?["'][^>]*>([\s\S]*?)<\/a>/i);
      const dateMatch = row.match(/<p[^>]*class=["'][^"']*date[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
      if (!linkMatch || !dateMatch) return [];
      const args = [...linkMatch[1].matchAll(/'([^']*)'/g)].map((item) => item[1]);
      const directUrl = args[4];
      const detailUrl = directUrl || SOURCE_URL;
      const title = clean(linkMatch[2]);
      if (!title || EXCLUDED_EVENT_TERMS.some((term) => title.includes(term))) return [];
      return [{ id: args[1] || `korcham-${index}`, title, date: clean(dateMatch[1]), detailUrl }];
    });
    return NextResponse.json(await saveSourceData("korcham", { events, total: events.length }), {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch (error) {
    const cached = await cachedSourceData("korcham", error);
    return cached ? NextResponse.json(withoutExcludedEvents(cached)) : NextResponse.json({ error: error instanceof Error ? error.message : "대한상의 행사 연결에 실패했습니다." }, { status: 502 });
  }
}
