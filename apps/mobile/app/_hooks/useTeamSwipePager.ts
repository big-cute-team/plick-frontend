"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Filter } from "@plick/domain/types";
import { FILTER_ORDER } from "@/_constants/team-filter";
import {
  SWIPE_COMMIT_RATIO,
  SWIPE_DIRECTION_SLOP,
  SWIPE_EDGE_GUARD,
  SWIPE_EDGE_MAX,
  SWIPE_FLICK_MIN_DISTANCE,
  SWIPE_FLICK_VELOCITY,
  SWIPE_SETTLE_TIMEOUT_MS,
  SWIPE_SETTLE_TRANSITION,
  SWIPE_VELOCITY_WINDOW_MS,
} from "@/_constants/team-swipe";
import { damp } from "@/_utils/damp";

/**
 * 드래그 중 트랙 옆에 그릴 이웃 팀 미리보기.
 *
 * `side`는 미리보기 페인이 트랙의 어느 쪽에 붙는지다 — 다음 팀(왼쪽으로 끌기)은
 * 오른쪽(`next`), 이전 팀은 왼쪽(`prev`)이다. `top`은 페인의 세로 보정(px)이다.
 * 팀별 스크롤이 있는 화면(기사)에서만 쓴다: 지금 리스트를 내려 본 만큼
 * 미리보기를 내려 붙여 이웃 리스트 맨 위가 뷰포트 상단(sticky 아래)에 오게
 * 하되, 이웃 팀에 저장된 스크롤이 있으면 그만큼 도로 올려 커밋 후 복원될
 * 자리와 픽셀이 이어진다. 팀별 스크롤이 없는 화면(홈)은 항상 0이다 — 스크롤
 * 그대로 페인만 옆으로 민다.
 */
export type SwipePreview = { team: Filter; side: "next" | "prev"; top: number };

/**
 * 리스트를 좌우로 끌어 이웃 팀 탭으로 넘어가는 페이저 제스처 (KAN-388).
 *
 * 손가락이 닿으면 첫 {@link SWIPE_DIRECTION_SLOP}px 동안 축을 재고, 가로 성분이
 * 클 때만 제스처를 가져온다(세로가 크면 평범한 스크롤·당겨서 새로고침에 양보).
 * 이후로는 `preventDefault()`로 세로 스크롤을 잠그고 트랙을 손가락만큼
 * `translateX`로 민다 — 프레임마다 리렌더하지 않도록 transform은 ref로 직접
 * 대입하고, React 상태는 이웃 페인의 마운트가 바뀔 때만 쓴다.
 *
 * 손을 떼면 폭 대비 {@link SWIPE_COMMIT_RATIO} 이상 끌렸거나 플릭 속도를 넘겼을
 * 때 이웃 팀으로 확정한다. 확정 스냅이 끝나면 `onCommit`을 부르는데, 이때 트랙
 * transform을 바로 걷지 않는다 — `onCommit`은 URL만 바꾸고(`replaceState`) 새
 * 팀의 리스트는 React가 다음 렌더에서 갈아 끼우므로, 그 전에 걷으면 옛 팀
 * 리스트가 한 프레임 비친다. `filter` prop이 확정한 팀으로 바뀐 뒤
 * `useLayoutEffect`(페인트 전)에서 transform을 걷고 스크롤을 맞춰, 미리보기
 * 페인과 진짜 페인이 같은 픽셀로 이어지게 한다.
 *
 * 끝 탭에서 더 끌면 이웃이 없다는 뜻으로 {@link damp} 저항만 준다. 화면 좌우
 * 가장자리 {@link SWIPE_EDGE_GUARD}px에서 시작한 터치는 iOS 뒤로가기 제스처
 * 몫으로 무시한다. `prefers-reduced-motion`이면 스냅 애니메이션 없이 즉시
 * 확정한다.
 *
 * @param containerRef 제스처를 받을 컨테이너. 스크롤러(`main`)를 `closest`로 찾는
 *   기준이기도 하다.
 * @param trackRef `translateX`를 먹일 트랙 엘리먼트
 * @param filter 지금 보고 있는 팀. 커밋 후 이 prop이 확정 팀으로 바뀌는 순간을
 *   기다려 transform을 걷는다.
 * @param onCommit 스와이프가 이웃 팀으로 확정됐을 때. 탭 클릭 핸들러를 그대로
 *   넘기면 URL·스크롤 장부 처리가 탭과 같은 경로를 탄다.
 * @param targetScrollTop 이웃 팀으로 넘어가면 복원될 scrollTop을 알려주는 함수.
 *   기사 페이지가 팀별 저장 위치를 넘기면, 미리보기를 그 자리에 맞춰 붙이고
 *   커밋 때 스크롤을 보정한다. 팀별 스크롤 개념이 없는 화면(홈)은 넘기지
 *   않는다 — 그러면 스크롤은 손대지 않고 페인만 옆으로 밀어, 탭 클릭과 같은
 *   "보던 자리 그대로" 감각이 된다.
 * @returns `preview` — 드래그·스냅 중 렌더할 이웃 페인. 없으면 null.
 */
export function useTeamSwipePager({
  containerRef,
  trackRef,
  filter,
  onCommit,
  targetScrollTop,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  trackRef: RefObject<HTMLDivElement | null>;
  filter: Filter;
  onCommit: (next: Filter) => void;
  targetScrollTop?: (next: Filter) => number | undefined;
}): { preview: SwipePreview | null } {
  const [preview, setPreview] = useState<SwipePreview | null>(null);

  /** 리스너는 등록 시점에 굳으므로 최신 값은 ref로 건넨다 */
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const targetRef = useRef(targetScrollTop);
  targetRef.current = targetScrollTop;

  /** 커밋 후 `filter` prop이 이 팀으로 바뀌기를 기다린다 */
  const pendingRef = useRef<Filter | null>(null);
  /**
   * 커밋이 완료되는 순간 스크롤러에 적용할 scrollTop. null이면 건드리지
   * 않는다 — 팀별 스크롤 개념이 없는 화면(홈)은 클릭과 똑같이 보던 자리에
   * 그대로 있어야 한다 (KAN-388 후속 피드백).
   */
  const commitScrollRef = useRef<number | null>(null);

  /**
   * 커밋의 마무리 — 새 팀 리스트가 DOM에 들어온 커밋 직후, 페인트 전에
   * transform을 걷고 스크롤을 미리보기와 같은 자리로 맞춘다. 미리보기와 새
   * 리스트가 같은 캐시를 그리므로 이 교체는 픽셀이 이어진다. transition을
   * 먼저 비워야 transform 복귀가 애니메이션으로 새지 않는다.
   */
  useLayoutEffect(() => {
    if (pendingRef.current === null || pendingRef.current !== filter) return;
    pendingRef.current = null;
    const track = trackRef.current;
    if (track) {
      track.style.transition = "";
      track.style.transform = "";
    }
    const scroller = containerRef.current?.closest("main");
    if (scroller && commitScrollRef.current !== null) {
      scroller.scrollTop = commitScrollRef.current;
    }
    setPreview(null);
  }, [filter, containerRef, trackRef]);

  useEffect(() => {
    const el = containerRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    let startX = 0;
    let startY = 0;
    /** touchstart 판정을 통과해 이 제스처를 볼 여지가 있는지 */
    let armed = false;
    /** 축 판정을 통과해 실제로 끌고 있는가 */
    let swiping = false;
    /** 스냅 애니메이션이 도는 중 — 새 터치를 받지 않는다 */
    let busy = false;
    let width = 1;
    /** 축이 확정된 순간의 스크롤 기하 — 이번 드래그 동안 고정이다 */
    let scrollTopAtLock = 0;
    let innerOffsetCur = 0;
    let listTopScroll = 0;
    let candidate: Filter | null = null;
    let candidateTop = 0;
    let offset = 0;
    /**
     * 최근 {@link SWIPE_VELOCITY_WINDOW_MS} 구간의 이동 샘플. 릴리즈 때 창
     * 전체 기울기로 플릭 속도를 잰다 — 마지막 두 이벤트로만 재면 릴리즈 직전
     * 감속과 웹뷰의 이벤트 배칭에 속아 빠른 플릭도 느리게 측정된다.
     */
    let samples: { x: number; t: number }[] = [];
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    const neighborOf = (dir: 1 | -1): Filter | null =>
      FILTER_ORDER[FILTER_ORDER.indexOf(filterRef.current) + dir] ?? null;

    /**
     * 축이 확정되는 순간 한 번 잰다.
     *
     * `innerOffsetCur`는 지금 리스트가 sticky 아래로 파고든 깊이(px)다 —
     * 미리보기 페인을 이만큼 내려 붙여야 이웃 리스트 맨 위가 뷰포트 상단에
     * 온다. `listTopScroll`은 "리스트 맨 위가 sticky 바로 아래 오는 scrollTop"
     * 으로, 이웃 팀의 저장 스크롤을 리스트 내부 깊이로 환산할 때 쓴다. sticky
     * 블록은 Tailwind `sticky` 클래스로 찾는다 — 두 화면 모두 팀 탭(과 기사
     * 헤더)이 이 클래스로 상단에 붙어 있다.
     */
    function measure() {
      const rect = el!.getBoundingClientRect();
      width = rect.width || 1;
      const scroller = el!.closest("main");
      if (!scroller) {
        scrollTopAtLock = 0;
        innerOffsetCur = 0;
        listTopScroll = 0;
        return;
      }
      const scrollerRect = scroller.getBoundingClientRect();
      let stickyBottom = scrollerRect.top;
      scroller.querySelectorAll(".sticky").forEach((sticky) => {
        stickyBottom = Math.max(
          stickyBottom,
          sticky.getBoundingClientRect().bottom,
        );
      });
      scrollTopAtLock = scroller.scrollTop;
      innerOffsetCur = Math.max(0, stickyBottom - rect.top);
      listTopScroll =
        rect.top -
        scrollerRect.top +
        scroller.scrollTop -
        (stickyBottom - scrollerRect.top);
    }

    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (busy || e.touches.length !== 1 || !touch) {
        armed = false;
        return;
      }
      if (
        touch.clientX < SWIPE_EDGE_GUARD ||
        touch.clientX > window.innerWidth - SWIPE_EDGE_GUARD
      ) {
        armed = false;
        return;
      }
      armed = true;
      swiping = false;
      startX = touch.clientX;
      startY = touch.clientY;
      samples = [{ x: touch.clientX, t: e.timeStamp }];
    };

    const onMove = (e: TouchEvent) => {
      if (!armed || busy) return;
      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!swiping) {
        // 아직 축을 못 정했다 — 조금 더 움직일 때까지 브라우저에 맡겨 둔다
        if (
          Math.abs(dx) < SWIPE_DIRECTION_SLOP &&
          Math.abs(dy) < SWIPE_DIRECTION_SLOP
        ) {
          return;
        }
        // 세로가 우세하면 이 제스처는 스크롤·당겨서 새로고침 몫이다
        if (Math.abs(dx) <= Math.abs(dy)) {
          armed = false;
          return;
        }
        // 브라우저가 이미 세로 팬을 시작했으면(관성 스크롤 중 스와이프 등)
        // touchmove가 cancelable=false로 와서 스크롤을 뺏을 방법이 없다.
        // 억지로 가로채면 세로 스크롤과 가로 트랙이 동시에 움직인다
        if (!e.cancelable) {
          armed = false;
          return;
        }
        swiping = true;
        // 축을 재느라 쓴 슬롭은 빼고 여기서부터 거리를 잰다
        startX = touch.clientX;
        measure();
        return;
      }

      // cancelable=false인 이벤트에 preventDefault를 부르면 크롬이
      // [Intervention] 경고를 쌓는다 — 취소할 수 있는 것만 취소한다
      if (e.cancelable) e.preventDefault();

      samples.push({ x: touch.clientX, t: e.timeStamp });
      while (
        samples.length > 2 &&
        e.timeStamp - samples[0]!.t > SWIPE_VELOCITY_WINDOW_MS
      ) {
        samples.shift();
      }

      const raw = touch.clientX - startX;
      // 왼쪽으로 끌면(raw<0) 순서상 다음 팀이 오른쪽에서 들어온다
      const next = raw === 0 ? null : neighborOf(raw < 0 ? 1 : -1);
      if (next !== candidate) {
        candidate = next;
        if (next) {
          /* 팀별 스크롤이 있는 화면(기사)만 세로를 보정한다. 없는 화면(홈)은
             클릭과 같은 감각으로 스크롤 그대로 페인만 옆으로 민다 — 이웃
             리스트도 지금 보던 깊이의 내용이 끌려 들어온다 */
          if (targetRef.current) {
            const saved = targetRef.current(next);
            const innerTarget =
              saved == null ? 0 : Math.max(0, saved - listTopScroll);
            candidateTop = innerOffsetCur - innerTarget;
          } else {
            candidateTop = 0;
          }
          setPreview({
            team: next,
            side: raw < 0 ? "next" : "prev",
            top: candidateTop,
          });
        } else {
          setPreview(null);
        }
      }
      offset = candidate
        ? raw
        : Math.sign(raw) * damp(Math.abs(raw), SWIPE_EDGE_MAX);
      track.style.transform = `translateX(${offset}px)`;
    };

    /**
     * 손을 뗀 뒤 스냅. 커밋이면 화면 폭 끝까지, 아니면 제자리로 CSS 전환을
     * 걸고, `transitionend`(안 오면 안전 타이머)에서 마무리한다. 커밋의 실제
     * 상태 전환(`onCommit` → filter 변화 → layout effect)은 finish에서 시작된다.
     */
    const end = (cancelled: boolean) => {
      if (!swiping) {
        armed = false;
        return;
      }
      swiping = false;
      armed = false;

      /* 창 안 첫 샘플에서 마지막 샘플까지의 평균 기울기가 플릭 속도다 */
      const first = samples[0];
      const last = samples[samples.length - 1];
      const velocity =
        first && last && last.t > first.t
          ? (last.x - first.x) / (last.t - first.t)
          : 0;

      const commit =
        !cancelled &&
        candidate !== null &&
        (Math.abs(offset) > width * SWIPE_COMMIT_RATIO ||
          (Math.abs(velocity) > SWIPE_FLICK_VELOCITY &&
            Math.sign(velocity) === Math.sign(offset) &&
            Math.abs(offset) > SWIPE_FLICK_MIN_DISTANCE));

      const committed = commit ? candidate : null;
      const targetX = committed ? (offset < 0 ? -width : width) : 0;
      candidate = null;

      const finish = () => {
        if (settleTimer) {
          clearTimeout(settleTimer);
          settleTimer = null;
        }
        busy = false;
        offset = 0;
        if (committed) {
          pendingRef.current = committed;
          /* 세로 보정을 안 한 화면(홈)은 커밋 후에도 스크롤을 안 건드린다 */
          commitScrollRef.current = targetRef.current
            ? Math.max(0, scrollTopAtLock - candidateTop)
            : null;
          onCommitRef.current(committed);
        } else {
          track.style.transition = "";
          track.style.transform = "";
          setPreview(null);
        }
      };

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced || Math.abs(targetX - offset) < 1) {
        track.style.transform = `translateX(${targetX}px)`;
        finish();
        return;
      }

      busy = true;
      track.style.transition = SWIPE_SETTLE_TRANSITION;
      track.style.transform = `translateX(${targetX}px)`;
      const onDone = (ev: TransitionEvent) => {
        if (ev.target !== track || ev.propertyName !== "transform") return;
        track.removeEventListener("transitionend", onDone);
        finish();
      };
      track.addEventListener("transitionend", onDone);
      settleTimer = setTimeout(() => {
        track.removeEventListener("transitionend", onDone);
        finish();
      }, SWIPE_SETTLE_TIMEOUT_MS);
    };

    const onEnd = () => end(false);
    /** 시스템 제스처가 터치를 가져간 경우 — 커밋하지 않고 제자리로 돌린다 */
    const onCancel = () => end(true);

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onCancel);

    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
      track.style.transition = "";
      track.style.transform = "";
    };
  }, [containerRef, trackRef]);

  return { preview };
}
