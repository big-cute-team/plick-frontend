import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GoogleAnalytics } from "@next/third-parties/google";
import {
  BRAND_DESCRIPTION,
  BRAND_NAME_KO,
  BRAND_TITLE,
  BRAND_TITLE_TEMPLATE,
} from "@plick/domain/brand";
import { AuthProvider } from "@/_components/AuthProvider";
import { GA_MEASUREMENT_ID } from "@/_constants/analytics";
import { SwitchToMobileBanner } from "@/_components/SwitchToMobileBanner";
import { QueryProvider } from "@/_queries/QueryProvider";
import {
  IS_PRODUCTION_SITE,
  NAVER_SITE_VERIFICATION,
  SITE_URL,
} from "@/_constants/site";
import { getMyProfile } from "@/_services/profile";
import { isLoggedIn } from "@/_services/session";
import "./globals.css";

/**
 * Pretendard 셀프호스팅 (KAN-421). jsdelivr 동기 CSS(렌더 블로킹 + 한글 전 글리프
 * variable woff2 2.0MB)를 `next/font/local`로 교체한다. 모바일 layout과 같은 구성 —
 * Std 서브셋(2,780자, 285KB), 패밀리는 `--font-pretendard` 변수로 노출하고
 * `@plick/tokens`의 `--font-sans`가 읽는다.
 */
const pretendard = localFont({
  src: "./fonts/PretendardStdVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

/**
 * 전 라우트 공통 메타데이터 (KAN-346). 하위 페이지는 title 문자열만 export하면
 * template이 "… | 플릭 PLick"으로 감싼다. og:image·og:image:alt는 `app/`의
 * `opengraph-image.png` 파일 컨벤션이 자동으로 낸다(ADR 0070). canonical은
 * 페이지마다 경로가 달라 여기 두지 않고 각 페이지가 선언한다 — 이 앱이
 * canonical 도메인이고(ADR 0070 A안) 대응 모바일 페이지를 alternate로 단다.
 *
 * dev 빌드에는 `noindex, nofollow`가 붙는다 (KAN-380). 하위 페이지가 robots를
 * 따로 선언하지 않으므로 이 한 줄이 전 라우트에 상속된다.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // title·description은 검색 스니펫의 원문이다 (KAN-384) — 짧은 태그라인만
  // 두면 구글이 무시하고 화면 텍스트를 긁어 스니펫이 깨진다. 문구는
  // `@plick/domain/brand`가 mobile과 단일 출처다
  title: {
    default: BRAND_TITLE,
    template: BRAND_TITLE_TEMPLATE,
  },
  description: BRAND_DESCRIPTION,
  robots: IS_PRODUCTION_SITE ? undefined : { index: false, follow: false },
  // 네이버 서치어드바이저 소유확인 (KAN-380). Metadata API에 네이버 전용 키가
  // 없어 other로 넣으면 `<meta name="naver-site-verification">`으로 나간다
  verification: {
    other: { "naver-site-verification": NAVER_SITE_VERIFICATION },
  },
  openGraph: {
    // 검색 결과 상단 사이트명을 한글로 (KAN-384) — WebSite JSON-LD name과
    // 같은 값이어야 구글이 채택한다
    siteName: BRAND_NAME_KO,
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
    <html lang="ko" data-theme="dark" className={pretendard.variable}>
      <head>
        {/* 릴 미디어가 트윗 임베드(pbs.twimg.com) 경로라 첫 이미지(LCP) 연결을
            미리 열어 둔다 (KAN-421) */}
        <link rel="preconnect" href="https://pbs.twimg.com" />
      </head>
      <body className="bg-bg text-text">
        <QueryProvider>
          <AuthProvider
            isLoggedIn={loggedIn}
            userId={profile?.userId ?? null}
            nickname={profile?.nickname ?? null}
          >
            {/* 모바일 전환 배너 (KAN-379) — 화면마다 SiteHeader가 따로 있어
                여기가 유일한 전역 자리다. sticky 헤더 위에 흐름으로 얹으므로
                스크롤하면 배너는 올라가고 헤더가 상단에 붙는다 */}
            <SwitchToMobileBanner />
            {children}
          </AuthProvider>
        </QueryProvider>
        {/* GA4 (KAN-380) — 측정 ID가 있는 빌드(prod)에만 붙는다. 이 컴포넌트가
            스크립트를 afterInteractive로 실어 첫 페인트를 막지 않는다. 측정하려다
            LCP를 깎으면 본말전도라 직접 gtag를 박지 않고 이걸 쓴다 */}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
      </body>
    </html>
  );
}
