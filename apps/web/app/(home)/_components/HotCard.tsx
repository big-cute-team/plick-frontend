import Link from "next/link";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { STAGE_META, TEAMS } from "@/_lib/constants";
import { formatCount } from "@/_lib/format";
import type { FeedPost } from "@/_lib/types";

/**
 * 핫이슈 카드 — 사진(placeholder) 위 어두운 스크림 + 흰 텍스트.
 *
 * 스크림은 이미지 가독성용 고정 값(테마 무관)이고, 팀·강조색은 토큰을 쓴다.
 * 클릭하면 해당 기사 세부(`/articles/[postId]`)로 이동한다.
 *
 * @param size - `lg`는 좌측 히어로(그리드 셀 높이를 꽉 채움), `sm`은 우측 서브 카드
 */
export function HotCard({ post, size }: { post: FeedPost; size: "lg" | "sm" }) {
  const lg = size === "lg";
  return (
    <Link
      href={`/articles/${post.id}`}
      className={`focus-visible:outline-accent rounded-hero group block transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 ${
        lg ? "aspect-video lg:aspect-auto lg:h-full" : "aspect-[9/5]"
      }`}
    >
      <MediaThumb
        colorVar={TEAMS[post.team].colorVar}
        className="rounded-hero h-full"
      >
        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col gap-2 ${
            lg ? "px-6 pt-22 pb-5.5" : "px-4 pt-14 pb-4"
          }`}
          style={{
            backgroundImage:
              "linear-gradient(to top, color-mix(in srgb, var(--plk-scrim) 92%, transparent) 0%, color-mix(in srgb, var(--plk-scrim) 55%, transparent) 55%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-caption text-media-on font-extrabold">
              {TEAMS[post.team].name}
            </span>
            {/* 피그마 W1은 단계 라벨을 RUMOUR일 때만 노출한다 */}
            {post.stage === "RUMOUR" && (
              <span className="text-media-on-dim text-micro tracking-label font-bold">
                {STAGE_META[post.stage].label}
              </span>
            )}
          </div>
          <h3
            className={`text-media-on tracking-heading line-clamp-2 font-extrabold ${
              lg ? "text-hero" : "text-hero-sm"
            }`}
          >
            {post.title}
          </h3>
          <p className="text-caption">
            <span className="text-media-on/85 font-semibold">
              {post.reporter.name}
            </span>
            <span className="text-media-on-dim">
              {" · "}
              {post.timeLabel} · 조회 {formatCount(post.views)}
            </span>
          </p>
        </div>
      </MediaThumb>
    </Link>
  );
}
