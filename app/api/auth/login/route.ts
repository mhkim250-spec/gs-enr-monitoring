import { NextResponse } from "next/server";

export async function POST(request:Request){
  const {password}=await request.json().catch(()=>({password:""}));
  if(password!==(process.env.SITE_PASSWORD||"0000")) return NextResponse.json({error:"비밀번호를 다시 확인해 주세요."},{status:401});
  const response=NextResponse.json({ok:true});
  response.cookies.set("agenda_session","authenticated",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:60*60*24*7});
  return response;
}
