import Link from "next/link";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { HeartMiniIcon } from "@plick/ui/icons";
import { TEAMS } from "@plick/domain/constants";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import type { ArticleCard } from "@plick/domain/types";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import type { PostListVariant } from "@/_types/app";

const VARIANT: Record<
  PostListVariant,
  { row: string; title: string; thumb: string; crest: number }
> = {
  news: {
    row: "gap-5 py-5",
    title: "text-title",
    thumb: "rounded-card h-24 w-33",
    crest: 32,
  },
  article: {
    row: "gap-3.5 py-4",
    title: "text-body-lg",
    thumb: "rounded-control size-21.5",
    crest: 28,
  },
};

/**
 * 피드 리스트의 한 줄 — 왼쪽 텍스트(팀·시각 / 제목 / 기자·조회·댓글) + 오른쪽 썸네일·팀 로고.
 * 클릭하면 해당 기사 세부(`/articles/[postId]`)로 이동한다. 홈·기사 페이지가 `variant`로 밀도만 바꿔 공용한다.
 *
 * 행 맨 오른쪽에는 대표 팀 로고(`TeamCrest`)를 세로 중앙으로 붙인다(KAN-338).
 * 팀이 없는 기사는 로고 자리도 그리지 않는다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어서 첫 팀만 대표로 쓰고, 없으면
 * 팀 이름 자리를 비운다. 기자 이름도 원문이 없으면 빠진다. 사진이 null이면
 * 썸네일 자리를 아예 그리지 않고 텍스트가 전체 폭을 쓴다(모바일 KAN-284와 동일).
 *
 * @param post - 표시할 기사 카드
 * @param variant - 행 변형(news=홈, article=기사)
 */
export function PostListItem({
  post,
  variant,
}: {
  post: ArticleCard;
  variant: PostListVariant;
}) {
  const v = VARIANT[variant];
  const team = post.teams[0] ? TEAMS[post.teams[0]] : null;

  return (
    <Link
      href={`/articles/${post.id}`}
      className={`border-border focus-visible:outline-accent flex items-start border-b transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:-outline-offset-2 ${v.row}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {team && (
            <span className="text-caption text-icon font-extrabold">
              {team.name}
            </span>
          )}
          <span className="text-caption text-text-4" suppressHydrationWarning>
            {formatRelativeTime(post.publishedAt)}
          </span>
        </div>
        <h3
          className={`text-text text-title mt-1.5 line-clamp-2 leading-snug font-bold tracking-tight ${v.title}`}
        >
          {post.title}
        </h3>
        <p className="text-caption text-text-3 mt-1.5 flex flex-wrap items-center gap-x-2">
          {post.reporter && (
            <>
              <span className="text-text-2 font-semibold">
                {post.reporter.name}
              </span>
              <span>·</span>
            </>
          )}
          {/* 목록에서는 좋아요를 보여주기만 한다 — 누르는 건 릴스와 기사 세부에서.
              이웃한 조회·댓글과 달리 글자 없이 하트로만 표시한다 (KAN-308, 모바일과 동일).
              내가 눌렀는지는 칠하지 않는다 — 목록 응답은 익명으로 받아
              `liked`가 늘 false다. */}
          <span className="inline-flex items-center gap-0.75">
            <HeartMiniIcon />
            {formatCount(post.likeCount)}
          </span>
          <span>·</span>
          <span>조회 {formatCount(post.views)}</span>
          <span>·</span>
          <span>댓글 {post.commentCount}</span>
        </p>
      </div>
      {post.imageUrl && (
        <MediaThumb
          colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
          imageUrl={post.imageUrl}
          className={`shrink-0 ${v.thumb}`}
        />
      )}
      {team && (
        <TeamCrest
          team={team}
          size={v.crest}
          className="shrink-0 self-center"
        />
      )}
    </Link>
  );
}
