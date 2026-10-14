"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ADSENSE_CLIENT } from "@plick/core/ads";
import { AD_UNITS, type AdPlacement, type AdUnit } from "@/_constants/ads";
import { useAdsMode } from "@/_hooks/useAdsMode";
import { useMediaQuery } from "@/_hooks/useMediaQuery";
import type { AdsWindow } from "@/_types/ads";

/**
 * 광고 자리 하나 (KAN-652). 모드에 따라 세 가지로 그린다.
 * - `live`: 애드센스 `<ins>`를 두고 마운트 때 로더에 push한다. 단위 번호가 비어 있으면
 *   빈 칸을 남기지 않으려고 아예 그리지 않는다.
 * - `placeholder`: 같은 크기의 점선 상자에 AD만 쓴다. 레이아웃 확인용.
 * - `off`: 아무것도 그리지 않는다.
 *
 * 자리는 wrapper가 `min-height`로 미리 잡아 광고가 늦게 와도 본문이 밀리지 않는다.
 *
 * 애드센스 함정 둘을 여기서 막는다. 하나, 숨겨진 상자를 push하면 폭 0으로 실패하고
 * 다시 살아나지 않아 `media`가 맞을 때만 상자를 마운트한다. 둘, 같은 상자를 두 번
 * push하면 "already have ads"로 실패해 경로가 바뀌면 상자를 새로 마운트한다(홈과 팀
 * 허브가 같은 화면 트리를 쓴다).
 *
 * @param placement 자리 이름. `AD_UNITS`에서 단위와 크기를 찾는다
 * @param media 이 자리가 CSS로 보이는 조건. 상자는 이 조건이 맞을 때만 마운트한다
 * @param enabled false면 자리만 잡고 상자는 두지 않는다(릴스 DOM 창 밖)
 * @param className wrapper에 더할 유틸(여백)
 */
export function AdSlot({
  placement,
  media,
  enabled = true,
  className = "",
}: {
  placement: AdPlacement;
  media?: string;
  enabled?: boolean;
  className?: string;
}) {
  const mode = useAdsMode();
  const pathname = usePathname();
  const unit = AD_UNITS[placement];
  if (mode === "off") return null;
  if (mode === "live" && !unit.slot) return null;

  const fill = unit.height === undefined;
  return (
    <div
      data-ad-placement={placement}
      className={`flex items-center justify-center ${fill ? "size-full" : "w-full"} ${className}`}
      style={fill ? undefined : { minHeight: unit.height }}
    >
      {enabled &&
        (mode === "live" ? (
          <AdUnitBox key={pathname} unit={unit} media={media} />
        ) : (
          <AdPlaceholder unit={unit} />
        ))}
    </div>
  );
}

/**
 * 실제 애드센스 상자. 마운트 때 한 번 push한다. 광고 차단기가 로더를 막으면 push가
 * 던지는데 광고는 없어도 되는 것이라 삼킨다.
 */
function AdUnitBox({ unit, media }: { unit: AdUnit; media?: string }) {
  const visible = useMediaQuery(media);
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!visible || !el || el.offsetWidth === 0) return;
    try {
      ((window as AdsWindow).adsbygoogle ??= []).push({});
    } catch {
      /* 광고 차단기 등으로 로더가 없으면 빈 자리로 둔다 */
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <ins
      ref={ref}
      className="adsbygoogle block"
      style={{
        width: unit.width ?? "100%",
        height: unit.height ?? "100%",
      }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={unit.slot}
    />
  );
}

/** 자리 확인용 점선 상자. dev·로컬에서만 보인다. */
function AdPlaceholder({ unit }: { unit: AdUnit }) {
  return (
    <div
      aria-hidden
      className="border-border-strong bg-elevate text-caption text-text-4 flex items-center justify-center border border-dashed"
      style={{
        width: unit.width ?? "100%",
        height: unit.height ?? "100%",
      }}
    >
      AD
    </div>
  );
}
