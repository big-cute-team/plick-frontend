import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GoogleAnalytics } from "@next/third-parties/google";
import {
  BRAND_DESCRIPTION,
  BRAND_NAME_KO,
  BRAND_TITLE,
  BRAND_TITLE_TEMPLATE,
} from "@plick/domain/brand";
import { ADSENSE_SCRIPT_URL, adsPauseScript } from "@plick/core/ads";
import { deviceSyncScript } from "@plick/core/analytics";
import { DEVICE_ID_QUERY_PARAM } from "@plick/domain/cross-site";
import { AdsProvider } from "@/_components/AdsProvider";
import { AnalyticsTracker } from "@/_components/AnalyticsTracker";
import { AuthProvider } from "@/_components/AuthProvider";
import { GuestNoticeToast } from "@/_components/GuestNoticeToast";
import { ErrorToast } from "@/_components/ErrorToast";
import { ADS_BASE_MODE } from "@/_constants/ads";
import { CRAWLER_UA_PATTERN } from "@/_constants/api";
import { GA_MEASUREMENT_ID } from "@/_constants/analytics";
import { QueryProvider } from "@/_queries/QueryProvider";
import {
  IS_PRODUCTION_SITE,
  NAVER_SITE_VERIFICATION,
  SITE_URL,
} from "@/_constants/site";
import "./globals.css";

/**
 * Noto Sans KR 셀프호스팅 (KAN-567). 시안 폰트가 Noto Sans KR 400·500·700·900이라
 * Pretendard(KAN-421)를 교체했다. 구글 폰트 CSS 대신 `next/font/local`로 싣는
 * 이유는 전과 같다 — preload와 `font-display: swap`, 사이즈 조정된 fallback이
 * 자동으로 붙고 `/_next/static`이라 CloudFront immutable 캐시를 그대로 탄다.
 * 파일은 google/fonts의 가변 TTF를 KS X 1001 완성형 2,350자 + 라틴·기호로
 * 서브셋해 woff2로 굳힌 것이다(`scripts/fonts/subset-noto.sh`). 서브셋 밖 희귀
 * 음절은 fallback 시스템 폰트로 표시된다. 폰트 패밀리는 `--font-noto` 변수로
 * 노출하고 `@plick/tokens`의 `--font-sans`가 이를 읽는다.
 */
const notoSansKr = localFont({
  src: "./fonts/NotoSansKR-Variable.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-noto",
});

/**
 * 전 라우트 공통 메타데이터 (KAN-346). 하위 페이지는 title 문자열만 export하면
 * template이 "… | 해축이모"로 감싼다. og:image·og:image:alt는 `app/`의
 * `opengraph-image.png` 파일 컨벤션이 자동으로 낸다(ADR 0070). canonical은
 * 페이지마다 경로가 달라 여기 두지 않고 각 페이지가 선언한다 — 모바일은
 * 별도 모바일 URL 패턴대로 데스크톱(`plick.co.kr`) URL을 가리킨다.
 *
 * dev 빌드에는 `noindex, nofollow`가 붙는다 (KAN-380). 하위 페이지가 robots를
 * 따로 선언하지 않으므로 이 한 줄이 전 라우트에 상속된다.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // title·description은 검색 스니펫의 원문이다 (KAN-384) — 짧은 태그라인만
  // 두면 구글이 무시하고 화면 텍스트를 긁어 스니펫이 깨진다. 문구는
  // `@plick/domain/brand`가 web과 단일 출처다
  title: {
    default: BRAND_TITLE,
    template: BRAND_TITLE_TEMPLATE,
  },
  description: BRAND_DESCRIPTION,
  robots: IS_PRODUCTION_SITE ? undefined : { index: false, follow: false },
  // 네이버 서치어드바이저 소유확인 (KAN-380). Metadata API에 네이버 전용 키가
  // 없어 other로 넣으면 `<meta name="naver-site-verification">`으로 나간다.
  // 네이버는 사이트 단위 등록이라 web과 토큰이 다르다
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
 * 모바일 뷰포트. 노치·펀치홀까지 그리도록 `viewport-fit=cover`, 첫 로드 배율은 1로 고정한다.
 *
 * `maximumScale: 1`과 `userScalable: false`는 두지 않는다 (KAN-669). 전에는 앱 셸 WKWebView의
 * 핀치 줌과 iOS의 입력창 포커스 자동 확대를 이 두 줄로 막았는데(ADR 0107), Lighthouse
 * `meta-viewport` 감사가 전 화면에서 실패해 접근성 점수의 가장 큰 감점이었다. 지금은 앱 셸
 * 1.2.0이 확대 차단을 셸 안에서 스스로 한다(Android는 WebView 내장 줌을 끄고, iOS는 로드
 * 시점에 viewport meta를 고쳐 쓴다). 그래서 웹은 브라우저 사용자의 핀치 줌을 그대로 두고,
 * 더블탭 확대는 `globals.css`의 `touch-action: manipulation`이, 입력창 포커스 자동 확대는
 * iOS 한정 입력창 글자 16px 바닥이 막는다.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

/**
 * 루트 레이아웃. 요청을 읽지 않는다 (KAN-632).
 *
 * 전에는 여기서 `cookies()`로 로그인·게스트 여부를, `headers()`로 앱 셸 여부를 읽어
 * `AuthProvider`와 `AdsProvider`에 내려줬다. 레이아웃은 모든 페이지의 부모라 그 호출이
 * 전 라우트를 동적 렌더로 판정하게 했고, Next는 동적 응답에 `no-store`를 달아 FAQ처럼
 * 데이터 없는 화면까지 CDN도 브라우저도 저장하지 못했다(ADR 0199). 지금은 둘 다 브라우저가
 * 쿠키와 UA로 스스로 정한다. 그래서 이 레이아웃은 정적으로 굳고, 요청 데이터를 읽는 페이지만
 * 동적이 된다.
 *
 * 프로필(닉네임·userId)은 `AuthProvider`가 브라우저에서 받는다. KAN-602에서 "레이아웃이
 * BE를 기다리지 않는다"로 바꾼 뜻은 그대로다.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      data-theme="light"
      className={notoSansKr.variable}
      suppressHydrationWarning
    >
      <head>
        {/* 안전영역 이중 적용 판별 (globals.css의 --safe-* 변수 참고).
            뷰포트가 화면 세로 끝까지 닿지 않으면(= 앱셸이 이미 시스템 바 안쪽에
            웹뷰를 배치) data-inset-viewport를 달아 safe-area 패딩을 0으로 접는다.
            첫 페인트 전에 돌아야 여백이 접히는 깜빡임이 없어 head 동기 스크립트로 둔다.
            문턱 24px: edge-to-edge면 차이가 0에 수렴하고, 시스템 바 안쪽이면
            상태바+내비바 합(약 90px 이상)만큼 차이가 난다.
            하이드레이션 전에 html 속성을 바꾸므로 위 html 태그에
            suppressHydrationWarning을 달았다(그 엘리먼트 속성 비교만 끈다). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{if(screen.height-window.innerHeight>24)document.documentElement.setAttribute("data-inset-viewport","")}catch(e){}})()',
          }}
        />
        {/* 기기 식별자 쿠키를 localStorage와 맞춘다 (KAN-610). 인앱 브라우저가 지운 쿠키를
            되살리는 자리다. 뒤따르는 /be fetch보다 먼저 돌아야 그 요청들이 옛 식별자를
            달고 나가므로 위와 같이 head 동기 스크립트다. 내용은 @plick/core/analytics가 만든다.
            KAN-665부터 새 식별자 만들기와 진입 주소 넘기기(랜딩 쿠키)도 여기서 한다. 프록시가
            페이지 응답에 심던 쿠키라, 그대로 두면 CDN이 그 응답을 저장할 수 없다 */}
        <script
          dangerouslySetInnerHTML={{
            __html: deviceSyncScript({
              issue: {
                crawlerPattern: CRAWLER_UA_PATTERN,
                handedParam: DEVICE_ID_QUERY_PARAM,
              },
              landing: true,
            }),
          }}
        />
        {/* 릴 미디어가 트윗 임베드(pbs.twimg.com) 경로라 첫 이미지(LCP) 연결을
            미리 열어 둔다 (KAN-421) */}
        <link rel="preconnect" href="https://pbs.twimg.com" />
        {/* 애드센스 로더 (KAN-652) — live 모드(prod)에 붙는다. `next/script`의
            afterInteractive는 HTML에 preload 링크만 남기고 태그는 하이드레이션 뒤 브라우저가
            만들어서, JS를 돌리지 않는 애드센스 크롤러가 "코드 없음"으로 봤다. 구글이 주는
            스니펫 그대로 head에 async 태그로 둔다. async라 파싱과 첫 페인트를 막지 않는다. 이 태그가 head에 있는 것으로 사이트 소유 확인과 심사가 된다.
            앱 셸(WebView)은 애드센스가 노출을 금지하는데, 서버가 UA를 읽지 않게 되면서(KAN-632)
            태그를 빼는 대신 바로 위 동기 스크립트가 앱 셸 UA면 광고 요청을 멈춘다 */}
        {ADS_BASE_MODE === "live" && (
          <>
            <script dangerouslySetInnerHTML={{ __html: adsPauseScript() }} />
            <script async src={ADSENSE_SCRIPT_URL} crossOrigin="anonymous" />
          </>
        )}
      </head>
      <body className="bg-canvas text-text">
        <QueryProvider>
          <AuthProvider>
            <AdsProvider>{children}</AdsProvider>
          </AuthProvider>
        </QueryProvider>
        {/* 뮤테이션 전역 안전망이 잡은 실패를 띄우는 토스트 (KAN-447) — fixed라
            트리 어디든 되지만, 화면 트리 밖에 두어 라우트 교체와 무관하게 산다 */}
        <ErrorToast />
        {/* 게스트 발급·연동 결과 안내 (KAN-514) — 위와 같은 이유로 화면 트리 밖에 둔다 */}
        <GuestNoticeToast />
        {/* 진입·화면 전환 행동 이벤트 (KAN-543) — 라우트가 바뀌어도 살아야 해서 화면 트리 밖 */}
        <AnalyticsTracker />
        {/* GA4 (KAN-380) — 측정 ID가 있는 빌드(prod)에만 붙는다. 이 컴포넌트가
            스크립트를 afterInteractive로 실어 첫 페인트를 막지 않는다. 측정하려다
            LCP를 깎으면 본말전도라 직접 gtag를 박지 않고 이걸 쓴다 */}
        {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
      </body>
    </html>
  );
}
