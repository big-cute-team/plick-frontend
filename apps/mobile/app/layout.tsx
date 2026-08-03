import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/_components/AuthProvider";
import { QueryProvider } from "@/_queries/QueryProvider";
import { SITE_URL } from "@/_constants/site";
import { getMyProfile } from "@/_services/profile";
import { isLoggedIn } from "@/_services/session";
import "./globals.css";

/**
 * 전 라우트 공통 메타데이터 (KAN-346). 하위 페이지는 title 문자열만 export하면
 * template이 "… | PLick"으로 감싼다. og:image·og:image:alt는 `app/`의
 * `opengraph-image.png` 파일 컨벤션이 자동으로 낸다(ADR 0070). canonical은
 * 페이지마다 경로가 달라 여기 두지 않고 각 페이지가 선언한다 — 모바일은
 * 별도 모바일 URL 패턴대로 데스크톱(`plick.co.kr`) URL을 가리킨다.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PLick",
    template: "%s | PLick",
  },
  description: "프리미어리그 소식을 릴스로",
  openGraph: {
    siteName: "PLick",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
  },
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
