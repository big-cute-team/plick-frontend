import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import {
  formatCount,
  formatRelativeTime,
  isRecentlyPublished,
  teamProfilePath,
} from "@plick/domain/format";
import type { ArticleCard, Filter } from "@plick/domain/types";
import { NewBadge } from "@plick/ui/NewBadge";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { VsMark } from "@plick/ui/VsMark";
import { ArticleLink } from "@/_components/ArticleLink";

/**
 * 이슈 목록 행 (시안 KAN-567 "이슈 목록 행") — 홈, 기사 페이지, MY 좋아요 탭, 프로필
 * 관련 이슈가 같이 쓴다. 탭하면 기사 세부로 간다.
 *
 * 세 칸이다. 왼쪽 엠블럼 36px, 가운데 `VS` + 제목 한 줄(14/700, 넘치면 말줄임) +
 * `[댓글]`(13.5/700 빨강)과 그 밑 한 줄 요약(12, text-3), 오른쪽 88px 고정 칼럼에
 * 시각(11, text-4)과 새 글 `N` 배지, 그 밑 기자명(11/700, text-3)이다. `[댓글]`과
 * VS는 잘리는 제목 박스 밖에 형제로 둔다 — 시안 규칙이다. 댓글 0이면 빈 `[0]`이
 * 소음이라 그리지 않는다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어서 첫 팀만 대표로 쓴다. 팀 탭을 보고
 * 있을 때는 기사의 첫 팀 대신 그 탭의 팀을 엠블럼으로 쓴다 (KAN-368). 기자는
 * 대표 한 명만 표기한다("외 N명"·등급은 시안 규칙으로 뺐다).
 *
 * 발행 30분 안의 기사는 시각 옆에 N 배지를 단다 (KAN-481). 판정은 렌더 시각
 * 기준이라 서버 HTML과 클라 첫 렌더가 어긋날 수 있는데, 경계를 넘는 몇 초의
 * 일이라 React가 그 트리를 클라에서 다시 그리는 걸로 감수한다.
 *
 * 행 전체가 `<a>`였을 때는 안에 링크를 둘 수 없어(중첩 앵커는 무효 HTML) 제목 링크의
 * `::after`를 행 전체로 펼쳐 어디를 눌러도 기사로 가고, 엠블럼만 `relative z-10`으로
 * 그 위에 올려 팀 프로필로 간다. 그 `z-10`은 행 안에서만 뜻이 있어야 해서 행에
 * `isolate`를 건다 (KAN-514).
 *
 * @param article - 표시할 기사 카드
 * @param filter - 지금 보고 있는 팀 탭. 팀이면 그 팀을 대표로 강제한다.
 * @param rank - 목록 안 순위(0부터). 조회 기록의 `feed_rank`가 된다 (KAN-543)
 */
export function NewsItem({
  article,
  filter = "ALL",
  rank,
}: {
  article: ArticleCard;
  filter?: Filter;
  rank?: number;
}) {
  const team =
    filter !== "ALL"
      ? TEAMS[filter]
      : article.teams[0]
        ? TEAMS[article.teams[0]]
        : null;
  const isNew = isRecentlyPublished(article.publishedAt);
  // 계약상 한 줄 요약이 null일 수 있어 긴 요약으로 떨어뜨린다 — 어느 쪽이든 한 줄로 자른다
  const summary = (article.summaryShort ?? article.summary).trim();

  return (
    <article className="border-border-soft relative isolate flex items-center gap-2.5 border-b py-3 active:opacity-70">
      {team && (
        <Link
          href={teamProfilePath(team.code)}
          aria-label={`${team.name} 프로필`}
          className="relative z-10 shrink-0"
        >
          <TeamCrest team={team} size={36} />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1">
          {article.contentType === "DEBATE" && <VsMark />}
          {/* 섹션 제목이 h2라 카드 제목은 h3다 */}
          <h3 className="text-body-md text-text-strong min-w-0 flex-1 truncate leading-[1.4] font-bold tracking-tight">
            <ArticleLink
              articleId={article.id}
              rank={rank}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {article.title}
            </ArticleLink>
          </h3>
          {article.commentCount > 0 && (
            <span className="text-body text-danger shrink-0 font-bold">
              [{formatCount(article.commentCount)}]
            </span>
          )}
        </div>
        {summary && (
          <p className="text-label text-text-3 mt-1 truncate">{summary}</p>
        )}
      </div>
      <div className="w-reporter flex shrink-0 flex-col items-end gap-0.75">
        <div className="flex items-center gap-1">
          <span className="text-caption text-text-4" suppressHydrationWarning>
            {formatRelativeTime(article.publishedAt)}
          </span>
          {isNew && <NewBadge />}
        </div>
        {article.reporter && (
          <span className="text-caption text-text-3 max-w-full truncate font-bold">
            {article.reporter.name}
          </span>
        )}
      </div>
    </article>
  );
}
