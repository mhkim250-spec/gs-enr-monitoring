import { NextResponse } from "next/server";
import { cachedSourceData, getCachedSourceData, saveSourceData } from "../source-cache";

export const dynamic = "force-dynamic";

const SOURCE_URL = "https://www.kpx.or.kr/board.es?mid=a11201000000&bid=0042";
const MAX_EVENTS = 5;

const clean = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

type KpxEvent = {
  id: string;
  title: string;
  date: string;
  detailUrl: string;
};

function parseKpxEvents(html: string): KpxEvent[] {
  const seen = new Set<string>();
  const events: KpxEvent[] = [];

  for (const match of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1];

    for (const anchor of row.matchAll(
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    )) {
      try {
        const detailUrl = new URL(
          anchor[1].replace(/&amp;/gi, "&"),
          SOURCE_URL,
        );
        const listNo = detailUrl.searchParams.get("list_no");

        if (
          !detailUrl.pathname.endsWith("/board.es") ||
          detailUrl.searchParams.get("act") !== "view" ||
          detailUrl.searchParams.get("bid") !== "0042" ||
          !listNo ||
          seen.has(listNo)
        ) {
          continue;
        }

        const title = clean(anchor[2]).replace(/^새글\s*/, "");
        if (!title) continue;

        const date =
          row.match(/20\d{2}[./-]\d{1,2}[./-]\d{1,2}/)?.[0] ??
          "등록일 확인";

        seen.add(listNo);
        events.push({
          id: listNo,
          title,
          date,
          detailUrl: detailUrl.toString(),
        });
        break;
      } catch {
        // Ignore unrelated or malformed links in the row.
      }
    }

    if (events.length >= MAX_EVENTS) break;
  }

  return events;
}

export async function GET(request: Request) {
  if (!new URL(request.url).searchParams.has("refresh")) {
    const cached = await getCachedSourceData("kpx");
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
  }

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
        Referer: "https://www.kpx.or.kr/",
        "User-Agent":
          "Mozilla/5.0 (compatible; GS-ENR-Monitor/1.0; +https://gs-enr-monitoring.mhkim250.workers.dev/)",
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`전력거래소가 ${response.status} 상태를 반환했습니다.`);
    }

    const html = await response.text();
    const events = parseKpxEvents(html);

    if (!events.length) {
      throw new Error("전력거래소 게시물 형식을 확인할 수 없습니다.");
    }

    return NextResponse.json(
      await saveSourceData("kpx", { events, total: events.length }),
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=1800, stale-while-revalidate=7200",
        },
      },
    );
  } catch (error) {
    const cached = await cachedSourceData("kpx", error);
    return cached
      ? NextResponse.json(cached)
      : NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "전력거래소 연결에 실패했습니다.",
          },
          { status: 502 },
        );
  }
}
