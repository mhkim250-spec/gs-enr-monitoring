import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request
    .json()
    .catch(() => ({ password: "" }));

  const configuredPassword = (
    env as unknown as { SITE_PASSWORD?: string }
  ).SITE_PASSWORD;

  if (!configuredPassword) {
    return NextResponse.json(
      { error: "사이트 비밀번호 설정이 필요합니다." },
      { status: 503 },
    );
  }

  if (password !== configuredPassword) {
    return NextResponse.json(
      { error: "비밀번호를 다시 확인해 주세요." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("agenda_session", "authenticated", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
