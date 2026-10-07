"use client";

import { useEffect, useState } from "react";
import {
  type BrowserKind,
  DEVICE_ID_COOKIE,
  EXTERNAL_BROWSER_SUGGEST_KINDS,
  isDeviceId,
  resolveBrowserKind,
} from "@plick/core/analytics";
import { withDeviceIdParam } from "@plick/domain/cross-site";
import { CloseIcon } from "@plick/ui/icons";
import { INAPP_BANNER_DISMISS_KEY } from "@/_constants/app";
import { readCookie } from "@/_utils/cookie";

/** 마운트 뒤 정한 이번 브라우저의 상태. 서버 렌더에는 없다 */
interface InAppState {
  kind: BrowserKind;
  /** 안드로이드면 크롬 intent 링크. 아이폰은 강제로 못 열어 null */
  chromeHref: string | null;
  /** 복사 버튼이 복사할 주소. 기기 식별자 쿼리를 단다 */
  copyHref: string;
}

/**
 * 안드로이드 크롬으로 지금 주소를 여는 intent 링크. `scheme=https`가 호스트·경로·쿼리를
 * 받아 `https://`로 조립하고, 크롬이 없으면 `browser_fallback_url`로 간다. 인스타·페이스북
 * 인앱이 이 링크를 눌렀을 때 외부 앱으로 넘겨 주는 건 안드로이드 쪽 동작이다.
 */
function chromeIntentUrl(href: string): string {
  const url = new URL(href);
  const fallback = encodeURIComponent(href);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}

/**
 * 외부 브라우저로 열기 배너 (KAN-610). 인스타그램·페이스북 인앱 브라우저로 열었을 때 상단에 뜬다.
 * 자리는 PC 전환 배너(`SwitchToWebBanner`) 바로 아래이고 모양도 같다.
 *
 * 인앱 브라우저는 기기 쿠키를 날을 넘겨 안 들고 다녀 같은 사람이 매번 새 방문자로 세어지고,
 * 구글 OAuth처럼 웹뷰 안 로그인을 막는 흐름도 있다. 처음에는 강제로 넘기지 않고 권하기만 한다.
 * 첫 화면 이탈이 늘 수 있어서다. `X-Plick-Browser`로 인앱과 외부의 체류·재방문을 비교한 뒤
 * 강제 여부를 정한다.
 *
 * 안드로이드는 `intent://` 링크로 크롬을 연다. 아이폰은 앱이 외부 브라우저 열기를 막아 두어
 * 메뉴 안내와 링크 복사만 둔다. 어느 쪽이든 주소에 기기 식별자(`?did=`)를 실어 넘어간 브라우저의
 * 프록시가 같은 기기로 잇게 한다(전환 배너와 같은 규칙, KAN-542).
 *
 * 판별은 프록시와 같은 `resolveBrowserKind`를 `navigator.userAgent`로 부른다. 서버에서는
 * localStorage를 모르니 첫 렌더에는 안 그리고 마운트 뒤 켠다(하이드레이션 어긋남 방지).
 */
export function OpenInBrowserBanner() {
  const [state, setState] = useState<InAppState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(INAPP_BANNER_DISMISS_KEY)) return;
    const kind = resolveBrowserKind(navigator.userAgent);
    if (!EXTERNAL_BROWSER_SUGGEST_KINDS.includes(kind)) return;
    const did = readCookie(DEVICE_ID_COOKIE);
    const href = withDeviceIdParam(
      window.location.href,
      isDeviceId(did) ? did : null,
    );
    const isAndroid = /android/i.test(navigator.userAgent);
    setState({
      kind,
      chromeHref: isAndroid ? chromeIntentUrl(href) : null,
      copyHref: href,
    });
  }, []);

  if (!state) return null;

  const dismiss = () => {
    localStorage.setItem(INAPP_BANNER_DISMISS_KEY, "1");
    setState(null);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.copyHref);
      setCopied(true);
    } catch {
      /* 클립보드가 막힌 웹뷰면 안내 문구만 남는다 */
    }
  };

  return (
    <div className="bg-elevate-2 border-border gap-gap px-edge flex shrink-0 items-center border-b py-2.5">
      <p className="text-caption text-text-2 min-w-0 flex-1">
        {state.chromeHref
          ? "Chrome에서 열면 기록이 끊기지 않아요."
          : "오른쪽 위 메뉴에서 외부 브라우저로 열면 기록이 끊기지 않아요."}
      </p>
      {state.chromeHref ? (
        <a
          href={state.chromeHref}
          className="text-caption text-accent shrink-0 font-bold active:opacity-60"
        >
          Chrome으로 열기
        </a>
      ) : (
        <button
          type="button"
          onClick={copy}
          className="text-caption text-accent shrink-0 font-bold active:opacity-60"
        >
          {copied ? "복사됨" : "링크 복사"}
        </button>
      )}
      <button
        type="button"
        aria-label="배너 닫기"
        onClick={dismiss}
        className="text-text-4 -mr-1 shrink-0 p-1 active:opacity-60"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
