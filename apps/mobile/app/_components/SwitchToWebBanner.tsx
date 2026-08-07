"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { crossSiteUrl } from "@plick/domain/cross-site";
import { CloseIcon } from "@plick/ui/icons";
import { SWITCH_BANNER_DISMISS_KEY, WEB_SUGGEST_MEDIA } from "@/_constants/app";
import { WEB_SITE_URL } from "@/_constants/site";

/**
 * 데스크톱 전환 추천 배너 (KAN-379) — 모바일 도메인(`m.plick.co.kr`)을 넓은
 * 화면에서 열었을 때 상단에 뜬다.
 *
 * 이 앱은 셸이 480px로 묶여 있어 데스크톱에서 열면 화면 가운데 폰 하나가 떠
 * 있는 꼴이 된다. 그 상황에서 데스크톱용 화면이 따로 있다는 걸 알려 준다.
 * 반대 방향(데스크톱 도메인을 폰에서 열기)은 web 앱의 같은 이름 컴포넌트가 맡는다.
 *
 * 자동으로 보내지 않고 배너로만 권한다. 도메인을 강제로 바꾸면 사용자가 일부러
 * 고른 주소를 뺏는 셈이고, 공유 링크(ADR 0047)가 origin 기준이라 리다이렉트가
 * 링크 의미까지 바꿔 버린다.
 *
 * 판별은 UA가 아니라 뷰포트로 한다({@link WEB_SUGGEST_MEDIA}) — 이 코드베이스의
 * 반응형 판단이 전부 뷰포트 기준이고, 틀려도 배너 하나라 대가가 없다.
 *
 * 서버에서는 창 크기도 localStorage도 알 수 없으므로 첫 렌더에는 아무것도 그리지
 * 않고, 마운트 뒤 조건이 맞을 때만 켠다. 그래야 하이드레이션이 어긋나지 않는다.
 */
export function SwitchToWebBanner() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (localStorage.getItem(SWITCH_BANNER_DISMISS_KEY)) return;
    const media = window.matchMedia(WEB_SUGGEST_MEDIA);
    setShow(media.matches);
    /* 창을 넓히거나 좁히는 동안에도 따라온다 — 한 번 닫았으면 아래 dismiss가 끈다 */
    const onChange = (e: MediaQueryListEvent) => setShow(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  if (!show) return null;

  return (
    <div className="bg-elevate-2 border-border gap-gap px-edge flex shrink-0 items-center border-b py-2.5">
      <p className="text-caption text-text-2 min-w-0 flex-1">
        더 넓은 화면에 맞춘 PC 버전이 있어요.
      </p>
      <a
        href={crossSiteUrl(WEB_SITE_URL, pathname)}
        className="text-caption text-accent shrink-0 font-bold active:opacity-60"
      >
        PC로 보기
      </a>
      <button
        type="button"
        aria-label="배너 닫기"
        onClick={() => {
          localStorage.setItem(SWITCH_BANNER_DISMISS_KEY, "1");
          setShow(false);
        }}
        className="text-text-4 -mr-1 shrink-0 p-1 active:opacity-60"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
