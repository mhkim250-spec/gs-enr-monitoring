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
  const matchedRows = Array.from(
    html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi),
    (match) => match[1],
  );
  const rows = matchedRows.length ? matchedRows : [html];

  for (const row of rows) {
    for (const anchor of row.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const attributes = anchor[1];
      const href =
        attributes.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
      const normalizedHref = href
        .replace(/&amp;/gi, "&")
        .replace(/&amp;/gi, "&");
      const listNo =
        normalizedHref.match(/[?&]list_no=(\d+)/i)?.[1] ??
        attributes.match(/goView\s*\(\s*['"]?(\d+)/i)?.[1];

      if (!listNo || seen.has(listNo)) continue;

      const bid = normalizedHref.match(/[?&]bid=([^&]+)/i)?.[1];
      if (bid && bid !== "0042") continue;

      const title = clean(anchor[2]).replace(/^새글\s*/, "");
      if (!title) continue;

      const detailUrl = new URL(
        normalizedHref ||
          "/board.es?mid=a11201000000&bid=0042&act=view&list_no=" + listNo,
        SOURCE_URL,
      );
      detailUrl.searchParams.set("mid", "a11201000000");
      detailUrl.searchParams.set("bid", "0042");
      detailUrl.searchParams.set("act", "view");
      detailUrl.searchParams.set("list_no", listNo);

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

      if (events.length >= MAX_EVENTS) return events;
    }
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
    const sourceUrl = new URL(SOURCE_URL);
    sourceUrl.searchParams.set("nPage", "1");
    sourceUrl.searchParams.set("_", Date.now().toString());

    const response = await fetch(sourceUrl, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: "https://www.kpx.or.kr/",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error("전력거래소가 " + response.status + " 상태를 반환했습니다.");
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
