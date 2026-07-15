"use client";

import { TEAMS } from "@/_lib/constants";
import type { FeedPost } from "@/_lib/types";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { PostChips } from "@plick/ui/PostChips";
import { ReporterTierBadge } from "@plick/ui/ReporterTierBadge";
import { ReelActionRail } from "./ReelActionRail";

/**
 * 릴 한 장 — 9:16 미디어 카드(칩·제목·기자 오버레이) + 액션 레일.
 *
 * 카드는 가용 높이를 채운다(`h-full`). 레일 배치는 뷰포트에 따라 다르다:
 * - **데스크톱(lg↑)**: 카드 밖 오른쪽에 flex 형제로 나란히.
 * - **모바일 뷰**: 사진이 좁아지지 않도록 카드 안 우측에 오버레이하고(우측 스크림으로
 *   가독성 확보), 카드는 `max-w-full`로 가용 폭을 꽉 채운다.
 *
 * @param onOpenDetail - 제목 영역·댓글 버튼 클릭 시 세부 패널을 여는 콜백(KAN-219)
 */
export function ReelCard({
  post,
  onOpenDetail,
}: {
  post: FeedPost;
  onOpenDetail: () => void;
}) {
  return (
    <div className="flex h-full w-full items-end justify-center gap-4 lg:gap-6.5">
      <MediaThumb
        colorVar={TEAMS[post.team].colorVar}
        className="rounded-hero aspect-[9/16] h-full max-h-[760px] w-auto max-w-full min-w-0"
      >
        {/* 모바일 전용 우측 스크림 — 카드 안 오버레이 레일 가독성용(테마 무관 고정) */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-24 lg:hidden"
          style={{
            backgroundImage:
              "linear-gradient(to left, color-mix(in srgb, var(--plk-scrim) 45%, transparent), transparent)",
          }}
        />

        {/* 하단 정보 블록 — 스크림 위 칩·제목·기자.
            모바일에선 우측에 레일이 겹치므로 pr-16으로 자리를 비운다. */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-2.75 pt-30 pr-16 pb-8 pl-5.5 lg:pr-5.5"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--plk-scrim) 55%, transparent) 35%, color-mix(in srgb, var(--plk-scrim) 92%, transparent) 100%)",
          }}
        >
          <PostChips
            teamName={TEAMS[post.team].name}
            rumour={post.stage === "RUMOUR"}
          />
          <button
            type="button"
            onClick={onOpenDetail}
            className="focus-visible:outline-accent w-fit rounded text-left hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="text-headline text-media-on font-extrabold">
              {post.title}
            </span>
          </button>
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

        {/* 모바일 전용: 레일을 카드 안 우측 하단에 오버레이 */}
        <ReelActionRail
          post={post}
          onOpenComments={onOpenDetail}
          className="absolute right-3 bottom-4 lg:hidden"
        />
      </MediaThumb>

      {/* 데스크톱 전용: 카드 밖 오른쪽 레일 */}
      <ReelActionRail
        post={post}
        onOpenComments={onOpenDetail}
        className="max-lg:hidden"
      />
    </div>
  );
}
