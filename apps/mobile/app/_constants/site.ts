/**
 * @file 사이트 대표 URL 상수 (KAN-346). metadataBase·canonical·sitemap이 쓴다.
 * 공유 링크는 ADR 0047대로 `window.location.origin`을 유지한다 — 여기 상수를 쓰지 않는다.
 *
 * `NEXT_PUBLIC_` env는 빌드 시점에 번들에 리터럴로 굳는다(ADR 0070). 배포 값은
 * deploy.yml 빌드 스텝에 상수로 있고, 로컬 폴백은 dev 서버 포트와 맞춘다.
 */

/** 이 앱(모바일)의 대표 절대 URL. 배포에선 `https://m.plick.co.kr`. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

/**
 * 데스크톱 웹의 대표 절대 URL. 배포에선 `https://plick.co.kr`.
 *
 * canonical은 A안(ADR 0070) 결정대로 데스크톱 도메인이다 — 구글의 별도 모바일
 * URL 패턴은 모바일 페이지가 데스크톱 URL을 `rel="canonical"`로 가리키게 한다.
 * 모바일 페이지의 canonical 조립에 쓴다.
 */
export const WEB_SITE_URL =
  process.env.NEXT_PUBLIC_WEB_SITE_URL ?? "http://localhost:3000";
