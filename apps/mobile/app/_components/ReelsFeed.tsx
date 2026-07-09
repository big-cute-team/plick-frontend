"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { formatCount } from "../_lib/format";
import { TEAMS } from "../_lib/mock";
import type { FeedPost } from "../_lib/types";
import { MediaThumb } from "./MediaThumb";
import { ChatIcon, LikeIcon, SaveIcon, SendIcon } from "./icons";

// 릴스 세로 스냅 피드. 릴 하나 = 컨테이너 높이(100dvh) 전체, snap-start로 한 장씩 넘김.
// 딥링크(/reels/[postId])로 들어오면 해당 릴 위치로 점프한다.
export function ReelsFeed({
  posts,
  initialPostId,
}: {
  posts: FeedPost[];
  initialPostId?: string;
}) {
  const scrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!initialPostId || !el) return;
    const idx = posts.findIndex((p) => p.id === initialPostId);
    if (idx > 0) el.scrollTo({ top: idx * el.clientHeight });
  }, [initialPostId, posts]);

  return (
    <main
      ref={scrollRef}
      className="no-scrollbar flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
    >
      {posts.map((post) => (
        <ReelItem key={post.id} post={post} />
      ))}
    </main>
  );
}

function ReelItem({ post }: { post: FeedPost }) {
  const team = TEAMS[post.team];
  return (
    <section className="relative h-full w-full snap-start">
      <MediaThumb team={post.team} className="h-full">
        {/* 우측 스크림 — 액션 레일 가독성용 고정 값(테마 무관) */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-27.5"
          style={{
            backgroundImage:
              "linear-gradient(to left, rgba(5,8,14,0.55), rgba(5,8,14,0))",
          }}
        />

        {/* 하단 정보 블록 (스크림 위 텍스트) */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-2.75 pt-30 pr-21 pb-27 pl-4.5"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(5,8,14,0) 0%, rgba(5,8,14,0.55) 35%, rgba(5,8,14,0.92) 100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="bg-media-chip border-media-chip-border text-media-on text-caption rounded-pill border px-3 py-1.5 font-extrabold tracking-[0.3px]">
              {team.name}
            </span>
            {post.stage === "RUMOUR" && (
              <span className="bg-accent-tint border-accent-border text-accent text-caption rounded-pill border px-3 py-1.5 font-extrabold tracking-[1px]">
                RUMOUR
              </span>
            )}
          </div>

          <h2 className="text-headline text-media-on leading-[1.32] font-extrabold tracking-[-0.4px]">
            {post.title}
          </h2>

          <div className="flex items-center gap-2.25">
            <span className="border-accent text-accent rounded-badge text-micro flex size-5 items-center justify-center border font-black">
              T{post.reporter.tier}
            </span>
            <span className="text-body text-media-on font-bold">
              {post.reporter.name}
            </span>
            <span className="text-label text-media-on-dim">
              · {post.timeLabel}
            </span>
          </div>
        </div>

        {/* 우측 액션 레일 */}
        <div className="absolute right-3.5 bottom-52.5 flex flex-col items-center gap-5.5 drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]">
          <RailAction
            icon={<LikeIcon size={28} filled={post.liked} />}
            label={formatCount(post.likeCount)}
          />
          <RailAction
            icon={<ChatIcon size={27} />}
            label={formatCount(post.commentCount)}
          />
          <RailAction icon={<SendIcon size={27} />} label="공유" />
          <RailAction
            icon={<SaveIcon size={27} filled={post.saved} />}
            label="저장"
          />
        </div>
      </MediaThumb>
    </section>
  );
}

function RailAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="text-media-on flex flex-col items-center gap-1.25 active:opacity-60"
    >
      {icon}
      <span className="text-caption font-semibold">{label}</span>
    </button>
  );
}
