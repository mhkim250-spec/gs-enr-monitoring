import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type SharedEvent={source?:string;date?:string;title?:string;url?:string;host?:string;location?:string};

export async function POST(request:Request){
  const store=await cookies();
  if(store.get("agenda_session")?.value!=="authenticated")return NextResponse.json({error:"로그인이 필요합니다."},{status:401});
  const token=process.env.NOTION_TOKEN;const parentPageId=process.env.NOTION_PARENT_PAGE_ID;
  if(!token||!parentPageId)return NextResponse.json({error:"Notion 연결 설정이 필요합니다. 관리자에게 문의해 주세요."},{status:503});
  const body=await request.json().catch(()=>({events:[]}));
  const events=(Array.isArray(body.events)?body.events:[]).slice(0,30) as SharedEvent[];
  if(!events.length)return NextResponse.json({error:"저장할 행사를 선택해 주세요."},{status:400});
  const reportDate=new Date().toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"});
  const markdown=[`# GS E&R 주요 대관 일정`,``, `저장일: ${reportDate}`,``,...events.flatMap((event,index)=>[`## ${index+1}. ${event.title||"행사"}`,`- 일자: ${event.date||"확인 필요"}`,`- 출처: ${event.source||""}`,`- 주최: ${event.host||""}`,`- 장소: ${event.location||""}`,`- 원문: ${event.url||""}`,``])].join("\n");
  const response=await fetch("https://api.notion.com/v1/pages",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json","Notion-Version":"2026-03-11"},body:JSON.stringify({parent:{page_id:parentPageId},properties:{title:{title:[{type:"text",text:{content:`GS E&R 주요 대관 일정 · ${reportDate}`}}]}},markdown})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)return NextResponse.json({error:result.message||"Notion 저장에 실패했습니다."},{status:response.status});
  return NextResponse.json({ok:true,url:result.url});
}
