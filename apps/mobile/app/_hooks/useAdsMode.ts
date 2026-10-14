"use client";

import { useContext } from "react";
import type { AdsMode } from "@plick/core/ads";
import { AdsModeContext } from "@/_components/AdsProvider";

/** 이번 요청의 광고 모드 (KAN-652). `AdsProvider` 밖이면 `off`다. */
export function useAdsMode(): AdsMode {
  return useContext(AdsModeContext);
}
