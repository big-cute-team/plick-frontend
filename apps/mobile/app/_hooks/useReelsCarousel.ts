"use client";

import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  REELS_CAROUSEL_OPTIONS,
  REELS_REMEASURE_EPSILON,
} from "@/_constants/reels";
import { useViewState } from "@/_stores/view-state";

/**
 * 릴스 세로 캐러셀 (KAN-277).
 *
 * CSS scroll-snap 대신 Embla가 포인터 드래그를 직접 받아 한 장씩 넘긴다.
 * 브라우저 관성 스크롤에 맡기지 않으므로 세게 튕겨도 여러 장이 건너뛰지 않고,
 * 스냅 타이밍과 드래그 문턱을 값으로 조절할 수 있다({@link REELS_CAROUSEL_OPTIONS}).
 *
 * 무한스크롤로 슬라이드가 늘어나면 Embla가 새 슬라이드를 다시 재야 하는데(`reInit`),
 * 그 안의 `deActivate()`가 진행 중인 스냅 애니메이션과 드래그 핸들러를 파괴한다.
 * 다음 페이지는 하필 넘기는 도중에 도착하므로 그때 바로 재면 넘김이 툭 끊긴다.
 * 그래서 Embla의 자동 감지(`watchSlides`)를 끄고 여기서 직접 잰다. 재기 전에
 * 운동 상태(location·target)를 백업했다가 새 엔진에 복원해 애니메이션을 이어
 * 붙이므로, 스냅 도중에 재도 끊기지 않는다 (KAN-276).
 *
 * 보고 있던 릴은 뷰 상태 스토어에 남겨 두고 돌아올 때 되돌린다 (KAN-314).
 * 탭으로 홈에 다녀오면 이 트리는 언마운트되고 캐러셀도 처음부터 다시 만들어지는데,
 * 릴 데이터는 쿼리 캐시에 남아 있으므로 몇 번째였는지만 기억하면 그 자리로 되돌아간다.
 *
 * @param slideCount 지금 렌더된 슬라이드 수. 이 값이 바뀌면 다시 잰다.
 * @returns `viewportRef`는 `overflow-hidden` 뷰포트에, 그 안에 슬라이드를 담는 컨테이너를 둔다.
 *   `activeIndex`는 지금 보고 있는 릴 — 화면 밖 릴 비활성화와 다음 페이지 프리페치에 쓴다.
 */
export function useReelsCarousel(slideCount: number) {
  const [viewportRef, embla] = useEmblaCarousel(REELS_CAROUSEL_OPTIONS);
  const [activeIndex, setActiveIndex] = useState(0);
  /**
   * 되돌릴 자리를 첫 렌더에 미리 떠 둔다. 아래 sync가 마운트하자마자 0을 스토어에
   * 덮어쓰기 때문에, 이펙트 안에서 읽으면 이미 늦다.
   */
  const saved = useRef(useViewState.getState().reelsIndex);
  const restored = useRef(false);

  useEffect(() => {
    if (!embla) return;
    const sync = () => {
      const index = embla.selectedScrollSnap();
      setActiveIndex(index);
      useViewState.getState().setReelsIndex(index);
    };
    sync();
    embla.on("select", sync).on("reInit", sync);
    return () => {
      embla.off("select", sync).off("reInit", sync);
    };
  }, [embla]);

  /**
   * 보던 릴로 되돌린다. 캐러셀은 슬라이드가 붙은 뒤에야 만들어지므로 옵션의
   * `startIndex`로는 못 잡는다 — 첫 렌더에는 아직 데이터가 없어 0장이다.
   * 만들어진 직후 한 번만 건너뛴다(`jump`라 애니메이션 없이 그 자리에서 시작한다).
   *
   * 캐시가 정리돼 릴이 첫 페이지로 줄었으면 그만큼만 되돌린다.
   */
  useEffect(() => {
    if (!embla || restored.current || slideCount === 0) return;
    restored.current = true;
    const target = Math.min(saved.current, slideCount - 1);
    if (target > 0) embla.scrollTo(target, true);
  }, [embla, slideCount]);

  /**
   * 하단 탭에서 릴스 탭을 한 번 더 누르면 첫 릴로 돌아간다. 곧이어 목록도 첫
   * 페이지로 리셋되므로 애니메이션 없이(`jump`) 즉시 옮긴다 — 달려가는 도중에
   * 목적지 슬라이드가 사라지는 상황을 만들지 않는다.
   */
  const topTick = useViewState((state) => state.topTicks.reels);
  const seenTick = useRef(topTick);
  useEffect(() => {
    if (seenTick.current === topTick) return;
    seenTick.current = topTick;
    embla?.scrollTo(0, true);
  }, [topTick, embla]);

  useEffect(() => {
    if (!embla) return;
    let frame = 0;

    /**
     * 손가락만 떨어져 있으면 즉시 잰다. 미루면 연속 스와이프가 idle 틈을 안 줘서
     * 사용자가 옛 경계(Embla가 아는 마지막 장)에 갇히므로, 미루는 대신 재는 걸
     * 끊기지 않게 만든다.
     *
     * 스냅이 진행 중이면({@link REELS_REMEASURE_EPSILON}px 이상 남음) reInit 전에
     * 운동 상태를 백업했다가 새 엔진에 복원한다. reInit은 새 엔진을 스냅 지점에
     * 정지 상태로 만들기 때문에, 그대로 두면 달리던 중간 프레임이 사라지고 결과만
     * 툭 나타난다. location(현재 위치)과 target(목적지)을 되돌리고 translate를
     * 같은 턴에 다시 칠한 뒤(한 프레임 스냅 지점이 번쩍이는 것 방지) 애니메이션을
     * 다시 시작하면 달리던 자리에서 그대로 이어진다. 목적지는 옛 스냅 지점인데
     * 슬라이드가 전부 같은 높이라 새 엔진에서도 같은 좌표다.
     *
     * 손가락이 닿아 있는 동안만 기다린다. 새 엔진의 드래그 핸들러는 이미 잡고 있는
     * 포인터를 모르므로 진행 중인 제스처가 죽는다. 뗀 직후 스냅 애니메이션 도중에
     * 다음 프레임 폴링이 잡아서 잰다.
     *
     * 움직임 판정을 이벤트로 기억하지 않고 그때그때 묻는 것도 의도다. `settle`
     * 핸들러에서 기억해 두는 방식으로 먼저 짰다가, 핸들러 안 `reInit()`이 Embla
     * 렌더 루프 한복판에서 그 루프의 엔진을 파괴하는 재진입이 되어 상태가 어긋났다.
     * Embla의 `scrollBody.settled()`도 쓰지 않는다. 허용치가 0.001px이라 수치 오차로
     * 멈춘 뒤에도 false에 머무를 수 있다(근거는 상수 주석에).
     */
    const remeasure = () => {
      const engine = embla.internalEngine();
      if (engine.dragHandler.pointerDown()) {
        frame = requestAnimationFrame(remeasure);
        return;
      }
      const location = engine.location.get();
      const target = engine.target.get();
      const inFlight = Math.abs(target - location) >= REELS_REMEASURE_EPSILON;
      embla.reInit();
      if (inFlight) {
        const next = embla.internalEngine();
        next.location.set(location);
        next.previousLocation.set(location);
        next.offsetLocation.set(location);
        next.target.set(target);
        next.translate.to(location);
        next.animation.start();
      }
    };

    remeasure();

    return () => cancelAnimationFrame(frame);
  }, [embla, slideCount]);

  return { viewportRef, activeIndex };
}
