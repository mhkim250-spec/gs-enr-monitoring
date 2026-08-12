import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(){
  const store=await cookies();
  return store.get("agenda_session")?.value==="authenticated" ? NextResponse.json({authenticated:true}) : NextResponse.json({authenticated:false},{status:401});
}
