import type { Metadata } from "next";
import { AuthProvider } from "@/_components/AuthProvider";
import { QueryProvider } from "@/_queries/QueryProvider";
import { isLoggedIn } from "@/_services/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLick",
  description: "오늘의 PL 루머를 한 장에",
};

/**
 * 루트 레이아웃 — 서버에서 로그인 여부를 한 번 읽어 `AuthProvider`로 클라 트리에 시드한다.
 * refresh 프록시(`proxy.ts`)가 이보다 먼저 돌아 쿠키를 정리하므로, 여기서 읽는 값은 항상 재발급 반영 후다.
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
      <body className="bg-bg text-text">
        <QueryProvider>
          <AuthProvider isLoggedIn={loggedIn}>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
