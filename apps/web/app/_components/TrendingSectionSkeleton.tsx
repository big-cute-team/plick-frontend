/**
 * 급상승 랭킹 카드의 로딩 자리 (KAN-501) — `TrendingSection`의 Suspense
 * fallback이다.
 *
 * 실제 카드와 같은 테두리·패딩에 제목 한 줄과 여섯 줄 자리를 깐다. 줄은 이슈
 * 줄 모양(순위, 제목, 기사 수)이다. 사이드바는 sticky라 높이가 도착 전후로
 * 달라지면 본문 옆에서 카드가 튄다.
 */
export function TrendingSectionSkeleton() {
  return (
    <section
      aria-hidden
      className="bg-elevate-2 border-border rounded-card p-edge flex flex-col gap-2.5 border"
    >
      <div className="bg-elevate rounded-pill h-5 w-24" />
      <div>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="border-border flex items-center gap-2.5 border-b py-2 last:border-b-0"
          >
            <div className="bg-elevate rounded-pill h-4 w-6" />
            <div className="bg-elevate rounded-pill h-4 flex-1" />
            <div className="bg-elevate rounded-pill h-4 w-10" />
          </div>
        ))}
      </div>
    </section>
  );
}
