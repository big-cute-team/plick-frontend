"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

/**
 * 요소를 지금 보고 있는가 (KAN-684). 요소가 스크롤 영역(여유 포함) 안에 있고 탭이 앞에 있을 때 true다.
 * 열어 두면 비용이 드는 것(소켓, 폴링)을 사람이 보고 있을 때만 켜는 용도다.
 *
 * 교차는 `IntersectionObserver`로 보되 root를 가장 가까운 스크롤 조상(홈은 `ScrollArea`)으로 잡는다.
 * root 없이 뷰포트로 보면 `rootMargin`은 뷰포트 사각형만 넓히고, 요소와 스크롤 조상의 클립 영역은 여유
 * 없이 그대로 계산돼 조상 가장자리를 벗어나는 순간 안 보이는 것으로 떨어진다. 여유를 주려면 그 조상이
 * root여야 한다. 스크롤 조상이 없으면 뷰포트다. 탭 전환은 `visibilitychange`로 듣는다. 서버와 첫
 * 하이드레이션은 둘 다 모르는 상태라 false다.
 *
 * @param ref 볼 요소
 * @param margin 스크롤 영역 바깥 여유(`rootMargin`). 이 안에 들어오면 보이는 것으로 친다
 */
export function useOnScreen(
  ref: RefObject<Element | null>,
  margin = "0px",
): boolean {
  const [inView, setInView] = useState(false);
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        /* 한 요소만 보니 마지막 항목이 지금 상태다 */
        setInView(entries.at(-1)?.isIntersecting ?? false);
      },
      { root: nearestScrollParent(el), rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin]);

  return inView && visible;
}

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * 요소를 잘라내는 가장 가까운 스크롤 조상. 세로 overflow가 `auto`나 `scroll`인 첫 조상이고, 없으면
 * null(관찰자는 뷰포트를 root로 쓴다).
 *
 * @param el 시작 요소
 */
function nearestScrollParent(el: Element): Element | null {
  for (let node = el.parentElement; node !== null; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === "auto" || overflow === "scroll") return node;
  }
  return null;
}
