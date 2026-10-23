"use client";

import {
  createContext,
  type ReactNode,
  useLayoutEffect,
  useState,
} from "react";
import { type AdsMode, resolveAdsMode } from "@plick/core/ads";
import { resolveBrowserKind } from "@plick/core/analytics";
import { ADS_BASE_MODE } from "@/_constants/ads";

/** 지금 화면의 광고 모드. `AdsProvider`가 브라우저에서 정하고 `useAdsMode`가 읽는다. */
export const AdsModeContext = createContext<AdsMode>("off");

/**
 * 광고 모드 컨텍스트 (KAN-652, KAN-632).
 *
 * 전에는 레이아웃이 서버에서 프록시의 UA 판정 헤더를 읽어 모드를 정해 내려줬다. 그 `headers()`
 * 호출이 전 라우트를 동적 렌더로 만드는 원인 중 하나라(ADR 0199) 판정을 브라우저로 옮겼다.
 * 서버 렌더와 하이드레이션은 `off`로 그려 광고 자리를 비워 두고, `useLayoutEffect`에서
 * `navigator.userAgent`로 앱 셸 여부를 가려 모드를 올린다. 레이아웃 이펙트는 첫 페인트 전에
 * 돌아 사용자는 빈 자리를 보지 않는다. 앱 셸이면 `off`로 남아 광고 단위를 한 번도 안 그린다.
 * 앱 셸에서 로더 스크립트의 자동 광고까지 막는 건 head의 `adsPauseScript`가 맡는다.
 */
export function AdsProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AdsMode>("off");
  useLayoutEffect(() => {
    setMode(
      resolveAdsMode(ADS_BASE_MODE, resolveBrowserKind(navigator.userAgent)),
    );
  }, []);
  return <AdsModeContext value={mode}>{children}</AdsModeContext>;
}
