"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PULL_TRANSITION } from "@/_constants/pull-refresh";
import { useFeedRefresh } from "@/_hooks/useFeedRefresh";
import { usePullToRefresh } from "@/_hooks/usePullToRefresh";
import type { PostListVariant } from "@/_types/app";
import { PullSpinner } from "./PullSpinner";

/**
 * 피드 화면 본문을 당겨서 새로고침으로 감싸는 클라 껍데기 (KAN-379).
 *
 * 서버 컴포넌트(HomeScreen·ArticlesScreen)는 클라에 함수를 못 넘기므로, 모바일
 * `HomeScrollArea`처럼 얇은 클라 경계를 한 겹 두고 여기서 `useFeedRefresh`를
 * 만든다. `children`은 서버에서 렌더된 채 지나가므로 아래를 클라로 끌어내리지
 * 않는다.
 *
 * `SiteHeader`는 이 껍데기 밖에 있어야 한다 — sticky 헤더가 transform 안에
 * 들어오면 컨테이닝 블록이 바뀌어 고정이 풀린다. 본문만 감싼다.
 *
 * transform 스타일은 제스처가 도는 동안만 단다. 늘 달아 두면 `translateY(0)`
 * 자체가 컨테이닝 블록을 만들어 lg 사이드바의 sticky를 깨서다. 손을 뗀 뒤
 * 제자리로 돌아가는 애니메이션 동안은 스타일이 남아야 하므로(안 그러면 툭
 * 끊긴다) `settling`으로 그 구간을 붙잡았다가 전환 시간이 지나면 뗀다.
 *
 * @param surface 이 화면의 피드 종류(news=홈, article=기사) — 갱신할 쿼리를 정한다
 */
export function FeedPullRefresh({
  surface,
  children,
}: {
  surface: PostListVariant;
  children: ReactNode;
}) {
  const refresh = useFeedRefresh();
  const { distance, dragging, refreshing } = usePullToRefresh(() =>
    refresh(surface),
  );

  const active = distance > 0;
  const [settling, setSettling] = useState(false);
  const wasActive = useRef(false);

  useEffect(() => {
    if (wasActive.current && !active) setSettling(true);
    wasActive.current = active;
  }, [active]);

  /**
   * 복귀 전환(PULL_TRANSITION 260ms)이 끝날 때까지만 스타일을 유지한다.
   * transitionend는 탭 전환 등으로 빠질 수 있어 시간으로 정리한다.
   */
  useEffect(() => {
    if (!settling) return;
    const id = setTimeout(() => setSettling(false), 400);
    return () => clearTimeout(id);
  }, [settling]);

  return (
    <div
      className="relative"
      style={
        active || settling
          ? {
              transform: `translateY(${distance}px)`,
              transition: dragging ? "none" : PULL_TRANSITION,
            }
          : undefined
      }
    >
      <PullSpinner distance={distance} refreshing={refreshing} />
      {children}
    </div>
  );
}
