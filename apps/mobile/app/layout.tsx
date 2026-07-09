import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLick",
  description: "오늘의 PL 루머를 한 장에",
};

/**
 * 모바일 웹뷰 대응 뷰포트 — 노치/펀치홀까지 그려지도록 `viewport-fit=cover`,
 * 다양한 기기에서 확대 오작동을 줄이기 위해 initialScale 고정.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="bg-nav text-text">{children}</body>
    </html>
  );
}
