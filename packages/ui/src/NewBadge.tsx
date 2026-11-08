/**
 * 방금 올라온 기사임을 알리는 새 글 표시 (KAN-481, 모양 KAN-742). 빨간 라운드 사각형 상자에
 * 흰 `NEW`다. 모바일 `NewsItem`·웹 `PostListItem`이 제목 옆 댓글 수 뒤에 단다.
 * 어느 기사가 "방금"인지는 컴포넌트가 정하지 않는다 — `@plick/domain/format`의
 * `isRecentlyPublished`가 판정하고 여기는 그리기만 한다.
 *
 * 라운드는 `rounded-badge` 토큰을 쓰지 않는다. 웹 `globals.css`가 그 토큰을 0으로 덮어
 * 웹에서만 각지게 나온다. 이 배지는 두 앱 모두 둥근 사각형이다.
 *
 * 부모 줄이 baseline 정렬이어도 제목 높이의 가운데에 서도록 `self-center`를 둔다. Noto Sans는
 * 대문자가 줄 상자의 가운데보다 아래에 그려져 아래 여백을 위보다 넉넉히 준다.
 */
export function NewBadge() {
  return (
    <span
      aria-label="새 글"
      className="bg-danger border-danger text-on-accent text-micro shrink-0 self-center rounded-sm border px-1 pt-px pb-0.5 font-sans leading-none font-bold whitespace-nowrap"
    >
      NEW
    </span>
  );
}
