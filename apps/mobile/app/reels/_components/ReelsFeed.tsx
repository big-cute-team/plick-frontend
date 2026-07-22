"use client";

import { useState } from "react";
import type { FeedPost } from "@plick/domain/types";
import { useReelDetailMotion } from "@/_hooks/useReelDetailMotion";
import { useReelsCarousel } from "@/_hooks/useReelsCarousel";
import { clampTitleOffset } from "@/_utils/reels";
import { ReelDetailSheet } from "./ReelDetailSheet";
import { ReelItem } from "./ReelItem";

/**
 * 릴스 세로 피드 (KAN-277).
 *
 * 릴 하나 = 뷰포트 높이(100dvh) 전체. 넘김은 Embla 세로 캐러셀이 맡는다
 * ({@link useReelsCarousel}) — 여기서는 뷰포트·컨테이너·슬라이드 구조만 만든다.
 *
 * 릴의 정보 블록/댓글 아이콘을 탭하면 세부 바텀시트(KAN-168)를 띄운다.
 * 개폐·드래그 상태(motion)는 여기서 소유 — 시트와 릴의 칩·제목이 같은 상태를
 * 공유해야 하나의 요소처럼 함께 오르내린다.
 *
 * @param initialPostId - 딥링크(`/reels/[postId]`)로 진입 시 처음 보여줄 게시물 id.
 */
export function ReelsFeed({
  posts,
  initialPostId,
}: {
  posts: FeedPost[];
  initialPostId?: string;
}) {
  /**
   * 첫 렌더에 한 번만 정한다. 나중에 피드가 늘어나 인덱스가 밀려도 Embla가
   * 옵션 변경으로 보고 그 자리로 되돌아가지 않게 하려는 것이다.
   */
  const [startIndex] = useState(() =>
    Math.max(
      0,
      posts.findIndex((p) => p.id === initialPostId),
    ),
  );
  const { viewportRef, activeIndex } = useReelsCarousel(startIndex);
  const motion = useReelDetailMotion();
  /** 세부 시트 대상 게시물 + 그 릴의 칩·제목이 도킹 지점까지 이동할 거리 */
  const [detail, setDetail] = useState<{
    post: FeedPost;
    lift: number;
  } | null>(null);

  return (
    <>
      {/* 뷰포트 — 세로 드래그를 Embla가 쓰도록 브라우저 팬(당겨서 새로고침 포함)을 막는다 */}
      <main
        ref={viewportRef}
        className="flex-1 touch-pan-x touch-pinch-zoom overflow-hidden"
      >
        {/* 슬라이드 컨테이너 — Embla가 이 요소를 translate 해서 릴을 넘긴다.
            초기 transform은 하이드레이션 전 첫 페인트용이다. 딥링크로 들어와도
            첫 릴이 스쳤다가 넘어가지 않는다. Embla가 붙으면 곧바로 덮어쓴다 */}
        <div
          className="flex h-full flex-col"
          style={{ transform: `translate3d(0, -${startIndex * 100}%, 0)` }}
        >
          {posts.map((post, i) => (
            <ReelItem
              key={post.id}
              post={post}
              active={i === activeIndex}
              onOpenDetail={(lift) => {
                setDetail({ post, lift });
                motion.open();
              }}
              titleMotion={
                motion.mounted && detail?.post.id === post.id
                  ? {
                      offset: motion.shown
                        ? clampTitleOffset(detail.lift, motion.dragY)
                        : 0,
                      dragging: motion.dragging,
                    }
                  : null
              }
            />
          ))}
        </div>
      </main>
      {motion.mounted && detail && (
        <ReelDetailSheet post={detail.post} motion={motion} />
      )}
    </>
  );
}
