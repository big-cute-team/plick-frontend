/**
 * 열린 토론을 알리는 번쩍이는 칩 (KAN-418, 시안 T2 — 워딩은 KAN-435에서 VS로).
 * 모바일·웹 릴이 같이 쓰고, 모바일 기사 리스트(KAN-438)도 label을 바꿔 단다.
 *
 * 이 게시물이 투표형이라는 유일한 신호라 틴트 배지들 사이에서 혼자
 * 튀도록 솔리드 그린 + 다크 글자로 뒤집었다(ADR 0108). 칩 전체가 accent
 * 글로우로 번쩍이고 점도 따로 깜빡여 진행 중임을 알린다 — 마감된 토론에는
 * 이 칩을 달지 않는다. `debate-live-chip` 키프레임은 각 앱 globals.css에
 * 있어야 한다(HotCarousel의 `snap-x-carousel`과 같은 규약).
 *
 * @param label 칩 문구. 릴은 기본값(VS 진행 중), 기사 리스트는 "투표 진행 중".
 */
export function DebateLiveChip({ label = "VS 진행 중" }: { label?: string }) {
  return (
    <span className="debate-live-chip bg-accent text-on-accent rounded-pill text-micro flex items-center gap-1 px-2 py-1 font-extrabold whitespace-nowrap">
      <span aria-hidden className="animate-pulse leading-none">
        ●
      </span>
      {label}
    </span>
  );
}
