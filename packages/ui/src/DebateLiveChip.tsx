/**
 * 릴 배지 행의 "VS 진행 중" 칩 (KAN-418, 시안 T2 — 워딩은 KAN-435에서 VS로).
 * 모바일·웹 릴이 같이 쓴다.
 *
 * 릴에서 이 게시물이 투표형이라는 유일한 신호라 틴트 배지들 사이에서 혼자
 * 튀도록 솔리드 그린 + 다크 글자로 뒤집었다(ADR 0108). 칩 전체가 accent
 * 글로우로 번쩍이고 점도 따로 깜빡여 진행 중임을 알린다 — 마감된 토론에는
 * 이 칩을 달지 않는다. `debate-live-chip` 키프레임은 각 앱 globals.css에
 * 있어야 한다(HotCarousel의 `snap-x-carousel`과 같은 규약).
 */
export function DebateLiveChip() {
  return (
    <span className="debate-live-chip bg-accent text-on-accent rounded-pill text-micro flex items-center gap-1 px-2 py-1 font-extrabold whitespace-nowrap">
      <span aria-hidden className="animate-pulse leading-none">
        ●
      </span>
      VS 진행 중
    </span>
  );
}
