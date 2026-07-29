"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import { REELS_PREFETCH_AHEAD } from "@/_constants/reels";
import { useReelDetailMotion } from "@/_hooks/useReelDetailMotion";
import { useReelsCarousel } from "@/_hooks/useReelsCarousel";
import { useReelsFeed } from "@/_hooks/useReelsFeed";
import { reelKeys } from "@plick/core/reelKeys";
import type { InitialReelFeed, ReelCard } from "@plick/domain/types";
import { clampTitleOffset } from "@/_utils/reels";
import { ReelDetailSheet } from "./ReelDetailSheet";
import { ReelItem } from "./ReelItem";
import { ReelLoadingSlide } from "./ReelLoadingSlide";
import { ReelSkeleton } from "./ReelSkeleton";
import { ReelStatus } from "./ReelStatus";

/**
 * 릴스 세로 피드 (KAN-277, KAN-276).
 *
 * 릴 하나 = 뷰포트 높이(100dvh) 전체. 넘김은 Embla 세로 캐러셀이 맡는다
 * ({@link useReelsCarousel}) — 여기서는 뷰포트·컨테이너·슬라이드 구조만 만든다.
 *
 * 데이터는 `GET /api/v1/reels`의 커서 페이지네이션이다. 첫 페이지는 서버가 받아
 * `initial`로 내려주고, 끝에서 {@link REELS_PREFETCH_AHEAD}장 남으면 다음 페이지를
 * 미리 당긴다. 끝에는 다음 릴 자리(스피너)를 늘 붙여 둬서, 받는 중이라고 슬라이드를
 * 넣었다 뺐다 하지 않는다 — 넘김 도중 슬라이드가 바뀌면 캐러셀이 끊긴다
 * ({@link useReelsCarousel}).
 *
 * 릴의 정보 블록/댓글 아이콘을 탭하면 세부 바텀시트(KAN-168)를 띄운다.
 * 개폐·드래그 상태(motion)는 여기서 소유 — 시트와 릴의 칩·제목이 같은 상태를
 * 공유해야 하나의 요소처럼 함께 오르내린다.
 *
 * @param initial 서버 컴포넌트가 받아 둔 첫 페이지와 그 시각. 서버 fetch가 실패했으면
 *   없이 들어오고, 그때는 클라가 직접 받아 로딩·에러를 보여준다.
 */
export function ReelsFeed({ initial }: { initial?: InitialReelFeed }) {
  const motion = useReelDetailMotion();
  const queryClient = useQueryClient();
  /** 세부 시트 대상 릴 + 그 릴의 칩·제목이 도킹 지점까지 이동할 거리 */
  const [detail, setDetail] = useState<{
    reel: ReelCard;
    lift: number;
  } | null>(null);

  const {
    data,
    error,
    isPending,
    isError,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useReelsFeed(initial);

  const reels = data?.pages.flatMap((page) => page.items) ?? [];
  /** 릴 뒤에 붙는 자리(스피너 또는 재시도)도 슬라이드 한 장이다 */
  const trailingSlide = isFetchNextPageError || hasNextPage;
  const { viewportRef, activeIndex } = useReelsCarousel(
    reels.length + (trailingSlide ? 1 : 0),
  );
  /** 지금 보고 있는 릴 뒤로 남은 장수 */
  const remaining = reels.length - 1 - activeIndex;

  useEffect(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      !isFetchNextPageError &&
      remaining <= REELS_PREFETCH_AHEAD
    ) {
      fetchNextPage();
    }
  }, [
    remaining,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  ]);

  /**
   * 커서는 서버가 발급한 값이라 상하면 400으로 온다. 잘못된 파라미터와 같은
   * `COMMON_INVALID_PARAM` 코드라 둘을 구분할 방법이 없으므로, 다음 페이지에서
   * 400을 받으면 커서를 버리고 첫 페이지부터 다시 받는다. 같은 커서로 재시도해봐야
   * 계속 400이다. 대신 보던 자리를 잃는다.
   */
  function retryNextPage() {
    if (error instanceof ApiError && error.status === 400) {
      queryClient.resetQueries({ queryKey: reelKeys.feed() });
      return;
    }
    fetchNextPage();
  }

  if (isPending) {
    return (
      <main className="flex-1 overflow-hidden">
        <ReelSkeleton />
      </main>
    );
  }

  if (isError && reels.length === 0) {
    return (
      <main className="flex-1 overflow-hidden">
        <ReelStatus
          message="릴스를 불러오지 못했어요."
          onRetry={refetch}
          retryDisabled={isFetching}
        />
      </main>
    );
  }

  if (reels.length === 0) {
    return (
      <main className="flex-1 overflow-hidden">
        <ReelStatus message="아직 올라온 릴스가 없어요." />
      </main>
    );
  }

  return (
    <>
      {/* 뷰포트 — 세로 드래그를 Embla가 쓰도록 브라우저 팬(당겨서 새로고침 포함)을 막는다 */}
      <main
        ref={viewportRef}
        className="flex-1 touch-pan-x touch-pinch-zoom overflow-hidden"
      >
        {/* 슬라이드 컨테이너 — Embla가 이 요소를 translate 해서 릴을 넘긴다 */}
        <div className="flex h-full flex-col">
          {reels.map((reel, i) => (
            <ReelItem
              key={reel.id}
              reel={reel}
              active={i === activeIndex}
              onOpenDetail={(lift) => {
                setDetail({ reel, lift });
                motion.open();
              }}
              titleMotion={
                motion.mounted && detail?.reel.id === reel.id
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

          {/* 끝에 다음 릴 자리를 미리 잡아 둔다. 실패했으면 같은 자리가 재시도로 바뀐다.
              넘겨야 보이는 자리라 지금 보고 있는 릴을 가리지 않는다 */}
          {trailingSlide &&
            (isFetchNextPageError ? (
              <ReelStatus
                message="다음 릴스를 불러오지 못했어요."
                onRetry={retryNextPage}
              />
            ) : (
              <ReelLoadingSlide />
            ))}
        </div>
      </main>
      {motion.mounted && detail && (
        <ReelDetailSheet reel={detail.reel} motion={motion} />
      )}
    </>
  );
}
