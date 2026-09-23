import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import {
  formatCount,
  formatRelativeTime,
  teamProfilePath,
} from "@plick/domain/format";
import type { HotArticle } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { ArticleLink } from "@/_components/ArticleLink";

/**
 * 사진 없는 핫이슈 텍스트 카드 (KAN-480, 시안 KAN-567) — 사진 카드 트랙 아래에서
 * 점으로 넘긴다. 첫 줄은 순위 배지(19px, 회색 면)·팀·VS·시각, 둘째 줄은 제목
 * 한 줄(14/700) + `[댓글]`(빨강), 셋째 줄은 한 줄 요약(12, text-3)이다.
 *
 * 순위 배지가 사진 카드와 달리 회색인 건 시안 그대로다 — 사진 카드 뒤에 이어
 * 붙는 순위라 톤을 낮춘다. 시각은 핫이슈 응답에 발행 시각이 있어 그대로 쓴다.
 * 시안의 VS 표시는 핫이슈 응답에 `contentType`이 없어 못 단다(백엔드 후속 티켓).
 *
 * @param article - 핫이슈 기사 (사진 없는 그룹)
 * @param rank - 핫이슈 안 순위(0부터). 조회 기록의 `feed_rank`가 된다 (KAN-543)
 */
export function HotTextCard({
  article,
  rank,
}: {
  article: HotArticle;
  rank: number;
}) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;

  return (
    <div className="relative min-h-18.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="bg-avatar text-text-2 rounded-badge text-micro-lg grid size-4.75 shrink-0 place-items-center font-black">
          {rank + 1}
        </span>
        {team && (
          <Link
            href={teamProfilePath(team.code)}
            className="relative z-10 flex items-center gap-1.5 active:opacity-60"
          >
            <TeamCrest team={team} size={13} />
            <span className="text-micro-lg text-text-3 font-bold">
              {team.name}
            </span>
          </Link>
        )}
        <span className="flex-1" />
        <span
          className="text-micro-lg text-text-4 shrink-0"
          suppressHydrationWarning
        >
          {formatRelativeTime(article.publishedAt)}
        </span>
      </div>
      <div className="flex items-baseline gap-1.25">
        <h3 className="text-body-md text-text-strong tracking-section min-w-0 flex-1 truncate leading-[1.42] font-bold">
          {article.title}
        </h3>
        {article.commentCount > 0 && (
          <span className="text-body text-danger shrink-0 font-bold">
            [{formatCount(article.commentCount)}]
          </span>
        )}
      </div>
      {article.summaryShort && (
        <p className="text-label text-text-3 mt-1.25 line-clamp-2 leading-normal">
          {article.summaryShort}
        </p>
      )}
      <ArticleLink
        articleId={article.id}
        rank={rank}
        aria-label={article.title}
        className="absolute inset-0"
      />
    </div>
  );
}
