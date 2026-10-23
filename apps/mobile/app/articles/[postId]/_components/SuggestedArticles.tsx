import type { ArticleCard } from "@plick/domain/types";
import { SuggestedArticleCard } from "./SuggestedArticleCard";

/**
 * 기사 세부 "함께 보면 좋은 기사" 섹션 (KAN-301, 시안 KAN-567 "관련 기사", KAN-668 가로 전환).
 * 섹션 제목(15/900) 밑에 카드 한 줄이 옆으로 밀린다. 트랙은 좌우 `edge` 여백을 음수
 * 마진으로 먹고 같은 만큼 안쪽 패딩을 줘, 카드가 화면 끝까지 흐르되 멈춘 자리는
 * 본문 글줄과 나란하다. `li`가 flex라 카드가 줄 높이까지 늘어나 제목 줄 수가 달라도
 * 높이가 맞는다. 세로 다섯 행이던 때보다 섹션 높이가 1/3 가까이로 줄었다.
 * 자리는 댓글 밑이다(KAN-676). 기사 세부의 마지막 섹션이다.
 *
 * 페이지 서버 컴포넌트가 팀태그 기반 관련 기사(`getRelatedArticles`, KAN-338)를
 * 받아 `ArticleBody.suggested`로 넘긴다. 팀태그가 없거나 같은 팀 기사가 더
 * 없으면 빈 목록이라 빈 문구가 나온다.
 *
 * @param articles - 관련 기사 목록. 비어 있으면 카드 대신 빈 문구를 둔다.
 */
export function SuggestedArticles({ articles }: { articles: ArticleCard[] }) {
  return (
    <section className="px-edge pt-6.5">
      <h2 className="text-body-lg text-text-strong tracking-section pb-2 font-black">
        함께 보면 좋은 기사
      </h2>
      {articles.length > 0 ? (
        <ul className="no-scrollbar -mx-edge px-edge flex items-stretch gap-2 overflow-x-auto">
          {articles.map((article) => (
            <li key={article.id} className="flex shrink-0">
              <SuggestedArticleCard article={article} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-text-4 py-3 text-center">
          함께 볼 기사가 아직 없어요
        </p>
      )}
    </section>
  );
}
