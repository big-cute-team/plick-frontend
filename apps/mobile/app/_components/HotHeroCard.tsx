import Link from "next/link";
import { STAGE_META, formatCount } from "../_lib/format";
import { TEAMS } from "../_lib/mock";
import type { FeedPost } from "../_lib/types";
import { MediaThumb } from "./MediaThumb";

// 핫이슈 히어로 카드. 사진(placeholder) 위에 어두운 스크림 + 흰 텍스트.
// 스크림은 이미지 가독성용 고정 값(테마 무관), 팀·강조색은 토큰.
export function HotHeroCard({ post }: { post: FeedPost }) {
  const stage = STAGE_META[post.stage];
  return (
    <Link href={`/reels/${post.id}`} className="block h-full">
      <MediaThumb team={post.team} className="rounded-hero h-full">
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(6,8,14,0.92) 0%, rgba(6,8,14,0.55) 55%, rgba(6,8,14,0) 100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-caption text-media-on font-extrabold">
              {TEAMS[post.team].name}
            </span>
            <span className="text-media-on/50 text-[10px] font-bold tracking-wider">
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
