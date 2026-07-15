"use client";

import { useRef } from "react";
import { TEAMS } from "@/_lib/constants";
import type { FeedPost } from "@/_lib/types";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { SHEET_TRANSITION } from "@/reels/_lib/constants";
import type { TitleMotion } from "@/reels/_lib/types";
import { titleLiftDistance } from "@/reels/_lib/utils";
import { PostChips } from "@plick/ui/PostChips";
import { ReporterTierBadge } from "@plick/ui/ReporterTierBadge";
import { ReelActionRail } from "./ReelActionRail";

/**
 * 릴 한 장 — 풀스크린 미디어 + 스크림 + 정보 블록 + 우측 액션 레일.
 *
 * 칩·제목은 릴에 있는 이 요소 하나뿐이다. 세부 시트가 열리면 새로 그리지 않고
 * 이 요소가 transform으로 시트 상단 라인 위 도킹 지점까지 올라가 한 몸으로 움직인다.
 *
 * @param onOpenDetail - 정보 블록(제목·기자)이나 댓글 아이콘 탭 시 호출.
 *   인자는 칩·제목이 도킹 지점까지 이동할 거리(px, 음수) — 탭 시점에 측정한다.
 * @param titleMotion - 이 릴의 시트가 떠 있는 동안의 칩·제목 이동 상태 (아니면 null)
 */
export function ReelItem({
  post,
  onOpenDetail,
  titleMotion,
}: {
  post: FeedPost;
  onOpenDetail: (lift: number) => void;
  titleMotion: TitleMotion | null;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    const section = sectionRef.current;
    const title = titleRef.current;
    if (!section || !title) return;
    onOpenDetail(
      titleLiftDistance(
        section.getBoundingClientRect(),
        title.getBoundingClientRect(),
      ),
    );
  };

  return (
    <section ref={sectionRef} className="relative h-full w-full snap-start">
      <MediaThumb colorVar={TEAMS[post.team].colorVar} className="h-full">
        {/* 우측 스크림 — 액션 레일 가독성용 고정 값(테마 무관) */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-27.5"
          style={{
            backgroundImage:
              "linear-gradient(to left, color-mix(in srgb, var(--plk-scrim) 55%, transparent), transparent)",
          }}
        />

        {/* 하단 정보 블록 (스크림 위 텍스트) — 탭하면 세부 시트가 열린다 */}
        <button
          type="button"
          onClick={handleOpen}
          className="absolute inset-x-0 bottom-0 flex flex-col gap-2.75 pt-30 pr-21 pb-27 pl-4.5 text-left"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--plk-scrim) 55%, transparent) 35%, color-mix(in srgb, var(--plk-scrim) 92%, transparent) 100%)",
          }}
        >
          {/* 칩+제목 — 시트가 열리면 이 요소가 시트 라인 위까지 올라간다.
              z-30: 시트 오버레이(z-20)보다 위에 그려져 스크림을 덮는다 */}
          <div
            ref={titleRef}
            className="relative z-30 flex flex-col gap-2.75"
            style={{
              transform: `translateY(${titleMotion?.offset ?? 0}px)`,
              transition: titleMotion?.dragging ? "none" : SHEET_TRANSITION,
              pointerEvents: titleMotion ? "none" : undefined,
            }}
          >
            <PostChips
              teamName={TEAMS[post.team].name}
              rumour={post.stage === "RUMOUR"}
            />
            <span className="text-headline text-media-on font-extrabold">
              {post.title}
            </span>
          </div>

          <span className="flex items-center gap-2.25">
            <ReporterTierBadge reporter={post.reporter} />
            <span className="text-body text-media-on font-bold">
              {post.reporter.name}
            </span>
            <span className="text-label text-media-on-dim">
              · {post.timeLabel}
            </span>
          </span>
        </button>

        <ReelActionRail post={post} onComment={handleOpen} />
      </MediaThumb>
    </section>
  );
}
