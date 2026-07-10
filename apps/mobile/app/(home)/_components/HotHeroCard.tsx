import Link from "next/link";
import { formatCount } from "@/_lib/format";
import { STAGE_META, TEAMS } from "@/_lib/constants";
import type { FeedPost } from "@/_lib/types";
import { MediaThumb } from "@/_components/MediaThumb";

/**
 * 핫이슈 히어로 카드 — 사진(placeholder) 위에 어두운 스크림 + 흰 텍스트.
 *
 * 스크림은 이미지 가독성용 고정 값(테마 무관)이고, 팀·강조색은 토큰을 쓴다.
 * 탭하면 해당 게시물의 릴스 딥링크(`/reels/[postId]`)로 이동한다.
 */
export function HotHeroCard({ post }: { post: FeedPost }) {
  const stage = STAGE_META[post.stage];
  return (
    <Link href={`/reels/${post.id}`} className="block h-full">
      <MediaThumb team={post.team} className="rounded-hero h-full">
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4"
          style={{
            backgroundImage:
              "linear-gradient(to top, color-mix(in srgb, var(--plk-scrim) 92%, transparent) 0%, color-mix(in srgb, var(--plk-scrim) 55%, transparent) 55%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-caption text-media-on font-extrabold">
              {TEAMS[post.team].name}
            </span>
            <span className="text-media-on/50 text-micro font-bold tracking-wider">
              {stage.label}
            </span>
          </div>
          <h3 className="text-title text-media-on line-clamp-2 leading-tight font-extrabold">
            {post.title}
          </h3>
          <p className="text-caption text-media-on/75">
            <span className="font-semibold">{post.reporter.name}</span>
            <span className="text-media-on/50">
              {" · "}
              {post.timeLabel} · 조회 {formatCount(post.views)}
            </span>
          </p>
        </div>
      </MediaThumb>
    </Link>
  );
}
