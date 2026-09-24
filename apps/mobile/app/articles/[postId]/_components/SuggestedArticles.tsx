import type { ArticleCard } from "@plick/domain/types";
import { SuggestedArticleRow } from "./SuggestedArticleRow";

/**
 * 기사 세부 "함께 보면 좋은 기사" 섹션 (KAN-301, 시안 KAN-567 "관련 기사").
 * 섹션 제목(15/900) 밑에 이슈 목록 행과 같은 관련 기사 행이 쌓인다.
 *
 * 페이지 서버 컴포넌트가 팀태그 기반 관련 기사(`getRelatedArticles`, KAN-338)를
 * 받아 `ArticleBody.suggested`로 넘긴다. 팀태그가 없거나 같은 팀 기사가 더
 * 없으면 빈 목록이라 빈 문구가 나온다.
 *
 * @param articles - 관련 기사 목록. 비어 있으면 행 대신 빈 문구를 둔다.
 */
export function SuggestedArticles({ articles }: { articles: ArticleCard[] }) {
  return (
    <section className="px-edge pt-6.5">
      <h2 className="text-body-lg text-text-strong tracking-section pb-1 font-black">
        함께 보면 좋은 기사
      </h2>
      {articles.length > 0 ? (
        articles.map((article) => (
          <SuggestedArticleRow key={article.id} article={article} />
        ))
      ) : (
        <p className="text-body text-text-4 py-6 text-center">
          함께 볼 기사가 아직 없어요
        </p>
      )}
    </section>
  );
}
