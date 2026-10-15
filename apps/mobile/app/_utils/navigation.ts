/**
 * @file 지금 문서가 어떤 내비게이션으로 열렸는지 읽는다. 브라우저에서만 부른다.
 */

/**
 * 이 문서가 뒤로가기·앞으로가기로 다시 받아진 것이고, 아직 그 주소 그대로인가 (KAN-632).
 *
 * `no-store` 때문에 bfcache에 못 들어간 화면은 뒤로가기 때 서버에서 새로 받아진다. 그 새 문서는
 * 사용자에게 "같은 방문"이지 새 열람이 아니다. 조회 기록을 다시 보내거나 맨 위에서 다시
 * 시작하면 안 되는 자리를 가르는 신호가 이것이다.
 *
 * 문서의 `navigation` 타이밍 항목은 한 문서에 하나라 `pushState`·`replaceState`로 주소가 바뀌어도
 * `type`은 그대로다. 그래서 주소까지 대조한다. 뒤로가기로 받은 문서 안에서 다른 기사로 옮겨
 * 갔으면 그건 새 열람이다. 릴스는 스와이프마다 `replaceState`로 주소를 바꾸니 첫 릴만 여기 걸린다.
 *
 * @returns 뒤로가기·앞으로가기로 열린 문서의 첫 주소에 있으면 true
 */
export function isBackForwardLanding(): boolean {
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (!entry || entry.type !== "back_forward") return false;
  return entry.name === location.href;
}
