/**
 * @file 데스크톱 릴스 뷰어 상수 (KAN-323).
 *
 * 모바일 `_constants/reels.ts`는 Embla 캐러셀 옵션과 바텀시트 기하가 대부분인데
 * web 릴스는 CSS scroll-snap 뷰어라 그 값들이 쓸 자리가 없다. 여기는 표면과
 * 무관한 프리페치 시점 하나만 옮겨 왔다.
 */

/**
 * 남은 릴이 이 개수 이하로 줄면 다음 페이지를 미리 당긴다 (KAN-276).
 *
 * 한 페이지가 10장이라 세 장 남았을 때 시작하면 사용자가 끝에 닿기 전에 도착한다.
 * 리스트의 무한스크롤과 달리 릴 한 장이 뷰어를 통째로 채워, 맨 끝에 감시 요소를
 * 두면 마지막 릴에 도착해서야 요청이 나간다. 그래서 감시 요소를 끝에서 이만큼
 * 앞선 릴에 심는다({@link ReelViewer}).
 */
export const REELS_PREFETCH_AHEAD = 3;

/**
 * 세부 패널을 기본으로 열어 두는 뷰포트 (KAN-483). Tailwind `lg`(64rem)와 같은
 * 값이다 — 패널 CSS가 `lg:`로 인라인·오버레이를 가르니 JS 판정도 같은 선이어야 한다.
 * {@link PULL_VIEWPORT_QUERY}(`max-width: 1023px`)의 반대편이다.
 */
export const REELS_PANEL_DESKTOP_QUERY = "(min-width: 1024px)";
