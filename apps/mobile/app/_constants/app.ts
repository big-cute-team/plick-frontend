/**
 * @file 모바일 앱 전용 상수. 도메인 상수(TEAMS 등)는 `@plick/domain/constants`,
 * 하단 탭 구성(TABS)은 `@/_constants/tabs`(아이콘을 끌고 와 분리, KAN-428).
 */

/**
 * 태그된 팀이 없는 게시물의 미디어 색 CSS 변수 (KAN-271, KAN-276).
 * `MediaThumb`이 팀 컬러로 그라데이션을 만드는데 BE `teams`가 빈 배열로 올 수 있어
 * 그때 강조색으로 대신 채운다. 홈 리스트와 기사 세부가 같은 폴백을 쓴다.
 */
export const NO_TEAM_COLOR_VAR = "--plk-accent";

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
 * 데스크톱 버전 전환을 추천할 뷰포트 조건 (KAN-379). UA 스니핑 대신 뷰포트로
 * 판별한다 — 이 코드베이스의 반응형 판단은 전부 뷰포트 기준이고(웹 lg 분기,
 * `MOBILE_ALTERNATE_MEDIA`), 판별이 틀려도 배너 하나라 대가가 없다.
 * 1024px(웹 앱의 lg 경계)부터를 데스크톱으로 본다.
 */
export const WEB_SUGGEST_MEDIA = "(min-width: 1024px)";

/**
 * flow 임베드(기사 세부)의 카드 높이 상한 — 화면 높이 대비 비율 (KAN-283).
 * 트윗 카드가 이보다 길면 릴스(useTweetFit)처럼 미디어를 숨겨 전문 텍스트를
 * 살린다. X Display Requirements상 본문은 자를 수 없어 사진만 뺀다.
 */
export const TWEET_FLOW_MAX_HEIGHT_RATIO = 0.6;

/**
 * 온보딩 진입 경로. 온보딩 흐름을 내려서(`app/_onboarding` private 폴더) 지금은
 * 라우팅되지 않는 주소다 — 잠들어 있는 온보딩 코드만 참조한다. 되살릴 때 폴더를
 * `app/onboarding`으로 되돌리고 로그인(`_services/auth.ts`)의 분기를 복원한다.
 */
export const ONBOARDING_ENTRY = "/onboarding/nickname";
