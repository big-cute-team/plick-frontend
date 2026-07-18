import Link from "next/link";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { TEAMS } from "@plick/domain/constants";
import type { FeedPost } from "@plick/domain/types";

/**
 * "함께 보면 좋은 기사" 리스트 한 줄 — 좌측 팀·제목·기자, 우측 정사각 썸네일.
 *
 * 모바일 세부 하단 전용 컴팩트 행(피그마 S1 301:173). 데스크톱은 미디어 스크림
 * 카드(`SuggestedArticleCard`)라 레이아웃이 달라 앱별로 둔다. 탭하면 해당 기사
 * 세부(`/articles/[postId]`)로 이동한다.
 */
export function SuggestedArticleItem({ post }: { post: FeedPost }) {
  const team = TEAMS[post.team];
  return (
    <Link
      href={`/articles/${post.id}`}
      className="border-border flex items-start gap-3.5 border-b py-4 active:opacity-70"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-caption text-icon font-extrabold">
            {team.name}
          </span>
          <span className="text-caption text-text-4">{post.timeLabel}</span>
        </div>
        <h3 className="text-body-lg text-text line-clamp-2 leading-snug tracking-tight">
          {post.title}
        </h3>
        <span className="text-caption text-text-2 font-semibold">
          {post.reporter.name}
        </span>
      </div>
      <MediaThumb
        colorVar={team.colorVar}
        className="rounded-control size-20 shrink-0"
      />
    </Link>
  );
}
