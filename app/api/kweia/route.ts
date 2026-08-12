import { NextResponse } from "next/server";
import { cachedSourceData, getCachedSourceData, saveSourceData } from "../source-cache";

export const dynamic = "force-dynamic";

const SOURCE_URL = "https://www.kweia.or.kr/bbs/board.php?bo_table=notice&sca=%ED%98%91%ED%9A%8C%ED%96%89%EC%82%AC";

const clean = (value: string) => value
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, " ")
  .trim();

export async function GET(request: Request) {
  if (!new URL(request.url).searchParams.has("refresh")) {
    const cached = await getCachedSourceData("kweia");
    if (cached) return NextResponse.json(cached, { headers:{ "Cache-Control":"private, no-store" } });
  }
  try {
    const response = await fetch(SOURCE_URL, {
      headers: { Accept: "text/html", "User-Agent": "GS-ENR-Monitor/1.0" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`한국풍력산업협회가 ${response.status} 상태를 반환했습니다.`);
    const html = await response.text();
    const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    const seen = new Set<string>();
    const events = rows.flatMap((match, index) => {
      const row = match[1];
      const link = row.match(/<a[^>]+href=["']([^"']*board\.php\?[^"']*bo_table=notice[^"']*wr_id=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!link) return [];
      const id = link[2];
      if (seen.has(id)) return [];
      const title = clean(link[3]).replace(/^\[[^\]]+\]\s*/, "");
      if (!title) return [];
      seen.add(id);
      const date = row.match(/(?:20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}|\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2})/)?.[0] || "상세 페이지 참조";
      return [{ id: id || `kweia-${index}`, title, date, detailUrl: new URL(link[1].replace(/&amp;/gi, "&"), SOURCE_URL).toString() }];
    }).slice(0, 12);
    return NextResponse.json(await saveSourceData("kweia", { events, total: events.length }), { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=7200" } });
  } catch (error) {
    const cached = await cachedSourceData("kweia", error);
    return cached ? NextResponse.json(cached) : NextResponse.json({ error: error instanceof Error ? error.message : "한국풍력산업협회 행사 연결에 실패했습니다." }, { status: 502 });
  }
}
