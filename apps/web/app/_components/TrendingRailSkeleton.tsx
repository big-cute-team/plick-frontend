/**
 * 급상승 상자의 로딩 자리 (KAN-501) — `TrendingRail`의 Suspense fallback이다.
 *
 * 실제 상자와 같은 테두리·패딩에 제목 한 줄과 여섯 줄 자리를 깐다. 레일은
 * sticky라 높이가 도착 전후로 달라지면 본문 옆에서 상자가 튄다.
 */
export function TrendingRailSkeleton() {
  return (
    <section
      aria-hidden
      className="border-border-strong animate-pulse border px-3.5 py-3"
    >
      <div className="border-border flex h-7 items-center border-b">
        <div className="bg-elevate h-3.5 w-20" />
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="border-border-soft flex h-8.25 items-center gap-2.5 border-b"
        >
          <div className="bg-elevate h-3.5 w-3.5" />
          <div className="bg-elevate h-3.5 flex-1" />
          <div className="bg-elevate h-3 w-6.5" />
        </div>
      ))}
    </section>
  );
}
