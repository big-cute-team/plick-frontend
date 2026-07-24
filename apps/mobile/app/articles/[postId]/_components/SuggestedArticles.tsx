import type { ArticleCard } from "@/_types/articles";
import { SuggestedArticleCard } from "./SuggestedArticleCard";

/**
 * 기사 세부 "함께 보면 좋은 기사" 섹션 — 가로 스크롤 미디어 카드 행 (KAN-301).
 *
 * 본문 글 바로 밑에 서고, 카드가 화면 폭을 넘으면 가로로 넘겨 본다.
 * BE 추천 API가 아직 없어 지금은 항상 빈 목록이라 준비 중 문구가 나온다 —
 * API가 생기면 페이지 서버 컴포넌트가 fetch해 `ArticleBody.suggested`로 넘긴다.
 *
 * 부모(ArticleBody)의 `px-edge` 안에 있어 스크롤 트랙만 `-mx-edge`로 화면
 * 끝까지 풀어 끝 카드가 화면 모서리에 잘려 보이게 한다(스크롤 단서).
 *
 * @param articles - 추천 기사 목록. 비어 있으면 카드 대신 준비 중 문구를 둔다.
 */
export function SuggestedArticles({ articles }: { articles: ArticleCard[] }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-title text-text tracking-heading font-extrabold">
        함께 보면 좋은 기사
      </h2>
      {articles.length > 0 ? (
        <div className="no-scrollbar -mx-edge px-edge flex gap-2.5 overflow-x-auto">
          {articles.map((article) => (
            <SuggestedArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <p className="text-body text-text-4 py-6 text-center">
          아직 준비 중이에요!
        </p>
      )}
    </section>
  );
}
