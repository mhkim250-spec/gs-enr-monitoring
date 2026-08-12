import { NextResponse } from "next/server";
import { cachedSourceData, getCachedSourceData, saveSourceData } from "../source-cache";

export const dynamic = "force-dynamic";
const SOURCE_URL="https://www.kpx.or.kr/board.es?mid=a11201000000&bid=0042";
const clean=(value:string)=>value.replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g," ").trim();

export async function GET(request:Request){
  if(!new URL(request.url).searchParams.has("refresh")){
    const cached=await getCachedSourceData("kpx");
    if(cached) return NextResponse.json(cached,{headers:{"Cache-Control":"private, no-store"}});
  }
  try{
    const response=await fetch(SOURCE_URL,{headers:{Accept:"text/html","User-Agent":"GS-ENR-Monitor/1.0"},cache:"no-store"});
    if(!response.ok) throw new Error(`전력거래소가 ${response.status} 상태를 반환했습니다.`);
    const html=await response.text();
    const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    const events=rows.flatMap((match,index)=>{
      const row=match[1];
      const link=row.match(/<a[^>]+href=["']([^"']*act=view[^"']*bid=0042[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
      if(!link) return [];
      const title=clean(link[2]).replace(/^새글\s*/,"");
      const date=row.match(/20\d{2}[./-]\d{1,2}[./-]\d{1,2}/)?.[0]||"등록일 확인";
      const detailUrl=new URL(link[1].replace(/&amp;/gi,"&"),SOURCE_URL).toString();
      const id=new URL(detailUrl).searchParams.get("list_no")||`kpx-${index}`;
      return title?[{id,title,date,detailUrl}]:[];
    }).slice(0,5);
    if(!events.length) throw new Error("전력거래소 게시물 형식을 확인할 수 없습니다.");
    return NextResponse.json(await saveSourceData("kpx",{events,total:events.length}),{headers:{"Cache-Control":"public, s-maxage=1800, stale-while-revalidate=7200"}});
  }catch(error){
    const cached=await cachedSourceData("kpx",error);
    return cached?NextResponse.json(cached):NextResponse.json({error:error instanceof Error?error.message:"전력거래소 연결에 실패했습니다."},{status:502});
  }
}
