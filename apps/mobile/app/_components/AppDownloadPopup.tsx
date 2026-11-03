"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  type MobileOs,
  resolveBrowserKind,
  resolveMobileOs,
} from "@plick/core/analytics";
import {
  APP_STORE_URL,
  BRAND_NAME_KO,
  PLAY_STORE_URL,
} from "@plick/domain/brand";
import { AppleIcon, GooglePlayIcon } from "@plick/ui/icons";
import { SquareLogo } from "@plick/ui/Logo";
import { CRAWLER_UA_PATTERN } from "@/_constants/api";
import {
  APP_DOWNLOAD_CLOSED_KEY,
  APP_DOWNLOAD_DISMISS_MS,
  APP_DOWNLOAD_DISMISS_UNTIL_KEY,
  APP_DOWNLOAD_SKIP_PATHS,
} from "@/_constants/app";
import { PopupDialog } from "./PopupDialog";

/** OS별 스토어 버튼. 아이콘은 단색 글리프라 버튼 글자색을 따른다 */
const STORE_BUTTON: Record<
  MobileOs,
  { href: string; label: string; Icon: typeof AppleIcon }
> = {
  ios: { href: APP_STORE_URL, label: "App Store에서 받기", Icon: AppleIcon },
  android: {
    href: PLAY_STORE_URL,
    label: "Google Play에서 받기",
    Icon: GooglePlayIcon,
  },
};

/** 어느 저장소인지. 접근 자체가 던질 수 있어 이름만 받고 안에서 고른다 */
type StorageKind = "local" | "session";

/**
 * 저장소 읽기·쓰기. 사파리 사생활 보호 모드와 일부 인앱 웹뷰, 서드파티 iframe은 `localStorage`
 * 프로퍼티를 읽는 순간부터 던진다. 그래서 저장소 객체를 밖에서 받지 않고 try 안에서 고른다.
 * 못 읽으면 안 닫은 것으로, 못 쓰면 조용히 넘긴다. 팝업 하나라 대가가 없다.
 */
function readStorage(kind: StorageKind, key: string): string | null {
  try {
    return (kind === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(kind: StorageKind, key: string, value: string) {
  try {
    (kind === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    /* 저장이 막힌 환경이면 다음 방문에 다시 뜬다 */
  }
}

/**
 * 앱 다운로드 팝업 (KAN-711). 모바일 웹에 처음 들어온 폰 사용자에게 OS에 맞는 스토어 버튼을
 * 보인다. 인스타 광고로 들어오든 검색으로 들어오든 모든 화면의 부모(`AppShell`)에 있어 진입
 * 경로를 가리지 않는다.
 *
 * 안 띄우는 경우는 다섯이다.
 * - 우리 앱 셸(`PlickApp` UA, `resolveBrowserKind` → `plick_app`). 이미 앱이다
 * - 크롤러(`CRAWLER_UA_PATTERN`). 구글이 본문을 덮는 앱 설치 인터스티셜을 감점한다
 * - 폰이 아닌 기기(`resolveMobileOs` → null). 스토어 버튼이 갈 데가 없다
 * - "하루 동안 보지 않기"(localStorage 만료 시각)나 "닫기"(sessionStorage) 뒤
 * - 로그인·가입·OAuth 경로(`APP_DOWNLOAD_SKIP_PATHS`)
 *
 * 판단은 마운트 뒤 한 번이다. 서버는 localStorage도 UA도 모르니 첫 렌더에는 안 그리고
 * (하이드레이션 어긋남 방지) 이펙트에서 OS를 정한다. 경로 제외는 렌더마다 본다. 로그인에서
 * 홈으로 돌아오면 그때 뜬다.
 *
 * E2E 봇 쿠키(`plick_e2e`)는 HttpOnly라 브라우저 코드가 못 본다. 대신 playwright.config의
 * storageState가 "하루 동안 보지 않기" 키에 먼 미래 값을 심는다.
 */
export function AppDownloadPopup() {
  const pathname = usePathname();
  const [os, setOs] = useState<MobileOs | null>(null);

  useEffect(() => {
    if (readStorage("session", APP_DOWNLOAD_CLOSED_KEY)) return;
    const until = Number(
      readStorage("local", APP_DOWNLOAD_DISMISS_UNTIL_KEY) ?? 0,
    );
    if (until > Date.now()) return;
    const ua = navigator.userAgent;
    if (CRAWLER_UA_PATTERN.test(ua)) return;
    if (resolveBrowserKind(ua) === "plick_app") return;
    setOs(resolveMobileOs(ua, navigator.maxTouchPoints));
  }, []);

  if (!os) return null;
  if (APP_DOWNLOAD_SKIP_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const close = () => {
    writeStorage("session", APP_DOWNLOAD_CLOSED_KEY, "1");
    setOs(null);
  };

  const dismissForDay = () => {
    writeStorage(
      "local",
      APP_DOWNLOAD_DISMISS_UNTIL_KEY,
      String(Date.now() + APP_DOWNLOAD_DISMISS_MS),
    );
    setOs(null);
  };

  const { href, label, Icon } = STORE_BUTTON[os];

  return (
    <PopupDialog onClose={close} label="앱 다운로드 안내">
      <div className="flex flex-col items-center text-center">
        <SquareLogo size={72} className="rounded-hero" />
        <p className="text-title text-text-strong tracking-heading mt-4 font-black">
          {BRAND_NAME_KO} 앱으로 더 편하게
        </p>
        <p className="text-body text-text-3 mt-1.5 leading-relaxed">
          이적 루머와 라이브 스코어를
          <br />
          앱에서 더 빠르게 확인하세요.
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className="bg-accent text-on-accent rounded-control text-body-md mt-5 flex h-12 w-full items-center justify-center gap-2 font-bold active:opacity-60"
        >
          <Icon size={18} />
          {label}
        </a>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={dismissForDay}
          className="text-caption text-text-3 -mx-2 px-2 py-2 active:opacity-60"
        >
          하루 동안 보지 않기
        </button>
        <button
          type="button"
          onClick={close}
          className="text-caption text-text-2 -mx-2 px-2 py-2 font-bold active:opacity-60"
        >
          닫기
        </button>
      </div>
    </PopupDialog>
  );
}
