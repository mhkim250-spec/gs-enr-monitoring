import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GS E&R 대외협력 모니터링",
  description: "GS E&R 관련 에너지·기후·산업 의제의 최신 국회 행사를 선별해 보여드립니다.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
