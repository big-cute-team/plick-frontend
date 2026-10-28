"use client";

import { useSyncExternalStore } from "react";

/** 바뀌는 값이 아니라 구독할 것이 없다 */
const subscribe = () => () => {};

/**
 * 하이드레이션이 끝났는지 (KAN-682). 서버 렌더와 하이드레이션 첫 렌더는 false,
 * 그 뒤 재렌더부터 true다.
 *
 * 서버 HTML에 없는 속성을 클라 첫 렌더가 요구하면 React는 하이드레이션 때 그
 * 불일치를 고쳐 쓰지 않는다. 더 보기 버튼이 그랬다. 묵은 씨앗 때문에 마운트 직후
 * 첫 페이지 재요청이 돌면 React는 `disabled`를 계산하지만 DOM에는 없어 겉으로는
 * 활성이고, 클릭은 props의 disabled를 보고 버려진다. 요청도 에러도 없이 아무 일이
 * 안 일어난다. 이 값으로 첫 렌더를 서버와 맞추면 하이드레이션 직후 재렌더에서
 * React가 속성을 실제로 쓴다.
 *
 * `useMediaQuery`와 같은 `useSyncExternalStore` 방식이다. `useEffect`로 state를 켜면
 * 한 프레임 늦고, 서버 스냅샷을 따로 두는 이 방식은 하이드레이션이 끝나자마자
 * 동기로 재렌더된다.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
