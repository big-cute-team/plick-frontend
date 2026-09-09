"use client";

import { useRef, type ReactNode } from "react";
import { useSwipePager } from "@/_hooks/useSwipePager";

/**
 * 콘텐츠를 좌우로 끌어 이웃 값으로 넘어가는 페이저 껍데기 (KAN-388 팀 스와이프를
 * KAN-462에서 일반화). 홈 "지금 올라온 소식"·기사 페이지의 팀 리스트, 라이브
 * 경기 목록(날짜), 경기 상세(탭)가 같이 쓴다.
 *
 * 제스처와 스냅은 {@link useSwipePager}가 맡고, 여기는 DOM 골격만 둔다:
 * 바깥은 가로만 잘라내는 뷰포트(`overflow-x-clip` — hidden과 달리 스크롤
 * 컨테이너가 되지 않는다), 안쪽 트랙이 `translateX`로 밀리며, 드래그 중에만
 * 이웃 미리보기 페인이 트랙 옆에 절대배치로 붙는다. 세로는 자르지 않아
 * 미리보기가 현재 콘텐츠보다 길어도 드래그 동안 그대로 흘러 보인다.
 *
 * 미리보기 페인은 `aria-hidden`이다 — 제스처 도중에만 존재하는 장식이고,
 * 커밋되면 진짜 페인이 같은 내용으로 갈아 끼워진다. 링크가 들어 있으므로
 * 포인터도 막아 스와이프 끝의 탭이 미리보기 속 링크로 새지 않게 한다.
 *
 * @param value 지금 보고 있는 값. 커밋 후 이 prop의 변화가 교체 신호다.
 * @param neighborOf 지금 값의 이웃(1 다음·-1 이전). 없으면 null(끝).
 * @param onCommit 이웃으로 확정됐을 때. 탭 클릭 핸들러를 그대로 넘긴다.
 * @param renderPreview 이웃 미리보기 페인을 그리는 함수. 화면마다 페인
 *   구성(건수 제한·스켈레톤 개수)이 달라 주입받는다.
 * @param targetScrollTop 이웃으로 넘어가면 복원될 scrollTop. 기사 페이지가
 *   팀별 저장 위치를 넘기고, 나머지는 없다.
 * @param className 컨테이너에 더할 클래스. 채팅처럼 남는 높이를 채워야 하는
 *   페인은 `flex min-h-0 flex-1 flex-col`을 준다.
 * @param trackClassName 트랙에 더할 클래스. 컨테이너와 같은 이유.
 */
export function SwipePager<T extends string>({
  value,
  neighborOf,
  onCommit,
  renderPreview,
  targetScrollTop,
  className = "",
  trackClassName = "",
  children,
}: {
  value: T;
  neighborOf: (value: T, dir: 1 | -1) => T | null;
  onCommit: (next: T) => void;
  renderPreview: (value: T) => ReactNode;
  targetScrollTop?: (next: T) => number | undefined;
  className?: string;
  trackClassName?: string;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { preview } = useSwipePager({
    containerRef,
    trackRef,
    value,
    neighborOf,
    onCommit,
    targetScrollTop,
  });

  return (
    /* touch-pan-y: 브라우저에게 이 영역의 세로 팬만 허락한다. 없으면 크롬이
       살짝 비낀 가로 드래그에도 세로 스크롤을 먼저 시작해 버려, 이후
       touchmove가 cancelable=false로 오고 제스처를 가로챌 수 없다 */
    <div
      ref={containerRef}
      className={`touch-pan-y overflow-x-clip ${className}`}
    >
      <div ref={trackRef} className={`relative ${trackClassName}`}>
        {children}
        {preview && (
          <div
            aria-hidden
            className={`pointer-events-none absolute w-full ${
              preview.side === "next" ? "left-full" : "right-full"
            }`}
            style={{ top: preview.top }}
          >
            {renderPreview(preview.value)}
          </div>
        )}
      </div>
    </div>
  );
}
