"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { crossSiteUrl } from "@plick/domain/cross-site";
import { CloseIcon } from "@plick/ui/icons";
import { SWITCH_BANNER_DISMISS_KEY } from "@/_constants/app";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";

/**
 * 모바일 전환 추천 배너 (KAN-379) — 데스크톱 도메인(`plick.co.kr`)을 좁은
 * 화면에서 열었을 때 상단에 뜬다. 모바일 앱의 `SwitchToWebBanner`와 짝이다.
 *
 * 이 앱도 좁은 화면에서 깨지지는 않지만(lg 미만 대응이 있다), 릴스처럼 모바일에
 * 맞춰 만든 화면은 모바일 도메인이 낫다. 그걸 알려 주기만 하고 보내지는 않는다 —
 * 자동 리다이렉트는 사용자가 고른 주소를 뺏고, 공유 링크(ADR 0047)가 origin
 * 기준이라 링크 의미까지 바뀐다.
 *
 * 판별 조건은 SEO에서 모바일 alternate를 선언할 때 쓰는
 * {@link MOBILE_ALTERNATE_MEDIA}를 그대로 재사용한다 — "이 조건이면 모바일 URL"
 * 이라고 크롤러에 이미 선언해 둔 기준이라, 사람에게 권하는 기준도 같아야 한다.
 *
 * 서버에서는 창 크기도 localStorage도 알 수 없으므로 첫 렌더에는 아무것도 그리지
 * 않고, 마운트 뒤 조건이 맞을 때만 켠다. 그래야 하이드레이션이 어긋나지 않는다.
 */
export function SwitchToMobileBanner() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (localStorage.getItem(SWITCH_BANNER_DISMISS_KEY)) return;
    const media = window.matchMedia(MOBILE_ALTERNATE_MEDIA);
    setShow(media.matches);
    /* 창 크기가 바뀌는 동안에도 따라온다 — 한 번 닫았으면 아래 dismiss가 끈다 */
    const onChange = (e: MediaQueryListEvent) => setShow(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  if (!show) return null;

  return (
    <div className="bg-elevate-2 border-border px-gutter gap-gap flex items-center border-b py-2.5">
      <p className="text-caption text-text-2 min-w-0 flex-1">
        모바일에 맞춘 화면이 따로 있어요.
      </p>
      <a
        href={crossSiteUrl(MOBILE_SITE_URL, pathname)}
        className="text-caption text-accent focus-visible:outline-accent shrink-0 font-bold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60"
      >
        모바일로 보기
      </a>
      <button
        type="button"
        aria-label="배너 닫기"
        onClick={() => {
          localStorage.setItem(SWITCH_BANNER_DISMISS_KEY, "1");
          setShow(false);
        }}
        className="text-text-4 focus-visible:outline-accent -mr-1 shrink-0 p-1 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
