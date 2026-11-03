/**
 * @file 모바일 앱 전용 상수. 도메인 상수(TEAMS 등)는 `@plick/domain/constants`,
 * 하단 탭 구성(TABS)은 `@/_constants/tabs`(아이콘을 끌고 와 분리, KAN-428).
 */

/**
 * 스크롤 위치 복원을 몇 프레임까지 다시 시도할지 (KAN-379).
 *
 * 레이아웃 이펙트 시점에 문서가 아직 짧으면 브라우저가 `scrollTop`을 깎아 첫
 * 페인트가 엉뚱한 자리로 나간다. 이미지·임베드가 자리를 잡을 때까지 밀어 주되,
 * 무한정 붙잡으면 사용자 조작과 싸우므로 상한을 둔다. 60fps 기준 약 0.5초다.
 */
export const RESTORE_MAX_FRAMES = 30;

/**
 * 데스크톱 버전 전환 추천 배너(KAN-379)를 닫았음을 기억하는 localStorage 키.
 * 한 번 닫으면 이 브라우저에서 다시 띄우지 않는다.
 */
export const SWITCH_BANNER_DISMISS_KEY = "plick-switch-banner-dismissed";

/**
 * 외부 브라우저로 열기 배너(KAN-610)를 닫았음을 기억하는 localStorage 키. 인앱이 localStorage까지
 * 지우는 환경이면 다시 뜨지만, 그런 환경은 기기 복원도 안 되는 곳이라 따로 막지 않는다.
 */
export const INAPP_BANNER_DISMISS_KEY = "plick-inapp-banner-dismissed";

/**
 * 데스크톱 버전 전환을 추천할 뷰포트 조건 (KAN-379). UA 스니핑 대신 뷰포트로
 * 판별한다 — 이 코드베이스의 반응형 판단은 전부 뷰포트 기준이고(웹 lg 분기,
 * `MOBILE_ALTERNATE_MEDIA`), 판별이 틀려도 배너 하나라 대가가 없다.
 * 1024px(웹 앱의 lg 경계)부터를 데스크톱으로 본다.
 */
export const WEB_SUGGEST_MEDIA = "(min-width: 1024px)";

/**
 * 온보딩 진입 경로. 온보딩 흐름을 내려서(`app/_onboarding` private 폴더) 지금은
 * 라우팅되지 않는 주소다 — 잠들어 있는 온보딩 코드만 참조한다. 되살릴 때 폴더를
 * `app/onboarding`으로 되돌리고 로그인(`_services/auth.ts`)의 분기를 복원한다.
 */
export const ONBOARDING_ENTRY = "/onboarding/nickname";

/**
 * 앱 다운로드 팝업(KAN-711)의 "하루 동안 보지 않기"가 적는 localStorage 키. 값은 다시 띄울 수
 * 있는 시각(epoch ms)이다. 그 전에는 안 띄운다. E2E는 playwright.config의 storageState가 먼 미래
 * 값을 미리 심어 팝업이 클릭을 삼키지 않게 한다. 키 이름을 바꾸면 그쪽도 같이 바꾼다.
 */
export const APP_DOWNLOAD_DISMISS_UNTIL_KEY =
  "plick-app-download-dismissed-until";

/** 앱 다운로드 팝업의 "하루 동안 보지 않기" 길이. 24시간 */
export const APP_DOWNLOAD_DISMISS_MS = 24 * 60 * 60 * 1000;

/**
 * 앱 다운로드 팝업의 "닫기"가 적는 sessionStorage 키. 탭을 닫기 전까지는 다시 안 띄운다.
 * 페이지를 오갈 때마다 다시 뜨면 팝업이 아니라 방해다.
 */
export const APP_DOWNLOAD_CLOSED_KEY = "plick-app-download-closed";

/**
 * 앱 다운로드 팝업을 띄우지 않는 경로 접두어. 로그인·가입·OAuth 콜백은 그 흐름을 끝내는 게 먼저고,
 * 그 위에 팝업이 서면 소셜 로그인 리다이렉트와 겹친다.
 */
export const APP_DOWNLOAD_SKIP_PATHS = ["/login", "/signup", "/oauth"];
