import { TEAMS } from "@plick/domain/constants";
import { formatCount } from "@plick/domain/format";
import type { ArticleCard } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { ArticleLink } from "@/_components/ArticleLink";

/**
 * "함께 보면 좋은 기사" 한 행 (KAN-567 시안 "관련 기사"). 엠블럼 26 + 제목 한 줄
 * (13.5/700, 넘치면 말줄임) + `[댓글]`(12.5/700 빨강), 행 밑은 목록 행 구분선이다.
 * 전에는 가로 스크롤 카드였는데(KAN-301) 시안이 이슈 목록과 같은 행이라 바꿨다.
 * 행 전체가 기사 세부로 가는 링크다. 댓글 0이면 빈 `[0]`이 소음이라 그리지 않는다.
 *
 * @param article - 관련 기사 카드
 */
export function SuggestedArticleRow({ article }: { article: ArticleCard }) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;

  return (
    <ArticleLink
      articleId={article.id}
      className="border-border-soft flex items-center gap-2.25 border-b py-3 active:opacity-70"
    >
      {team && <TeamCrest team={team} size={26} className="shrink-0" />}
      <span className="text-body text-text-strong min-w-0 flex-1 truncate leading-[1.42] font-bold tracking-tight">
        {article.title}
      </span>
      {article.commentCount > 0 && (
        <span className="text-label-lg text-danger shrink-0 font-bold">
          [{formatCount(article.commentCount)}]
        </span>
      )}
    </ArticleLink>
  );
}
