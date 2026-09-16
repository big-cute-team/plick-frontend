import { Suspense } from "react";
import { TrendingSection } from "@/_components/TrendingSection";
import { TrendingSectionSkeleton } from "@/_components/TrendingSectionSkeleton";

/**
 * 홈 우측 사이드바 — 실시간 급상승 랭킹. 스크롤 시 상단에 고정된다.
 *
 * 랭킹 섹션 자체는 기사 세부 사이드바와 공용이라 `TrendingSection`으로
 * 분리했다(KAN-338). 마이팀 카드는 대응 기능이 없어 걷어냈다.
 *
 * KAN-501에서 카드 내용이 핫이슈 조회수 랭킹에서 팀·선수 급상승 랭킹으로
 * 바뀌면서, 데이터를 홈 페이지에서 prop으로 내려받지 않고 카드가 직접 받는다.
 * 사이드바는 본문보다 늦게 와도 되는 자리라 `Suspense`로 감싸 페이지 렌더를
 * 붙잡지 않는다.
 *
 * @param className - 래퍼에 덧붙일 클래스(모바일에서 `hidden`으로 감추는 등)
 */
export function HomeSidebar({ className = "" }: { className?: string }) {
  return (
    <aside className={`sticky top-22 flex-col gap-4 self-start ${className}`}>
      <Suspense fallback={<TrendingSectionSkeleton />}>
        <TrendingSection />
      </Suspense>
    </aside>
  );
}
