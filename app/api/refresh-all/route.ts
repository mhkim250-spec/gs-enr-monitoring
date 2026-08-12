import {NextResponse} from "next/server";
export const dynamic="force-dynamic";

async function refresh(request:Request){
 const origin=new URL(request.url).origin;const stamp=Date.now();const paths=["/api/events","/api/korcham","/api/kweia","/api/climate-sources","/api/kpx","/api/mcee","/api/news"];
 const results=await Promise.allSettled(paths.map(async path=>{const response=await fetch(`${origin}${path}?refresh=${stamp}`,{cache:"no-store"});if(!response.ok)throw new Error(`${path} ${response.status}`);const data=await response.json();return {path,status:data.sourceStatus?.status||"ok",count:data.events?.length||data.groups?.reduce((sum:number,g:{articles?:unknown[]})=>sum+(g.articles?.length||0),0)||0};}));
 const sources=results.map((result,index)=>result.status==="fulfilled"?result.value:{path:paths[index],status:"failed",count:0,error:result.reason instanceof Error?result.reason.message:"갱신 실패"});
 return NextResponse.json({ok:results.some(result=>result.status==="fulfilled"),refreshedAt:Date.now(),sources},{headers:{"Cache-Control":"no-store"}});
}
export async function GET(request:Request){return refresh(request)}
export async function POST(request:Request){return refresh(request)}
