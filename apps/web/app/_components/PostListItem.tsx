import Link from "next/link";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { TEAMS } from "@plick/domain/constants";
import { formatCount } from "@plick/domain/format";
import type { FeedPost } from "@plick/domain/types";
import type { PostListVariant } from "@/_types/app";

const VARIANT: Record<
  PostListVariant,
  { row: string; title: string; thumb: string }
> = {
  news: {
    row: "gap-5 py-5",
    title: "text-title",
    thumb: "rounded-card h-24 w-33",
  },
  article: {
    row: "gap-3.5 py-4",
    title: "text-body-lg",
    thumb: "rounded-control size-21.5",
  },
};

/**
 * 피드 리스트의 한 줄 — 왼쪽 텍스트(팀·시각 / 제목 / 기자·조회·댓글) + 오른쪽 썸네일.
 * 클릭하면 해당 기사 세부(`/articles/[postId]`)로 이동한다. 홈·기사 페이지가 `variant`로 밀도만 바꿔 공용한다.
 */
export function PostListItem({
  post,
  variant,
}: {
  post: FeedPost;
  variant: PostListVariant;
}) {
  const v = VARIANT[variant];
  return (
    <Link
      href={`/articles/${post.id}`}
      className={`border-border focus-visible:outline-accent flex items-start border-b transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:-outline-offset-2 ${v.row}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-caption text-icon font-extrabold">
            {TEAMS[post.team].name}
          </span>
          <span className="text-caption text-text-4">{post.timeLabel}</span>
        </div>
        <h3
          className={`text-text text-title mt-1.5 line-clamp-2 leading-snug font-bold tracking-tight ${v.title}`}
        >
          {post.title}
        </h3>
        <p className="text-caption text-text-3 mt-1.5 flex flex-wrap items-center gap-x-2">
          <span className="text-text-2 font-semibold">
            {post.reporter.name}
          </span>
          <span>·</span>
          <span>조회 {formatCount(post.views)}</span>
          <span>·</span>
          <span>댓글 {post.commentCount}</span>
        </p>
      </div>
      <MediaThumb
        colorVar={TEAMS[post.team].colorVar}
        className={`shrink-0 ${v.thumb}`}
      />
    </Link>
  );
}
