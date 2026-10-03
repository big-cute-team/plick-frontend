"use client";

import { useEffect, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * 서버가 방금 받아 온 씨앗이 캐시에 남은 데이터보다 새것이면 캐시를 씨앗으로 갈아
 * 끼운다 (KAN-495 모바일 → KAN-567 웹 이식, 모바일 `useFreshSeed`의 복제).
 *
 * `initialData`는 캐시가 빌 때만 쓰인다. 그래서 활동 목록을 봤다가 다른 데서
 * 좋아요를 누르고 다시 들어오면, 서버 컴포넌트는 새 첫 페이지를 받아 내려주는데
 * 클라는 30분(`FEED_FRESH_MS`) 동안 옛 목록을 그대로 보여준다. 홈, 기사 피드는
 * 그 대신 당겨서 새로고침을 두는 걸로 정했지만(KAN-314), 활동 목록은 내 손으로
 * 방금 바꾼 것이 안 보이는 셈이라 화면에 들어올 때마다 새 씨앗을 우선한다.
 *
 * 서버를 다시 부르지 않는다. 어차피 서버 렌더가 첫 페이지를 받고 있었으므로
 * 버려지던 그 결과를 쓰는 것뿐이다. 뒤로가기로 돌아올 때는 Next가 라우터
 * 캐시의 옛 RSC를 그대로 쓰므로 씨앗 시각이 캐시보다 앞서지 않아 아무 일도
 * 하지 않는다. 쌓아 둔 페이지와 스크롤 자리가 그대로 남는다.
 *
 * 마운트 때 한 번만 비교한다. 매 렌더마다 비교하면 기기 시계가 서버보다
 * 뒤처진 경우(씨앗 시각을 지금으로 깎으므로 늘 "옛것"으로 보인다) 갈아 끼우기와
 * 리렌더가 서로를 부르며 돈다.
 *
 * @param queryKey 갈아 끼울 쿼리의 정확한 키
 * @param seed 서버가 내려준 씨앗과 받은 시각. 없으면 아무것도 하지 않는다
 */
export function useFreshSeed<TData>(
  queryKey: QueryKey,
  seed: { data: TData; fetchedAt: number } | undefined,
) {
  const queryClient = useQueryClient();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !seed) return;
    applied.current = true;

    const state = queryClient.getQueryState(queryKey);
    if (!state || state.dataUpdatedAt >= seed.fetchedAt) return;
    queryClient.setQueryData(queryKey, seed.data, {
      // 기기 시계가 뒤처져 씨앗이 미래로 보이면 영영 신선해지므로 지금으로 깎는다
      updatedAt: Math.min(seed.fetchedAt, Date.now()),
    });
  }, [queryClient, queryKey, seed]);
}
