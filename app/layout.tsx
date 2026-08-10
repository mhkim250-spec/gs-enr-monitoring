import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agenda Now | 국회 정책 행사 큐레이션",
  description: "에너지·기후·산업 의제와 연결된 최신 국회 행사를 선별해 보여드립니다.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
