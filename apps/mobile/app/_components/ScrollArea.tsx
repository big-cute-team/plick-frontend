"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PULL_TRANSITION } from "@/_constants/pull-refresh";
import { usePullToRefresh } from "@/_hooks/usePullToRefresh";
import { useScrollRestore } from "@/_hooks/useScrollRestore";
import type { ScreenKey } from "@/_types/app";
import { PullSpinner } from "./PullSpinner";

/**
 * 상/하단 바 사이의 스크롤 영역.
 *
 * `overscroll-contain`으로 스크롤 바운스가 부모(웹뷰)로 전파되지 않게 막는다.
 *
 * KAN-314에서 클라 컴포넌트가 됐다. 스크롤 위치를 되돌리고 당겨서 새로고침을
 * 받으려면 스크롤러 엘리먼트를 직접 잡아야 해서다. 서버 컴포넌트가 `children`으로
 * 넘겨 준 내용은 그대로 서버에서 렌더된 채 지나가므로, 이 경계가 아래를 클라로
 * 끌어내리지는 않는다.
 *
 * @param restoreKey 이 화면의 이름. 주면 떠났다 돌아올 때 보던 위치로 되돌아가고,
 *   하단 탭 재탭에 맨 위로 올라간다. 없으면 예전 그대로 평범한 스크롤 영역이다.
 * @param onRefresh 주면 맨 위에서 당겨 새로고침할 수 있다. 이 프로미스가 끝나야
 *   스피너가 멈춘다.
 */
export function ScrollArea({
  children,
  className = "",
  restoreKey,
  onRefresh,
}: {
  children: ReactNode;
  className?: string;
  restoreKey?: ScreenKey;
  onRefresh?: () => Promise<unknown>;
}) {
  const ref = useRef<HTMLElement>(null);
  useScrollRestore(ref, restoreKey);
  const { distance, dragging, refreshing } = usePullToRefresh(ref, onRefresh);

  /**
   * transform 스타일은 제스처가 도는 동안만 단다 (KAN-386, 웹 FeedPullRefresh와
   * 같은 판단). 늘 달아 두면 `translateY(0)`이어도 조상에 transform이 있다는
   * 사실만으로 안쪽 sticky(팀 탭·기사 헤더 블록)가 컴포지터 고정을 잃고 메인
   * 스레드에서 따라가느라, 빠른 스크롤 프레임마다 한 박자 늦어 위에 틈이
   * 번쩍인다. 손을 뗀 뒤 제자리로 돌아가는 애니메이션 동안은 스타일이 남아야
   * 하므로(안 그러면 툭 끊긴다) `settling`으로 그 구간을 붙잡았다가 전환 시간이
   * 지나면 뗀다.
   */
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
    <main
      ref={ref}
      className={`no-scrollbar relative flex-1 overflow-y-auto overscroll-contain ${className}`}
    >
      {onRefresh ? (
        /* 당길 때 콘텐츠째 밀어 내리는 껍데기. 손가락이 닿아 있는 동안은
           전환을 끄고 그대로 따라가고, 떼는 순간부터 애니메이션으로 돌아간다.
           relative는 스피너의 절대배치 기준 — transform이 벗겨진 평상시에도
           기준이 바뀌지 않게 늘 둔다 */
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
      ) : (
        children
      )}
    </main>
  );
}
