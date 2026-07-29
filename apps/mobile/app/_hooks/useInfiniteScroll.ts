"use client";

import { useEffect, useRef } from "react";

/** 감시 요소가 화면에 닿기 이 거리(px) 전에 미리 당겨온다. */
const PREFETCH_MARGIN = "200px";

/**
 * 리스트 끝에 둔 감시 요소가 보이면 콜백을 부르는 무한스크롤 트리거 (KAN-271).
 *
 * 스크롤 이벤트를 직접 듣지 않고 `IntersectionObserver`를 쓴다. 스크롤 핸들러는
 * 스크롤 한 번에 수십 번 불려 좌표 계산을 반복하지만, 관찰자는 브라우저가
 * 교차 상태가 바뀔 때만 알려준다.
 *
 * root를 지정하지 않아 뷰포트 기준으로 본다. 홈은 `ScrollArea`(overflow-y-auto)
 * 안에서 스크롤되지만, 관찰자는 조상이 잘라내는 영역까지 함께 계산하므로
 * 컨테이너 밖으로 밀려난 감시 요소는 교차하지 않는 것으로 잡힌다.
 *
 * @param onReachEnd 감시 요소가 보일 때 부를 콜백
 * @param enabled 더 받을 게 있고 지금 받는 중이 아닐 때만 켠다.
 *   끄면 관찰을 해제하고, 다시 켜질 때 이미 보이는 상태면 즉시 한 번 더 부른다
 *   (화면이 길어 한 페이지로 스크롤이 안 생기는 경우를 이어서 채운다).
 * @returns 리스트 끝 감시 요소에 달 ref
 */
export function useInfiniteScroll(onReachEnd: () => void, enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const callback = useRef(onReachEnd);

  // 콜백을 ref에 담아두면 매 렌더마다 관찰자를 새로 만들지 않아도 된다
  useEffect(() => {
    callback.current = onReachEnd;
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!enabled || !el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) callback.current();
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [enabled]);

  return sentinelRef;
}
