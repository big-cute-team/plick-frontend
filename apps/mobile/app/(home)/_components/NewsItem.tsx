import Link from "next/link";
import { formatCount } from "@/_lib/format";
import { TEAMS } from "@/_lib/constants";
import type { FeedPost } from "@/_lib/types";
import { MediaThumb } from "@plick/ui/MediaThumb";

/** "지금 올라온 소식" 리스트의 한 줄. 탭하면 기사 세부 페이지로 이동한다. */
export function NewsItem({ post }: { post: FeedPost }) {
  return (
    <Link
      href={`/articles/${post.id}`}
      className="border-border gap-gap flex items-start border-b py-3 active:opacity-70"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-caption text-icon font-extrabold">
            {TEAMS[post.team].name}
          </span>
          <span className="text-caption text-text-4">{post.timeLabel}</span>
        </div>
        <h4 className="text-body text-text mt-1 line-clamp-2 leading-snug font-bold">
          {post.title}
        </h4>
        <p className="text-caption text-text-3 mt-1 flex flex-wrap items-center gap-x-1.5">
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
        className="rounded-control size-14 shrink-0"
      />
    </Link>
  );
}
