"use client";

import { useRef, type ReactNode } from "react";
import type { Filter } from "@plick/domain/types";
import { useTeamSwipePager } from "@/_hooks/useTeamSwipePager";

/**
 * 팀 리스트를 좌우로 끌어 이웃 팀으로 넘어가는 페이저 껍데기 (KAN-388).
 * 홈 "지금 올라온 소식"과 기사 페이지 리스트가 같이 쓴다.
 *
 * 제스처와 스냅은 {@link useTeamSwipePager}가 맡고, 여기는 DOM 골격만 둔다:
 * 바깥은 가로만 잘라내는 뷰포트(`overflow-x-clip` — hidden과 달리 스크롤
 * 컨테이너가 되지 않는다), 안쪽 트랙이 `translateX`로 밀리며, 드래그 중에만
 * 이웃 팀 미리보기 페인이 트랙 옆에 절대배치로 붙는다. 세로는 자르지 않아
 * 미리보기가 현재 리스트보다 길어도 드래그 동안 그대로 흘러 보인다.
 *
 * 미리보기 페인은 `aria-hidden`이다 — 제스처 도중에만 존재하는 장식이고,
 * 커밋되면 진짜 페인이 같은 내용으로 갈아 끼워진다. 링크가 들어 있으므로
 * 포인터도 막아 스와이프 끝의 탭이 미리보기 속 기사로 새지 않게 한다.
 *
 * @param filter 지금 보고 있는 팀. 커밋 후 이 prop의 변화가 교체 신호다.
 * @param onCommit 이웃 팀으로 확정됐을 때. 탭 클릭 핸들러를 그대로 넘긴다.
 * @param renderPreview 이웃 팀 미리보기 페인을 그리는 함수. 화면마다 페인
 *   구성(건수 제한·스켈레톤 개수)이 달라 주입받는다.
 * @param targetScrollTop 이웃 팀으로 넘어가면 복원될 scrollTop. 기사 페이지가
 *   팀별 저장 위치를 넘기고, 홈은 없다(항상 리스트 맨 위에서 시작).
 */
export function TeamSwipePager({
  filter,
  onCommit,
  renderPreview,
  targetScrollTop,
  children,
}: {
  filter: Filter;
  onCommit: (next: Filter) => void;
  renderPreview: (team: Filter) => ReactNode;
  targetScrollTop?: (next: Filter) => number | undefined;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { preview } = useTeamSwipePager({
    containerRef,
    trackRef,
    filter,
    onCommit,
    targetScrollTop,
  });

  return (
    /* touch-pan-y: 브라우저에게 이 영역의 세로 팬만 허락한다. 없으면 크롬이
       살짝 비낀 가로 드래그에도 세로 스크롤을 먼저 시작해 버려, 이후
       touchmove가 cancelable=false로 오고 제스처를 가로챌 수 없다 */
    <div ref={containerRef} className="touch-pan-y overflow-x-clip">
      <div ref={trackRef} className="relative">
        {children}
        {preview && (
          <div
            aria-hidden
            className={`pointer-events-none absolute w-full ${
              preview.side === "next" ? "left-full" : "right-full"
            }`}
            style={{ top: preview.top }}
          >
            {renderPreview(preview.team)}
          </div>
        )}
      </div>
    </div>
  );
}
