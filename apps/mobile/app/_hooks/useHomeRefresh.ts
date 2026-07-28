"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { articleKeys } from "@plick/core/articleKeys";
import { useViewState } from "@/_stores/view-state";

/**
 * 홈을 처음부터 다시 받는다 (KAN-314) — 맨 위에서 당기거나 홈 탭을 한 번 더
 * 눌렀을 때 도는 동작.
 *
 * 캐시 유지시간을 30분으로 늘리면서(`FEED_FRESH_MS`) 화면에 다시 들어와도 자동
 * 갱신이 걸리지 않게 됐다. 대신 이 손동작이 유일한 갱신 통로가 됐으므로, 여기서는
 * 확실하게 처음부터 다시 받는다.
 *
 * `invalidateQueries`가 아니라 `resetQueries`인 이유: 무한 쿼리를 무효화하면 쌓인
 * 페이지를 전부 다시 받는데, 커서 체인이라 앞 페이지가 와야 다음 커서를 알 수 있어
 * 순차로 나간다. 20페이지를 넘긴 상태에서 당기면 요청 20개가 줄지어 나가고 그게 다
 * 끝나야 스피너가 멈춘다. 리셋은 첫 페이지 하나만 받는다. 어차피 갱신과 함께 맨
 * 위로 올라가므로 뒷 페이지를 되살릴 이유도 없다.
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
    // 지금 보고 있는 팀 탭만 다시 받는다. 필터 자체는 새로고침으로 건드리지 않는다
    const { homeFilter } = useViewState.getState();
    router.refresh();
    await queryClient.resetQueries({ queryKey: articleKeys.feed(homeFilter) });
  }, [queryClient, router]);
}
