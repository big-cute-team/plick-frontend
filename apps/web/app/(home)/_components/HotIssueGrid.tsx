import type { HotArticle } from "@plick/domain/types";
import { HotCard } from "./HotCard";

/**
 * 핫이슈 그리드 — 좌측 히어로(2fr) + 우측 서브 카드 2장(1fr) 데스크톱 배치.
 *
 * 히어로는 우측 스택 높이에 맞춰 늘어난다(그리드 stretch).
 * 모바일(lg 미만)에선 히어로 한 장만 보이고 서브 스택은 숨긴다.
 *
 * BE는 기본 5건을 주는데(KAN-324) 이 그리드는 앞 3건만 쓴다. 건수가 유동인
 * 모바일 캐러셀과 달리 데스크톱 배치가 히어로 1 + 서브 2로 고정이라, 남는 건수는
 * 버리고 부족하면 있는 만큼만 그린다.
 *
 * @param articles - 핫이슈 목록. 빈 배열 처리는 호출부(홈 페이지)가 한다.
 */
export function HotIssueGrid({ articles }: { articles: HotArticle[] }) {
  const [hero, ...subs] = articles;
  return (
    <div className="gap-gap-lg grid grid-cols-1 lg:grid-cols-[2fr_1fr]">
      {hero && <HotCard article={hero} size="lg" />}
      <div className="gap-gap-lg hidden flex-col lg:flex">
        {subs.slice(0, 2).map((article) => (
          <HotCard key={article.id} article={article} size="sm" />
        ))}
      </div>
    </div>
  );
}
