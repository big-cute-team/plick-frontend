import type { HotArticle } from "@plick/domain/types";
import { TrendingSection } from "@/_components/TrendingSection";

/**
 * 홈 우측 사이드바 — 실시간 인기 랭킹. 스크롤 시 상단에 고정된다.
 *
 * 랭킹 섹션 자체는 기사 세부 사이드바와 공용이라 `TrendingSection`으로
 * 분리했다(KAN-338). 마이팀 카드는 대응 기능이 없어 걷어냈다.
 *
 * @param articles - 핫이슈 목록. 홈 페이지가 핫이슈 섹션용으로 받아 둔 것을
 *   그대로 내려받는다. 로드 실패면 null.
 * @param className - 래퍼에 덧붙일 클래스(모바일에서 `hidden`으로 감추는 등)
 */
export function HomeSidebar({
  articles,
  className = "",
}: {
  articles: HotArticle[] | null;
  className?: string;
}) {
  return (
    <aside className={`sticky top-22 flex-col gap-4 self-start ${className}`}>
      <TrendingSection articles={articles} />
    </aside>
  );
}
