"use client";

import { useEffect, useRef } from "react";
import type { FeedPost } from "../_lib/types";
import { ReelItem } from "./ReelItem";

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
