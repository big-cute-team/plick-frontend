import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/_components/AuthProvider";
import { SwitchToMobileBanner } from "@/_components/SwitchToMobileBanner";
import { QueryProvider } from "@/_queries/QueryProvider";
import { SITE_URL } from "@/_constants/site";
import { getMyProfile } from "@/_services/profile";
import { isLoggedIn } from "@/_services/session";
import "./globals.css";

/**
 * 전 라우트 공통 메타데이터 (KAN-346). 하위 페이지는 title 문자열만 export하면
 * template이 "… | PLick"으로 감싼다. og:image·og:image:alt는 `app/`의
 * `opengraph-image.png` 파일 컨벤션이 자동으로 낸다(ADR 0070). canonical은
 * 페이지마다 경로가 달라 여기 두지 않고 각 페이지가 선언한다 — 이 앱이
 * canonical 도메인이고(ADR 0070 A안) 대응 모바일 페이지를 alternate로 단다.
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
 * 데스크톱도 뷰포트 메타는 있어야 한다 (KAN-346) — 없으면 모바일 기기에서 이
 * 도메인을 열었을 때 980px 가상 뷰포트로 축소 렌더되고, 모바일 친화성 평가에도
 * 불리하다. 노치 대응(viewport-fit)은 모바일 앱만의 몫이라 여기선 뺀다.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
      <body className="bg-bg text-text">
        <QueryProvider>
          <AuthProvider
            isLoggedIn={loggedIn}
            nickname={profile?.nickname ?? null}
          >
            {/* 모바일 전환 배너 (KAN-379) — 화면마다 SiteHeader가 따로 있어
                여기가 유일한 전역 자리다. sticky 헤더 위에 흐름으로 얹으므로
                스크롤하면 배너는 올라가고 헤더가 상단에 붙는다 */}
            <SwitchToMobileBanner />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
