import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/_components/AuthProvider";
import { QueryProvider } from "@/_queries/QueryProvider";
import { isLoggedIn } from "@/_services/session";
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

/**
 * 루트 레이아웃 — 서버에서 로그인 여부를 한 번 읽어 `AuthProvider`로 클라 트리에 시드한다.
 * refresh 미들웨어가 이보다 먼저 돌아 쿠키를 정리하므로, 여기서 읽는 값은 항상 재발급 반영 후다.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await isLoggedIn();

  return (
    <html lang="ko" data-theme="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="bg-nav text-text">
        <QueryProvider>
          <AuthProvider isLoggedIn={loggedIn}>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
