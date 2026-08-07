"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { InitialReelFeed } from "@plick/domain/types";
import { ApiError } from "@plick/core/client";
import { reelKeys } from "@plick/core/reelKeys";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { REELS_PREFETCH_AHEAD } from "@/_constants/reels";
import { useActiveReel } from "@/_hooks/useActiveReel";
import { useArticleView } from "@/_hooks/useArticleView";
import { useReelsFeed } from "@/_hooks/useReelsFeed";
import { ReelDetailPanel } from "./ReelDetailPanel";
import { ReelSkeleton } from "./ReelSkeleton";
import { ReelStatus } from "./ReelStatus";
import { ReelViewer } from "./ReelViewer";

/**
 * 릴스 작업 영역 (KAN-219, API 연결 KAN-323) — 세로 스냅 뷰어 + 오른쪽 세부
 * 패널을 가로로 배치하고, 피드 데이터와 패널 개폐 상태를 소유한다.
 *
 * 릴에서 제목 영역이나 댓글 버튼을 누르면 패널이 열리고, 데스크톱에선 뷰어가 폭을
 * 나눠 주며 패널이 오른쪽에서 미끄러져 들어온다. 모바일 뷰에선 패널이 전체 화면
 * 오버레이로 뜬다(`ReelDetailPanel`).
 *
 * 패널이 무엇을 그릴지는 열 때 고른 릴이 아니라 지금 보고 있는 릴이 정한다
 * ({@link useActiveReel}). 패널을 열어 둔 채 다음 릴로 넘기면 패널 내용도 따라
 * 바뀐다 — 열 때의 릴을 상태로 붙들면 화면의 릴과 패널이 어긋난 채 남는다.
 *
 * 데이터는 `GET /api/v1/reels`의 커서 페이지네이션이다. 첫 페이지는 서버가 받아
 * `initial`로 내려주고, 지금 보고 있는 릴 뒤로 {@link REELS_PREFETCH_AHEAD}장이
 * 남으면 다음 페이지를 미리 당긴다(모바일과 같은 시점). 리스트의 무한스크롤처럼
 * 끝에 감시 요소를 두지 않는 이유는 릴 한 장이 뷰어를 통째로 채워, 그 자리가
 * 보일 때면 이미 마지막 릴에 도착해 있기 때문이다.
 *
 * @param initial - 서버가 받아 둔 첫 페이지와 그 시각. 서버 fetch가 실패했으면
 *   없이 들어오고, 그때는 클라가 직접 받아 로딩·에러를 보여준다.
 */
export function ReelsWorkspace({ initial }: { initial?: InitialReelFeed }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { activeIndex, registerReel } = useActiveReel();
  const queryClient = useQueryClient();
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
  const activeReel = reels[activeIndex];
  /** 지금 보고 있는 릴 뒤로 남은 장수 */
  const remaining = reels.length - 1 - activeIndex;

  /* 활성 릴이 되면 조회로 기록한다 (KAN-332). 모바일은 릴마다 active prop을 이미
     들고 있어 ReelItem에서 부르지만, 웹은 활성 릴을 여기(useActiveReel)만 알므로
     뷰어·릴로 prop을 내리는 대신 한 번만 부른다. 로드 전에는 active를 끈다. */
  useArticleView(activeReel?.id ?? "", activeReel !== undefined);

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
   *
   * 캐시를 비우지 않고 첫 페이지만 남겨 다시 받는다 (KAN-379) — 비우면 서버가
   * 내려준 `initial` 씨앗이 다시 심겨 옛 릴이 한 번 스쳤다 간다.
   */
  function retryNextPage() {
    if (error instanceof ApiError && error.status === 400) {
      void restartFeedQuery(queryClient, reelKeys.feed());
      return;
    }
    fetchNextPage();
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {isPending ? (
        <main className="bg-bg min-w-0 flex-1">
          <ReelSkeleton />
        </main>
      ) : isError && reels.length === 0 ? (
        <main className="bg-bg min-w-0 flex-1">
          <ReelStatus
            message="릴스를 불러오지 못했어요."
            onRetry={() => refetch()}
            retryDisabled={isFetching}
          />
        </main>
      ) : reels.length === 0 ? (
        <main className="bg-bg min-w-0 flex-1">
          <ReelStatus message="아직 올라온 릴스가 없어요." />
        </main>
      ) : (
        <ReelViewer
          reels={reels}
          onOpenDetail={() => setDetailOpen(true)}
          registerReel={registerReel}
          trailing={
            isFetchNextPageError ? (
              <ReelStatus
                message="다음 릴스를 불러오지 못했어요."
                onRetry={retryNextPage}
              />
            ) : isFetchingNextPage ? (
              <div className="flex h-full items-center justify-center">
                <span
                  role="status"
                  aria-label="다음 릴스를 불러오는 중"
                  className="border-text-4 size-8 animate-spin rounded-full border-2 border-t-transparent"
                />
              </div>
            ) : null
          }
        />
      )}
      <ReelDetailPanel
        reel={detailOpen ? (activeReel ?? null) : null}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
