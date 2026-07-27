"use client";

import { useRef, type ReactNode } from "react";
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

  return (
    <main
      ref={ref}
      className={`no-scrollbar relative flex-1 overflow-y-auto overscroll-contain ${className}`}
    >
      {onRefresh ? (
        /* 당길 때 콘텐츠째 밀어 내리는 껍데기. 손가락이 닿아 있는 동안은
           전환을 끄고 그대로 따라가고, 떼는 순간부터 애니메이션으로 돌아간다.
           transform이 걸려 있어 이 요소가 스피너의 절대배치 기준이 된다 */
        <div
          style={{
            transform: `translateY(${distance}px)`,
            transition: dragging ? "none" : PULL_TRANSITION,
          }}
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
