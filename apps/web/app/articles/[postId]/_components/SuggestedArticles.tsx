import type { ArticleCard } from "@plick/domain/types";
import { SuggestedArticleCard } from "./SuggestedArticleCard";

/**
 * 기사 세부 "함께 보면 좋은 기사" 섹션 — 데스크톱 3열 미디어 카드 행.
 *
 * 본문 컬럼 안, 본문 글 바로 밑이자 액션·댓글 위에 선다 — 모바일과 같은
 * 자리다(KAN-322). 페이지 하단 전폭 행이었던 걸 이때 옮겼다.
 * 데스크톱은 3열, `lg` 미만(태블릿·모바일)에선 1열로 스택해 좁은 폭에서도
 * 카드가 찌그러지지 않게 한다.
 *
 * BE 추천 API가 아직 없어 지금은 항상 빈 목록이라 준비 중 문구가 나온다(KAN-322,
 * 모바일 KAN-283과 같은 판단) — API가 생기면 페이지 서버 컴포넌트가 받아
 * `articles`로 넘긴다.
 *
 * @param articles - 추천 기사 목록. 비어 있으면 카드 대신 준비 중 문구를 둔다.
 */
export function SuggestedArticles({
  articles = [],
}: {
  articles?: ArticleCard[];
}) {
  return (
    <section className="mt-5">
      <h2 className="text-title text-text tracking-heading font-extrabold">
        함께 보면 좋은 기사
      </h2>
      {articles.length > 0 ? (
        <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          {articles.map((article) => (
            <SuggestedArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <p className="text-body text-text-4 py-10 text-center">
          아직 준비 중이에요!
        </p>
      )}
    </section>
  );
}
