import Link from "next/link";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { TEAMS } from "@/_lib/constants";
import { formatCount } from "@/_lib/format";
import type { FeedPost } from "@/_lib/types";

/**
 * 기사 리스트의 한 줄 — 왼쪽 텍스트 블록(팀·시각 / 제목 / 기자·조회·댓글) + 오른쪽 정사각 썸네일.
 * 홈의 `NewsItem`(가로형 썸네일)과 달리 기사 페이지는 더 촘촘한 정사각 썸네일 행이다.
 * 클릭하면 릴스 딥링크로 이동한다.
 */
export function ArticleItem({ post }: { post: FeedPost }) {
  return (
    <Link
      href={`/reels/${post.id}`}
      className="border-border focus-visible:outline-accent flex items-start gap-3.5 border-b py-4 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:-outline-offset-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-caption text-icon font-extrabold">
            {TEAMS[post.team].name}
          </span>
          <span className="text-caption text-text-4">{post.timeLabel}</span>
        </div>
        <h3 className="text-body-lg text-text mt-1.5 line-clamp-2 leading-snug tracking-tight">
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
        className="rounded-control size-21.5 shrink-0"
      />
    </Link>
  );
}
