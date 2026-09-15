/**
 * 방금 올라온 기사임을 알리는 NEW 태그 (KAN-481). 모바일 `NewsItem`·웹
 * `PostListItem`이 시각 옆에 단다. 어느 기사가 "방금"인지는 컴포넌트가 정하지
 * 않는다 — `@plick/domain/format`의 `isRecentlyPublished`가 30분 창으로 판정하고
 * 여기는 그리기만 한다.
 *
 * 생김새는 루머 단계 칩(PostChips)의 accent 틴트 계열이다. 옆에 올 수 있는 VS
 * 칩(DebateLiveChip outline)은 테두리만 있고 이건 틴트 배경만 있어 둘이 나란히
 * 서도 같은 칩으로 읽히지 않는다.
 */
export function NewBadge() {
  return (
    <span className="bg-accent-tint text-accent rounded-badge text-micro tracking-label px-1.5 py-0.5 leading-none font-extrabold whitespace-nowrap">
      NEW
    </span>
  );
}
