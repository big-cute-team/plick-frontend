import Link from "next/link";
import { NewBadge } from "@plick/ui/NewBadge";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { VsMark } from "@plick/ui/VsMark";
import { TEAMS } from "@plick/domain/constants";
import {
  formatCount,
  formatRelativeTime,
  isRecentlyPublished,
  teamProfilePath,
} from "@plick/domain/format";
import type { ArticleCard, Filter } from "@plick/domain/types";
import { POST_TABLE_CELL_LG, POST_TABLE_GRID } from "@/_constants/app";
import type { PostListVariant } from "@/_types/app";
import { ArticleLink } from "@/_components/ArticleLink";

/**
 * 변형별 제목 heading 레벨 (KAN-380). 홈은 "새로 올라온 이슈" h2 섹션 안이라 h3고,
 * 기사 목록은 페이지 h1 바로 아래라 h2다. 레벨을 건너뛰면 보조기술이 목차를 못
 * 만든다. 시안(KAN-567)에서 두 변형의 행 모양은 같아졌고 heading만 다르다.
 */
const HEADING: Record<PostListVariant, "h2" | "h3"> = {
  news: "h3",
  article: "h2",
};

/**
 * 이슈 표의 한 행 (KAN-567, 시안 홈 표) — 팀 엠블럼 20, `VS` + 제목 13.5/700 한 줄
 * 말줄임 + 댓글 수 12.5/900 빨강 + 새 글 `N`, 출처 기자 12, 보도 시각 12, 조회 12,
 * 좋아요 12/700 강조색. 행 높이는 최소 38, hover에 연한 면. 홈, 기사 페이지, 이슈
 * 상세가 같이 쓴다. 전에는 로고 36~40에 제목 두 줄과 요약이 있는 카드 행이었는데
 * (KAN-482) 시안이 게시판 표라 여섯 열로 다시 짰다. 요약은 표에 자리가 없어 뺐다.
 *
 * 댓글 수는 `[96]`처럼 대괄호로 쓴다(시안 목록 표기 규칙). 0이면 그리지 않고,
 * 제목이 잘려도 숫자와 `VS`는 잘리지 않게 제목 박스 밖에 형제로 둔다.
 *
 * 행 전체가 `<a>`였을 때는 안에 링크를 둘 수 없어(중첩 앵커는 무효 HTML) 제목
 * 링크의 `::after`를 행 전체로 펼쳐 어디를 눌러도 기사로 가고, 엠블럼만
 * `relative z-10`으로 그 위에 올려 팀 프로필로 간다(모바일 `NewsItem`과 같은 수).
 * 그 `z-10`은 행 안에서만 뜻이 있어야 해서 행에 `isolate`를 건다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어서 첫 팀만 대표로 쓴다. 팀 탭을 보고
 * 있을 때는 기사의 첫 팀 대신 그 탭의 팀을 엠블럼으로 쓴다 (KAN-368, 모바일과
 * 동일). 기자는 대표 한 명만 표기하고 기자 프로필이 없어 링크가 아니다.
 *
 * 발행 30분 안의 기사는 `N` 배지를 단다 (KAN-481). 판정은 렌더 시각 기준이라
 * 서버 HTML과 클라 첫 렌더가 어긋날 수 있는데, 경계를 넘는 몇 초의 일이라 React가
 * 그 트리를 클라에서 다시 그리는 걸로 감수한다.
 *
 * @param post - 표시할 기사 카드
 * @param variant - 행 변형(news=홈, article=기사). heading 레벨만 다르다
 * @param filter - 지금 보고 있는 팀 탭. 팀이면 그 팀을 대표로 강제한다.
 */
export function PostListItem({
  post,
  variant,
  filter = "ALL",
  rank,
}: {
  post: ArticleCard;
  variant: PostListVariant;
  filter?: Filter;
  /** 목록 안 순위(0부터). 조회 기록의 `feed_rank`가 된다 (KAN-543). 순위 없는 자리는 생략 */
  rank?: number;
}) {
  const Title = HEADING[variant];
  const team =
    filter !== "ALL"
      ? TEAMS[filter]
      : post.teams[0]
        ? TEAMS[post.teams[0]]
        : null;
  const isNew = isRecentlyPublished(post.publishedAt);

  return (
    <article
      className={`${POST_TABLE_GRID} border-border-soft hover:bg-elevate-2 relative isolate min-h-9.5 border-b py-1.75`}
    >
      <span className="flex justify-center">
        {team && (
          <Link
            href={teamProfilePath(team.code)}
            aria-label={`${team.name} 프로필`}
            className="focus-visible:outline-accent relative z-10 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <TeamCrest team={team} size={20} />
          </Link>
        )}
      </span>
      <span className="flex min-w-0 items-center gap-1.75">
        {post.contentType === "DEBATE" && <VsMark />}
        <Title className="text-body text-text-strong min-w-0 truncate font-bold">
          <ArticleLink
            articleId={post.id}
            rank={rank}
            className="focus-visible:outline-accent after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            {post.title}
          </ArticleLink>
        </Title>
        {post.commentCount > 0 && (
          <span className="text-label-lg text-danger shrink-0 font-black">
            [{formatCount(post.commentCount)}]
          </span>
        )}
        {isNew && <NewBadge />}
      </span>
      <span className={`${POST_TABLE_CELL_LG} text-label text-text-3 truncate`}>
        {post.reporter?.name}
      </span>
      <span
        className="text-label text-text-3 text-center whitespace-nowrap"
        suppressHydrationWarning
      >
        {formatRelativeTime(post.publishedAt)}
      </span>
      <span
        className={`${POST_TABLE_CELL_LG} text-label text-text-3 text-center`}
      >
        {formatCount(post.views)}
      </span>
      <span
        className={`${POST_TABLE_CELL_LG} text-label text-accent text-center font-bold`}
      >
        {formatCount(post.likeCount)}
      </span>
    </article>
  );
}
