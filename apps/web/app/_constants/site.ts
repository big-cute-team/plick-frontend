/**
 * @file 사이트 대표 URL 상수 (KAN-346). metadataBase·canonical·sitemap이 쓴다.
 * 공유 링크는 ADR 0047대로 `window.location.origin`을 유지한다 — 여기 상수를 쓰지 않는다.
 *
 * `NEXT_PUBLIC_` env는 빌드 시점에 번들에 리터럴로 굳는다(ADR 0070). 배포 값은
 * deploy.yml 빌드 스텝에 상수로 있고, 로컬 폴백은 dev 서버 포트와 맞춘다.
 */

/** 이 앱(데스크톱 웹)의 대표 절대 URL. 배포에선 `https://plick.co.kr`. canonical 도메인이다(ADR 0070 A안). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * 모바일 웹의 대표 절대 URL. 배포에선 `https://m.plick.co.kr`.
 *
 * 구글의 별도 모바일 URL 패턴에서 데스크톱 페이지는 대응 모바일 페이지를
 * `rel="alternate" media="..."`로 선언한다 — 그 href 조립에 쓴다.
 */
export const MOBILE_SITE_URL =
  process.env.NEXT_PUBLIC_MOBILE_SITE_URL ?? "http://localhost:3001";

/**
 * 모바일 alternate 선언의 media 조건. 구글 별도 모바일 URL 문서의 권장값
 * 그대로다 — 크롤러가 "이 조건이면 모바일 URL을 쓰라"로 읽는 시그널이고,
 * 실제 브라우저 리다이렉트와는 무관하다.
 */
export const MOBILE_ALTERNATE_MEDIA = "only screen and (max-width: 640px)";

/** 실서비스 데스크톱 도메인. 색인 허용 판정의 기준값이라 리터럴로 둔다. */
const PROD_SITE_URL = "https://plick.co.kr";

/**
 * 이 빌드가 실서비스용인지 (KAN-380). dev(`dev.plick.co.kr`)와 로컬은 false다.
 *
 * dev 환경은 prod와 같은 콘텐츠를 서비스하므로 색인되면 중복 콘텐츠로 prod의
 * 랭킹 시그널을 나눠 갖는다. robots와 루트 메타데이터가 이 값으로 분기한다.
 * `SITE_URL`이 빌드 타임 리터럴이라 이 비교도 빌드 시점에 확정된다.
 */
export const IS_PRODUCTION_SITE = SITE_URL === PROD_SITE_URL;
