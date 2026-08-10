import type { MetadataRoute } from "next";

/**
 * 웹 앱 manifest (KAN-380). `/manifest.webmanifest`로 컴파일되고 링크 태그는
 * Next가 자동으로 넣는다.
 *
 * SEO 몫은 사이트 이름과 설명을 크롤러가 읽는 출처가 하나 더 생긴다는 것이고,
 * 실사용 몫은 홈 화면·데스크톱에 설치했을 때 아이콘·이름·배경색이 제대로
 * 잡힌다는 것이다. 없으면 브라우저가 문서 제목과 임의 아이콘으로 때운다.
 *
 * 아이콘은 `app/icon.png`(512x512)를 그대로 쓴다. 파일 컨벤션이 링크 태그에는
 * 캐시 무효화용 쿼리를 붙이지만 `/icon.png` 자체가 200으로 응답하므로 여기서는
 * 쿼리 없는 안정된 경로를 적는다.
 *
 * 색은 `theme.css` 토큰과 수동 동기화다(루트 레이아웃 viewport의 themeColor와
 * 같은 값). 토큰을 바꾸면 여기도 같이 본다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PLick",
    short_name: "PLick",
    description: "프리미어리그 소식을 릴스로",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d12",
    theme_color: "#0b0d12",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
