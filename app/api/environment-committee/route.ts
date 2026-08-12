import {NextResponse} from "next/server";
import {cachedSourceData,getCachedSourceData,saveSourceData} from "../source-cache";
export const dynamic="force-dynamic";
const BASE="https://environment.na.go.kr:444";const SCHEDULE=`${BASE}/cmmit/schl/cmitSchl/schlList.do?menuNo=2000048`;const LEGISLATION=`${BASE}/cmmit/lgsltpa/lgsltpa/ongoingList.do?menuNo=2000082`;
const clean=(value:string)=>value.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g," ").trim();
const absolute=(value:string,page:string)=>{try{return new URL(value.replace(/&amp;/gi,"&"),page).toString()}catch{return page}};
async function getHtml(url:string){const response=await fetch(url,{headers:{Accept:"text/html","User-Agent":"GS-ENR-Monitor/1.0"},cache:"no-store"});if(!response.ok)throw new Error(`위원회 ${response.status}`);return response.text()}
type ScheduleRow={cmtSchSn:number;cnclDt?:string;cnclPtmSmrSj?:string;cnclSj?:string;fullCnclSj?:string;attchFlId?:string};
type Attachment={atchFileId:string;fileSn:number};
async function readSchedule(){
  const params=new URLSearchParams({pageUnit:"10",pageIndex:"1",cmitCdList:"9700585",sdate:"",edate:"",searchVal:"",menuNo:"2000048"});
  const response=await fetch(`${BASE}/cmmit/schl/cmitSchl/list.json?${params}`,{headers:{Accept:"application/json","User-Agent":"GS-ENR-Monitor/1.0"},cache:"no-store"});
  if(!response.ok)throw new Error(`위원회 일정 ${response.status}`);
  const data=await response.json() as {resultList?:ScheduleRow[];atchFileInfoList?:Attachment[]};
  const files=data.atchFileInfoList||[];
  return (data.resultList||[]).map((item,index)=>{
    const file=files.find(candidate=>candidate.atchFileId===item.attchFlId);
    const previewUrl=item.attchFlId?`${BASE}/cmmit/prevew/docsPreview/previewDocs.do?atchFileId=${encodeURIComponent(item.attchFlId)}&fileSn=${file?.fileSn||1}&viewType=CONTBODY`:SCHEDULE;
    const downloadUrl=file?`${BASE}/cmmit/cmmn/file/fileDown.do?menuNo=2000048&atchFileId=${encodeURIComponent(file.atchFileId)}&fileSn=${file.fileSn}&historyBackUrl=${encodeURIComponent(SCHEDULE)}`:SCHEDULE;
    return{id:`schedule-${item.cmtSchSn||index}`,date:[item.cnclDt,item.cnclPtmSmrSj].filter(Boolean).join(" "),title:(item.fullCnclSj||item.cnclSj||"위원회 회의").trim(),previewUrl,downloadUrl};
  }).slice(0,5);
}
async function readLegislation(){const html=await getHtml(LEGISLATION);const seen=new Set<string>();return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap((match,index)=>{const row=match[1];const link=[...row.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(a=>({url:absolute(a[1],LEGISLATION),title:clean(a[2])})).find(a=>a.title.length>5);if(!link||seen.has(link.url))return[];seen.add(link.url);const text=clean(row);const dates=[...text.matchAll(/20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}/g)].map(m=>m[0]);return[{id:`legislation-${index}`,title:link.title,period:dates.length>1?`${dates[0]} ~ ${dates[1]}`:dates[0]||"",url:link.url}];}).slice(0,10)}
export async function GET(request:Request){if(!new URL(request.url).searchParams.has("refresh")){const cached=await getCachedSourceData("environment-committee");if(cached&&Array.isArray(cached.schedules)&&cached.schedules.length)return NextResponse.json({...cached,schedules:cached.schedules.slice(0,5)},{headers:{"Cache-Control":"private, no-store"}});}try{const[schedules,legislation]=await Promise.all([readSchedule(),readLegislation()]);if(!schedules.length&&!legislation.length)throw new Error("위원회 목록을 확인하지 못했습니다.");return NextResponse.json(await saveSourceData("environment-committee",{schedules:schedules.slice(0,5),legislation,sourceUrls:{schedule:SCHEDULE,legislation:LEGISLATION}}));}catch(error){const cached=await cachedSourceData("environment-committee",error);return cached?NextResponse.json(cached):NextResponse.json({error:error instanceof Error?error.message:"위원회 연결 실패"},{status:502});}}
