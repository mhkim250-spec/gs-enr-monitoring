import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

type Message={role:"user"|"assistant";content:string};
type AI={run(model:string,input:Record<string,unknown>):Promise<{response?:string}>};

export async function POST(request:Request){
  try{
    const body=await request.json() as {messages?:Message[]};
    const messages=(body.messages||[]).filter(message=>(message.role==="user"||message.role==="assistant")&&typeof message.content==="string").slice(-10).map(message=>({...message,content:message.content.slice(0,800)}));
    if(!messages.length)return NextResponse.json({error:"질문을 입력해 주세요."},{status:400});
    const ai=(env as unknown as {AI?:AI}).AI;if(!ai)return NextResponse.json({error:"AI 연결을 준비 중입니다. 잠시 후 다시 시도해 주세요."},{status:503});
    const result=await ai.run("@cf/meta/llama-3.1-8b-instruct-fast",{messages:[{role:"system",content:"당신은 GS E&R 대외협력 모니터링 사이트의 친절하고 간결한 한국어 AI 도우미입니다. 에너지, 전력, 기후, 국회 행사, 정책, 뉴스에 특히 강하지만 일반 질문에도 답합니다. 사실을 모르면 추측하지 말고 모른다고 말하며, 최신 정보나 중요한 업무 판단에는 원문 확인을 권합니다."},...messages],max_tokens:700,temperature:.35});
    return NextResponse.json({answer:result.response?.trim()||"답변을 만들지 못했습니다. 질문을 조금 다르게 적어주세요."});
  }catch{return NextResponse.json({error:"AI 답변 처리 중 오류가 발생했습니다."},{status:500});}
}
