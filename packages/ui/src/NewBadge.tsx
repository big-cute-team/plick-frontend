/**
 * 방금 올라온 기사임을 알리는 새 글 표시 (KAN-481, 시안 KAN-567). 시안은 빨간
 * 바탕에 흰 `N` 한 글자다. 모바일 `NewsItem`·웹 `PostListItem`이 시각 옆에 단다.
 * 어느 기사가 "방금"인지는 컴포넌트가 정하지 않는다 — `@plick/domain/format`의
 * `isRecentlyPublished`가 30분 창으로 판정하고 여기는 그리기만 한다.
 *
 * 라운드는 토큰(`rounded-badge`)이라 웹은 각지고 앱은 6px다.
 */
export function NewBadge() {
  return (
    <span
      aria-label="새 글"
      className="bg-danger text-on-accent rounded-badge text-micro px-1 py-px leading-none font-black whitespace-nowrap"
    >
      N
    </span>
  );
}
