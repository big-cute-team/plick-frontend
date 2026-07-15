import { TEAMS } from "@/_lib/constants";
import type { FeedPost } from "@/_lib/types";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { PostChips } from "@plick/ui/PostChips";
import { ReporterTierBadge } from "@plick/ui/ReporterTierBadge";
import { ReelActionRail } from "./ReelActionRail";

/**
 * 데스크톱 릴 한 장 — 9:16 미디어 카드(칩·제목·기자 오버레이) + 우측 액션 레일.
 *
 * 카드는 가용 높이를 채우되(`h-full`), 좁은 화면에선 `max-w-full`로 폭을 제한해
 * 레일과 나란히 있어도 가로로 넘치지 않는다(미디어는 그라데이션 placeholder라
 * 폭이 줄어 비율이 눌려도 시각적 문제 없음).
 */
export function ReelCard({ post }: { post: FeedPost }) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-4 lg:gap-6.5">
      <MediaThumb
        colorVar={TEAMS[post.team].colorVar}
        className="rounded-hero aspect-[9/16] h-full max-h-[760px] w-auto max-w-full min-w-0"
      >
        {/* 하단 정보 블록 — 스크림 위 칩·제목·기자 */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-2.75 px-5.5 pt-30 pb-8"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--plk-scrim) 55%, transparent) 35%, color-mix(in srgb, var(--plk-scrim) 92%, transparent) 100%)",
          }}
        >
          <PostChips
            teamName={TEAMS[post.team].name}
            rumour={post.stage === "RUMOUR"}
          />
          <span className="text-headline text-media-on font-extrabold">
            {post.title}
          </span>
          <span className="flex items-center gap-2.25">
            <ReporterTierBadge reporter={post.reporter} />
            <span className="text-body text-media-on font-bold">
              {post.reporter.name}
            </span>
            <span className="text-label text-media-on-dim">
              · {post.timeLabel}
            </span>
          </span>
        </div>
      </MediaThumb>
      <ReelActionRail post={post} />
    </div>
  );
}
