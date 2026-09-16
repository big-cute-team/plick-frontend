import Link from "next/link";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { NewBadge } from "@plick/ui/NewBadge";
import { TEAMS } from "@plick/domain/constants";
import { formatRelativeTime, isRecentlyPublished } from "@plick/domain/format";
import type { ArticleCard, Filter } from "@plick/domain/types";
import type { PostListVariant } from "@/_types/app";

/**
 * 변형별 밀도와 제목 heading 레벨 (KAN-380).
 *
 * heading이 변형마다 다른 건 이 줄이 놓이는 자리가 달라서다. 홈은 "지금 올라온
 * 소식" h2 섹션 안이라 h3고, 기사 목록은 페이지 h1("기사") 바로 아래라 h2다.
 * 레벨을 건너뛰면 보조기술이 목차를 못 만든다. 글자 크기는 `title` 클래스가
 * 정하므로 태그가 바뀌어도 보이는 결과는 같다.
 */
const VARIANT: Record<
  PostListVariant,
  {
    row: string;
    title: string;
    crest: number;
    heading: "h2" | "h3";
  }
> = {
  news: {
    row: "gap-5 py-5",
    title: "text-title",
    crest: 40,
    heading: "h3",
  },
  article: {
    row: "gap-3.5 py-4",
    title: "text-body-lg",
    crest: 36,
    heading: "h2",
  },
};

/**
 * 피드 리스트의 한 줄 — 왼쪽 팀 로고, 가운데 제목·요약, 오른쪽 시각·기자명.
 * 클릭하면 해당 기사 세부(`/articles/[postId]`)로 이동한다. 홈·기사 페이지가
 * `variant`로 밀도만 바꿔 공용한다.
 *
 * KAN-482에서 모바일 `NewsItem`과 같은 세 칸 구성으로 다시 짰다. 그전에는
 * 팀명·시각이 제목 위에, 기자명·좋아요·조회·댓글이 제목 아래에 깔리고 로고와
 * 썸네일이 오른쪽에 붙어 있었다. 집계 숫자와 썸네일은 뺐다 — 리스트에서 읽을
 * 것은 제목과 요약이고 나머지는 기사 세부에 있다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어서 첫 팀만 대표로 쓴다. 팀이 없는
 * 기사는 로고 자리를 그리지 않고 제목이 왼쪽 끝부터 찬다. 기자 이름도 원문이
 * 없으면 빠진다.
 *
 * 팀 탭을 보고 있을 때는 기사의 첫 팀 대신 그 탭의 팀을 로고로 쓴다 (KAN-368,
 * 모바일과 동일) — 팀별 목록에서 다른 팀 표식이 섞여 보이는 걸 막는다. 전체
 * 탭은 기존대로 기사의 첫 팀이다.
 *
 * 발행 30분 안의 기사는 시각 옆에 NEW 태그를 단다 (KAN-481). 하이드레이션
 * 경계 사정은 모바일 `NewsItem`과 같다.
 *
 * 오른쪽 칸은 고정폭(`w-28`)이다. 기자 이름 길이에 따라 칸이 늘었다 줄었다 하면
 * 행마다 제목 폭이 달라져 리스트가 들쭉날쭉해진다. 넘치는 이름은 `truncate`가
 * `…`으로 자른다.
 *
 * @param post - 표시할 기사 카드
 * @param variant - 행 변형(news=홈, article=기사)
 * @param filter - 지금 보고 있는 팀 탭. 팀이면 그 팀을 대표로 강제한다.
 */
export function PostListItem({
  post,
  variant,
  filter = "ALL",
}: {
  post: ArticleCard;
  variant: PostListVariant;
  filter?: Filter;
}) {
  const v = VARIANT[variant];
  const Title = v.heading;
  const team =
    filter !== "ALL"
      ? TEAMS[filter]
      : post.teams[0]
        ? TEAMS[post.teams[0]]
        : null;
  const isNew = isRecentlyPublished(post.publishedAt);
  // BE 실데이터는 한 줄 요약이 전 건 채워져 있지만 계약상 null이 가능해
  // 긴 요약으로 떨어뜨린다 — 어느 쪽이든 길이는 보장이 없어 한 줄로 자른다
  const summary = (post.summaryShort ?? post.summary).trim();

  return (
    <Link
      href={`/articles/${post.id}`}
      className={`border-border focus-visible:outline-accent flex items-start border-b transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:-outline-offset-2 ${v.row}`}
    >
      {team && (
        <TeamCrest
          team={team}
          size={v.crest}
          className="shrink-0 self-center"
        />
      )}
      <div className="min-w-0 flex-1">
        <Title
          className={`text-text mt-0.5 line-clamp-2 leading-snug font-bold tracking-tight ${v.title}`}
        >
          {post.title}
        </Title>
        {summary && (
          <p className="text-body text-text-3 mt-1.5 truncate">{summary}</p>
        )}
      </div>
      <div className="flex w-28 shrink-0 flex-col items-end gap-1">
        {/* 시각과 NEW가 한 줄에 다 안 들어가는 폭에서는 태그가 아랫줄로 내려간다 */}
        <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
          <span className="text-caption text-text-4" suppressHydrationWarning>
            {formatRelativeTime(post.publishedAt)}
          </span>
          {isNew && <NewBadge />}
        </div>
        {post.reporter && (
          <span className="text-caption text-text-2 max-w-full truncate font-semibold">
            {post.reporter.name}
          </span>
        )}
      </div>
    </Link>
  );
}
