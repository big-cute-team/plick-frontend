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

/** 실서비스 모바일 도메인. 색인 허용 판정의 기준값이라 리터럴로 둔다. */
const PROD_SITE_URL = "https://m.plick.co.kr";

/**
 * 이 빌드가 실서비스용인지 (KAN-380). dev(`dev-m.plick.co.kr`)와 로컬은 false다.
 *
 * dev 환경은 prod와 같은 콘텐츠를 서비스하므로 색인되면 중복 콘텐츠로 prod의
 * 랭킹 시그널을 나눠 갖는다. robots와 루트 메타데이터가 이 값으로 분기한다.
 * `SITE_URL`이 빌드 타임 리터럴이라 이 비교도 빌드 시점에 확정된다.
 */
export const IS_PRODUCTION_SITE = SITE_URL === PROD_SITE_URL;
