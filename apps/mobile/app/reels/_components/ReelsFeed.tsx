"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedPost } from "../../_lib/types";
import { ReelDetailSheet } from "./ReelDetailSheet";
import { ReelItem } from "./ReelItem";

/**
 * 릴스 세로 스냅 피드.
 *
 * 릴 하나 = 컨테이너 높이(100dvh) 전체, `snap-start`로 한 장씩 넘어간다.
 * 릴의 정보 블록/댓글 아이콘을 탭하면 세부 바텀시트(KAN-168)를 띄운다.
 *
 * @param initialPostId - 딥링크(`/reels/[postId]`)로 진입 시 처음 보여줄 게시물 id.
 *   마운트 시 해당 릴 위치로 점프한다.
 */
export function ReelsFeed({
  posts,
  initialPostId,
}: {
  posts: FeedPost[];
  initialPostId?: string;
}) {
  const scrollRef = useRef<HTMLElement>(null);
  /** 세부 시트를 띄운 게시물 (null이면 닫힘) */
  const [detailPost, setDetailPost] = useState<FeedPost | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!initialPostId || !el) return;
    const idx = posts.findIndex((p) => p.id === initialPostId);
    if (idx > 0) el.scrollTo({ top: idx * el.clientHeight });
  }, [initialPostId, posts]);

  return (
    <>
      <main
        ref={scrollRef}
        className="no-scrollbar flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {posts.map((post) => (
          <ReelItem
            key={post.id}
            post={post}
            onOpenDetail={() => setDetailPost(post)}
          />
        ))}
      </main>
      {detailPost && (
        <ReelDetailSheet
          post={detailPost}
          onClose={() => setDetailPost(null)}
        />
      )}
    </>
  );
}
