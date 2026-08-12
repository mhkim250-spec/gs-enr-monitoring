import { NextResponse } from "next/server";
import { cachedSourceData, getCachedSourceData, saveSourceData } from "../source-cache";

export const dynamic="force-dynamic";
type Source={key:string;name:string;url:string;articlePattern:RegExp;color:string;logoUrl:string};
const sources:Source[]=[
  {key:"todayenergy",name:"투데이에너지",url:"https://www.todayenergy.kr/",articlePattern:/\/news\/articleView\.html\?idxno=\d+/i,color:"#16845b",logoUrl:"https://www.todayenergy.kr/favicon.ico"},
  {key:"e2news",name:"이투뉴스",url:"https://www.e2news.com/",articlePattern:/\/news\/articleView\.html\?idxno=\d+/i,color:"#0c68a5",logoUrl:"https://www.e2news.com/favicon.ico"},
  {key:"epj",name:"일렉트릭파워",url:"https://www.epj.co.kr/",articlePattern:/\/news\/articleView\.html\?idxno=\d+/i,color:"#e06931",logoUrl:"https://www.epj.co.kr/favicon.ico"},
  {key:"electimes",name:"전기신문",url:"https://www.electimes.com/",articlePattern:/\/(?:news\/)?articleView\.html\?idxno=\d+|\/article\.php\?aid=/i,color:"#6353a3",logoUrl:"https://www.electimes.com/favicon.ico"},
  {key:"ekn",name:"에너지경제",url:"https://www.ekn.kr/web/",articlePattern:/\/web\/view\.php\?key=\d+/i,color:"#127b84",logoUrl:"https://www.ekn.kr/favicon.ico"},
];
const clean=(value:string)=>value.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/\s+/g," ").trim();

async function readSource(source:Source){
  const response=await fetch(source.url,{headers:{Accept:"text/html","User-Agent":"GS-ENR-News-Monitor/1.0"},cache:"no-store"});
  if(!response.ok) throw new Error(`${source.name} ${response.status}`);
  const html=await response.text(); const seen=new Set<string>();
  const articles=[...html.matchAll(/<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)].flatMap((match,index)=>{
    const href=match[2].replace(/&amp;/gi,"&"); if(!source.articlePattern.test(href)) return [];
    const title=clean(match[4]).replace(/^(?:본문보기|새글)\s*/,"");
    if(title.length<12||title.length>150) return [];
    const url=new URL(href,source.url).toString(); if(seen.has(url)) return []; seen.add(url);
    const image=match[4].match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i)?.[1]||"";
    return [{id:`${source.key}-${index}`,source:source.name,sourceKey:source.key,title,url,imageUrl:image?new URL(image,source.url).toString():"",color:source.color}];
  }).slice(0,8);
  return {key:source.key,name:source.name,url:source.url,color:source.color,logoUrl:source.logoUrl,articles};
}

export async function GET(request:Request){
  if(!new URL(request.url).searchParams.has("refresh")){const cached=await getCachedSourceData("news");if(cached)return NextResponse.json(cached,{headers:{"Cache-Control":"private, no-store"}});}
  try{
    const settled=await Promise.allSettled(sources.map(readSource));
    const groups=settled.flatMap((result)=>result.status==="fulfilled"&&result.value.articles.length?[result.value]:[]);
    if(!groups.length) throw new Error("뉴스 매체 연결에 실패했습니다.");
    return NextResponse.json(await saveSourceData("news",{groups,total:groups.reduce((sum,group)=>sum+group.articles.length,0)}));
  }catch(error){const cached=await cachedSourceData("news",error);return cached?NextResponse.json(cached):NextResponse.json({error:error instanceof Error?error.message:"뉴스를 불러오지 못했습니다."},{status:502});}
}
