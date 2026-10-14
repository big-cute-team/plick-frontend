"use client";

import { createContext, type ReactNode } from "react";
import type { AdsMode } from "@plick/core/ads";

/** 이번 요청의 광고 모드. 레이아웃이 서버에서 정해 내려보내고 `useAdsMode`가 읽는다. */
export const AdsModeContext = createContext<AdsMode>("off");

/**
 * 광고 모드 컨텍스트 (KAN-652). 앱 셸 여부는 프록시가 UA로 가른 헤더를 레이아웃이
 * 읽어 정하므로, 클라에서 UA를 다시 보는 대신 서버가 정한 값을 그대로 쓴다. 그래야
 * 자리를 미리 잡는 wrapper가 서버 HTML부터 맞아 하이드레이션 뒤 밀림이 없다.
 *
 * @param mode 서버가 정한 모드
 */
export function AdsProvider({
  mode,
  children,
}: {
  mode: AdsMode;
  children: ReactNode;
}) {
  return <AdsModeContext value={mode}>{children}</AdsModeContext>;
}
