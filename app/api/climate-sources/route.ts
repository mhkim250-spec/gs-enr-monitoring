import { NextResponse } from "next/server";
import { cachedSourceData, getCachedSourceData, saveSourceData } from "../source-cache";

export const dynamic = "force-dynamic";

const clean = (value: string) => value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
const absolute = (base: string, path: string) => { try { return new URL(path, base).toString(); } catch { return ""; } };

type ClimateEvent = { id:string; title:string; date:string; location:string; host:string; posterUrl:string; detailUrl:string };

function parseClimateForum(html: string): ClimateEvent[] {
  const base = "https://www.climateforum.or.kr";
  const map = new Map<string, Partial<ClimateEvent>>();
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']*\/event\/\d+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const detailUrl = absolute(base, match[1]);
    const body = match[2];
    const current = map.get(detailUrl) || { detailUrl, id: detailUrl.split("/").pop() };
    const img = body.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    const title = clean(body);
    if (img) current.posterUrl = absolute(base, img);
    if (title) current.title = title;
    map.set(detailUrl, current);
  }
  return [...map.values()].filter((item) => item.title).slice(0, 9).map((item) => {
    const title = item.title || "";
    const md = title.match(/\((\d{1,2})\/(\d{1,2})\)\s*$/);
    const yy = item.posterUrl?.match(/\/data\/editor\/(\d{2})\d{2}\//)?.[1];
    const date = md ? `${yy ? `20${yy}` : new Date().getFullYear()}.${md[1].padStart(2,"0")}.${md[2].padStart(2,"0")}` : "상세 페이지 참조";
    return { id:item.id || item.detailUrl || title, title, date, location:"상세 페이지 참조", host:"국회기후변화포럼", posterUrl:item.posterUrl || "", detailUrl:item.detailUrl || base };
  });
}

function parsePcccr(html: string): ClimateEvent[] {
  const base = "https://www.pcccr.go.kr";
  const events: ClimateEvent[] = [];
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']*\/base\/board\/read\?[^"']*boardManagementNo=56[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const body = match[2];
    const details = clean(body).match(/ㆍ제목\s*:\s*(.*?)\s*ㆍ일시\s*:\s*(.*?)\s*ㆍ장소\s*:\s*(.*?)\s*ㆍ주최\s*:\s*(.*)$/);
    if (!details) continue;
    const poster = body.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "";
    const detailUrl = absolute(base, match[1]);
    events.push({ id:new URL(detailUrl).searchParams.get("boardNo") || detailUrl, title:details[1], date:details[2], location:details[3], host:details[4], posterUrl:absolute(base, poster), detailUrl });
  }
  return events.slice(0, 9);
}

export async function GET(request: Request) {
  if (!new URL(request.url).searchParams.has("refresh")) {
    const cached = await getCachedSourceData("climate");
    if (cached) return NextResponse.json(cached, { headers:{ "Cache-Control":"private, no-store" } });
  }
  try {
    const [forumResponse, pcccrResponse] = await Promise.all([
      fetch("https://www.climateforum.or.kr/event", { headers:{ "User-Agent":"GS-ENR-Monitor/1.0" }, cache:"no-store" }),
      fetch("https://www.pcccr.go.kr/base/board/list?boardManagementNo=56&menuLevel=2&menuNo=150", { headers:{ "User-Agent":"GS-ENR-Monitor/1.0" }, cache:"no-store" }),
    ]);
    if (!forumResponse.ok || !pcccrResponse.ok) throw new Error("기후 행사 원문 사이트 연결에 실패했습니다.");
    const [forumHtml, pcccrHtml] = await Promise.all([forumResponse.text(), pcccrResponse.text()]);
    return NextResponse.json(await saveSourceData("climate", { climateForum:parseClimateForum(forumHtml), pcccr:parsePcccr(pcccrHtml) }), { headers:{ "Cache-Control":"public, s-maxage=1800, stale-while-revalidate=7200" } });
  } catch (error) {
    const cached = await cachedSourceData("climate", error);
    return cached ? NextResponse.json(cached) : NextResponse.json({ error:error instanceof Error ? error.message : "기후 행사 정보를 불러오지 못했습니다." }, { status:502 });
  }
}
