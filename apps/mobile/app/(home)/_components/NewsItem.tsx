import Link from "next/link";
import { formatCount } from "@plick/domain/format";
import { TEAMS } from "@plick/domain/constants";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import type { ArticleCard } from "@/_types/articles";
import { formatRelativeTime } from "@/_utils/time";

/**
 * "지금 올라온 소식" 리스트의 한 줄. 탭하면 기사 세부 페이지로 이동한다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어서 첫 팀만 대표로 쓰고, 없으면
 * 팀 이름 자리를 비운다. 기자 이름도 원문이 없으면 빠진다.
 */
export function NewsItem({ article }: { article: ArticleCard }) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;

  return (
    <Link
      href={`/articles/${article.id}`}
      className="border-border gap-gap flex items-start border-b py-3 active:opacity-70"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {team && (
            <span className="text-caption text-icon font-extrabold">
              {team.name}
            </span>
          )}
          <span className="text-caption text-text-4" suppressHydrationWarning>
            {formatRelativeTime(article.publishedAt)}
          </span>
        </div>
        <h4 className="text-body text-text mt-1 line-clamp-2 leading-snug font-bold">
          {article.title}
        </h4>
        <p className="text-caption text-text-3 mt-1 flex flex-wrap items-center gap-x-1.5">
          {article.reporter && (
            <>
              <span className="text-text-2 font-semibold">
                {article.reporter.name}
              </span>
              <span>·</span>
            </>
          )}
          <span>조회 {formatCount(article.views)}</span>
          <span>·</span>
          <span>댓글 {article.commentCount}</span>
        </p>
      </div>
      <MediaThumb
        colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
        className="rounded-control size-14 shrink-0"
      />
    </Link>
  );
}
