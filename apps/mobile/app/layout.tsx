import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/_components/AuthProvider";
import { QueryProvider } from "@/_queries/QueryProvider";
import { getMyProfile } from "@/_services/profile";
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
 * 루트 레이아웃 — 서버에서 로그인 여부와 내 닉네임을 한 번 읽어 `AuthProvider`로 클라 트리에
 * 시드한다. refresh 프록시(`proxy.ts`)가 이보다 먼저 돌아 쿠키를 정리하므로, 여기서 읽는 값은
 * 항상 재발급 반영 후다. 닉네임은 내 댓글 판별(KAN-333)용이라 조회가 실패해도 앱은 떠야 한다 —
 * 삼켜서 null로 둔다(수정·삭제 버튼만 안 뜬다).
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await isLoggedIn();
  const profile = loggedIn ? await getMyProfile().catch(() => null) : null;

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
          <AuthProvider
            isLoggedIn={loggedIn}
            nickname={profile?.nickname ?? null}
          >
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
