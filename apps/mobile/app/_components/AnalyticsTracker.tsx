"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { touchSession, trackScreenViewed } from "@plick/core/events";
import { resolveScreen } from "@plick/core/screens";

/**
 * 서비스 진입과 라우트 전환을 행동 이벤트로 보낸다 (KAN-543). 그리는 것은 없고 루트
 * 레이아웃에 하나만 둔다.
 *
 * 라우트 전환은 `usePathname`으로 듣는다. Next App Router는 `history.replaceState`도
 * 가로채 라우터 상태에 반영하므로, 홈 팀 필터(`/teams/[slug]`)나 릴 넘김(`/reels/{id}`)처럼
 * 서버 요청 없이 URL만 바꾸는 전환도 여기 잡힌다. 같은 화면과 ref면 다시 보내지 않는다 —
 * 릴을 넘길 때마다 `/reels/{id}`가 바뀌지만 화면은 `reels` 하나다.
 *
 * 진입(`app_entered`)은 `touchSession`이 판정한다. 마운트, 라우트 전환, 탭이 다시 보일 때,
 * 터치·키 입력마다 불러 마지막 조작 시각을 갱신하고 30분 넘게 비어 있었으면 다시 진입으로
 * 센다. 리스너는 passive라 스크롤을 막지 않는다.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastScreen = useRef<string | null>(null);

  useEffect(() => {
    touchSession();
    const resolved = resolveScreen(pathname);
    if (!resolved) return;
    const key = resolved.ref
      ? `${resolved.screen}:${resolved.ref}`
      : resolved.screen;
    if (key === lastScreen.current) return;
    lastScreen.current = key;
    trackScreenViewed(resolved.screen, resolved.ref);
  }, [pathname]);

  useEffect(() => {
    const onActivity = () => touchSession();
    const onVisibility = () => {
      if (document.visibilityState === "visible") touchSession();
    };
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
