import { TEAMS } from "@plick/domain/constants";
import { formatCount } from "@plick/domain/format";
import type { ArticleCard } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { ArticleLink } from "@/_components/ArticleLink";

/**
 * "함께 보면 좋은 기사" 가로 스크롤 카드 한 장 (KAN-668). 엠블럼 22 + 제목 두 줄
 * (12.5/700, 넘치면 말줄임) + `[댓글]`(11.5/700 빨강)을 `elevate` 면에 얹는다. 폭은
 * 13rem으로 고정해 폰 화면에 한 장 반이 보여 옆으로 더 있다는 걸 알린다.
 * 카드 전체가 기사 세부로 가는 링크다. 댓글 0이면 빈 `[0]`이 소음이라 그리지 않는다.
 *
 * 전에는 이슈 목록과 같은 세로 행이었다(KAN-567 시안). 다섯 행이 본문 밑을 한 화면 가까이
 * 차지해 그 밑에 댓글이 있다는 걸 폰에서 알아채기 어려웠다(KAN-668). KAN-301 때도 가로
 * 카드였는데 그때는 기자·시각·썸네일까지 실어 높이가 컸고, 이번엔 한 줄 높이로 눌렀다.
 *
 * @param article - 관련 기사 카드
 */
export function SuggestedArticleCard({ article }: { article: ArticleCard }) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;

  return (
    <ArticleLink
      articleId={article.id}
      className="bg-elevate rounded-tile flex w-52 items-center gap-2 px-3 py-2.5 active:opacity-70"
    >
      {team && <TeamCrest team={team} size={22} className="shrink-0" />}
      <span className="text-label-lg text-text-strong line-clamp-2 min-w-0 flex-1 leading-[1.35] font-bold tracking-tight">
        {article.title}
      </span>
      {article.commentCount > 0 && (
        <span className="text-caption-lg text-danger-strong shrink-0 font-bold">
          [{formatCount(article.commentCount)}]
        </span>
      )}
    </ArticleLink>
  );
}
