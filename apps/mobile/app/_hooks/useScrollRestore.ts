"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useViewState } from "@/_stores/view-state";
import type { ScreenKey } from "@/_types/app";

/**
 * 스크롤 영역이 떠났다 돌아와도 보던 자리를 되돌려 준다 (KAN-314).
 *
 * 브라우저와 Next의 스크롤 복원은 window 스크롤러만 챙긴다. 이 앱은 `AppShell`이
 * `h-[100dvh] overflow-hidden`이고 실제로 스크롤되는 건 그 안의 `<main>`이라
 * 아무도 복원해 주지 않는다. 중첩 스크롤러의 `scrollTop`은 직접 적어 두고 직접
 * 되돌려야 한다.
 *
 * 되돌리기는 `useLayoutEffect`에서 한다. `useEffect`면 브라우저가 맨 위 상태를
 * 한 번 그린 뒤에 뛰어서 화면이 번쩍인다. 레이아웃 이펙트는 페인트 전에 돌아
 * 사용자에게는 처음부터 그 자리였던 것처럼 보인다.
 *
 * 되돌린 뒤 다음 프레임에 한 번 더 시도한다. 트윗 임베드처럼 늦게 자리를 잡는
 * 콘텐츠가 있으면 첫 시도 때 문서가 아직 짧아서 브라우저가 위치를 깎아 버린다.
 * 늘어난 뒤 한 번 더 밀어 넣으면 그런 경우도 제자리를 찾는다. 반대로 목록이
 * 짧아졌으면(캐시가 정리돼 첫 페이지만 남은 경우) 브라우저가 알아서 끝까지만
 * 내려 주므로 따로 막지 않는다.
 *
 * 저장은 rAF로 한 프레임에 한 번만 한다. scroll 이벤트는 프레임보다 잦게 와서
 * 그대로 받으면 스토어 갱신이 헛돈다. 언마운트 때 마지막 위치를 한 번 더 확정한다.
 *
 * @param ref 스크롤되는 엘리먼트
 * @param key 이 화면의 이름. 없으면 아무것도 하지 않는다(복원이 필요 없는 화면).
 */
export function useScrollRestore(
  ref: RefObject<HTMLElement | null>,
  key?: ScreenKey,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !key) return;

    const saved = useViewState.getState().scrollTops[key] ?? 0;
    const restore = () => {
      if (saved > el.scrollTop) el.scrollTop = saved;
    };
    restore();
    const retry = requestAnimationFrame(restore);

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        useViewState.getState().setScrollTop(key, el.scrollTop);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(retry);
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
      useViewState.getState().setScrollTop(key, el.scrollTop);
    };
  }, [ref, key]);

  /**
   * 하단 탭에서 지금 있는 탭을 한 번 더 누르면 맨 위로 올라간다. 신호는 스토어의
   * 카운터로 온다 — 탭바는 스크롤러를 직접 잡을 수 없고, 어느 화면이 떠 있는지도
   * 경로로만 안다. 마운트 직후의 첫 실행은 신호가 아니므로 흘려보낸다.
   *
   * 부드럽게(`behavior: "smooth"`) 올리는 걸로 먼저 만들었다가 즉시 이동으로
   * 바꿨다. 재탭은 맨 위로 올리는 동시에 목록을 첫 페이지로 되돌리는데, 애니메이션이
   * 도는 도중에 스크롤 콘텐츠가 짧아지면 WebKit이 진행 중인 프로그래매틱 스크롤을
   * 중간에 놓아 버린다. 실제로 시뮬레이터에서 200px쯤 남기고 멈췄다. 목적지가 늘
   * 맨 위인 동작에 경합을 붙일 이유가 없어 한 번에 옮긴다.
   *
   * 저장값도 같이 0으로 눌러 둔다. 이 직후 화면이 다시 마운트되더라도 방금 지나온
   * 중간 위치로 되돌아가지 않는다.
   */
  const tick = useViewState((state) => (key ? state.topTicks[key] : 0));
  const seen = useRef(tick);
  useEffect(() => {
    if (seen.current === tick) return;
    seen.current = tick;
    if (key) useViewState.getState().setScrollTop(key, 0);
    ref.current?.scrollTo({ top: 0 });
  }, [tick, key, ref]);
}
