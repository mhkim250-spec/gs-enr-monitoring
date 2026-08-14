import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export async function POST(){const store=await cookies();store.set("agenda_session","",{httpOnly:true,sameSite:"lax",secure:true,path:"/",maxAge:0});return NextResponse.json({ok:true});}
