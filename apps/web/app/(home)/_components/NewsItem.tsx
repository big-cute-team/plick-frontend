import Link from "next/link";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { TEAMS } from "@/_lib/constants";
import { formatCount } from "@/_lib/format";
import type { FeedPost } from "@/_lib/types";

/** "지금 올라온 소식" 리스트의 한 줄. 클릭하면 릴스 딥링크로 이동한다. */
export function NewsItem({ post }: { post: FeedPost }) {
  return (
    <Link
      href={`/reels/${post.id}`}
      className="border-border focus-visible:outline-accent flex items-start gap-5 border-b py-5 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:-outline-offset-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-caption text-icon font-extrabold">
            {TEAMS[post.team].name}
          </span>
          <span className="text-caption text-text-4">{post.timeLabel}</span>
        </div>
        <h3 className="text-title text-text mt-1.5 line-clamp-2 leading-snug tracking-tight">
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
        className="rounded-card h-24 w-33 shrink-0"
      />
    </Link>
  );
}
