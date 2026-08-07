"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { articleKeys } from "@plick/core/articleKeys";
import { restartFeedQuery } from "@plick/core/feed-refresh";
import { useViewState } from "@/_stores/view-state";

/**
 * 진행 중인 홈 갱신 (KAN-379). 탭 연타로 갱신이 겹쳐 나가면 응답이 임의 순서로
 * 도착하며 매번 화면을 갈아 끼워 깜빡이므로, 도는 동안의 재호출은 같은
 * 프로미스를 돌려주고 새 요청을 만들지 않는다. 훅 인스턴스가 탭바와 홈 스크롤
 * 영역 두 곳에 생겨서 ref가 아니라 모듈 스코프에 둔다.
 */
let inFlight: Promise<void> | null = null;

/**
 * 홈을 처음부터 다시 받는다 (KAN-314) — 맨 위에서 당기거나 홈 탭을 한 번 더
 * 눌렀을 때 도는 동작.
 *
 * 캐시 유지시간을 30분으로 늘리면서(`FEED_FRESH_MS`) 화면에 다시 들어와도 자동
 * 갱신이 걸리지 않게 됐다. 대신 이 손동작이 유일한 갱신 통로가 됐으므로, 여기서는
 * 확실하게 처음부터 다시 받는다.
 *
 * 목록은 `restartFeedQuery`로 첫 페이지 하나만 다시 받는다. 예전의
 * `resetQueries`는 캐시를 초기 상태로 되돌려 [보던 목록] → [씨앗/스켈레톤] →
 * [새 목록]으로 두 번 깜빡였다(KAN-379). 첫 페이지만 받는 이유와 커서 체인
 * 사정은 `restartFeedQuery` 주석 참고.
 *
 * 핫이슈 캐러셀은 서버 컴포넌트가 그리므로 `router.refresh()`로 함께 갱신한다.
 * 이건 리로드가 아니라 서버에 RSC 페이로드를 다시 요청해 화면을 갈아 끼우는
 * 소프트 갱신이라 클라 상태(스크롤 위치·필터·스크롤러 ref)는 그대로 남는다.
 * 프로미스를 돌려주지 않아서 기다릴 수는 없다 — 스피너는 목록 쪽에 맞춘다.
 */
export function useHomeRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(async () => {
    if (inFlight) return inFlight;
    // 지금 보고 있는 팀 탭만 다시 받는다. 필터 자체는 새로고침으로 건드리지 않는다
    const { homeFilter } = useViewState.getState();
    router.refresh();
    inFlight = restartFeedQuery(
      queryClient,
      articleKeys.feed(homeFilter),
    ).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }, [queryClient, router]);
}
