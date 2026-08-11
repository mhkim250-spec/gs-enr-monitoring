import { NextResponse } from "next/server";
import { getSourceStatuses } from "../source-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getSourceStatuses();
    return NextResponse.json({ statuses: result.results || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ statuses: [] });
  }
}
