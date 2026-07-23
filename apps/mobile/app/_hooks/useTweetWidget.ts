"use client";

import { useEffect, useState, type RefObject } from "react";

/** 위젯 렌더 상태 — error면 호출부가 컨테이너를 숨겨 placeholder에 자리를 넘긴다 */
export type TweetWidgetStatus = "loading" | "ready" | "error";

/** widgets.js는 앱에서 한 번만 로드한다 — 동시 임베드가 같은 Promise를 공유 */
let widgetsPromise: Promise<NonNullable<Window["twttr"]> | null> | null = null;

/**
 * widgets.js를 미리 로드해 둔다 (KAN-291). 릴스처럼 임베드가 확실히 쓰일
 * 화면이 마운트 시 부르면, 첫 위젯 생성 때 스크립트 로드를 기다리지 않는다.
 * 클라이언트 전용 — effect 안에서만 부른다.
 */
export function preloadTweetWidgets() {
  void loadWidgets();
}

/**
 * X 공식 임베드 스크립트를 로드하고 `window.twttr`를 돌려준다.
 * 로드 실패(네트워크·차단기)는 throw 대신 null — 임베드는 조용히 폴백한다.
 */
function loadWidgets() {
  widgetsPromise ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = () => resolve(window.twttr ?? null);
    script.onerror = () => resolve(null);
    document.head.append(script);
  });
  return widgetsPromise;
}

/**
 * X 공식 widgets.js로 트윗 하나를 컨테이너에 iframe으로 그린다 (KAN-291).
 *
 * react-tweet(비공식 신디케이션 API)을 걷어내고 공식 임베드로 전환한 자리다.
 * iframe 내부는 X 소유라 스타일을 못 만지므로, 테마는 `<html data-theme>`을
 * 읽어 createTweet의 theme 옵션으로 맞추고 토글 시 다시 그린다(PLick은 다크가
 * 기본이라 속성이 없으면 dark).
 *
 * id나 테마가 바뀌면 위젯을 지우고 다시 만든다 — 공식 임베드는 렌더 후
 * 옵션을 못 바꾼다. 재생성 경합은 이전 위젯 요소를 제거해 정리한다.
 *
 * @param containerRef 위젯을 심을 요소. 렌더 전까지 비어 있어 뒤 placeholder가 보인다.
 * @param id 트윗 status ID. null이면 아무것도 하지 않는다.
 */
export function useTweetWidget(
  containerRef: RefObject<HTMLElement | null>,
  id: string | null,
): TweetWidgetStatus {
  const [status, setStatus] = useState<TweetWidgetStatus>("loading");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () =>
      setTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !id) return;
    let cancelled = false;
    setStatus("loading");

    loadWidgets().then(async (twttr) => {
      if (cancelled) return;
      if (!twttr) {
        setStatus("error");
        return;
      }
      container.replaceChildren();
      const widget = await twttr.widgets.createTweet(id, container, {
        theme,
        conversation: "none",
        align: "center",
        dnt: true,
      });
      if (cancelled) {
        /* 재생성 경합 — 다음 effect가 컨테이너를 비운 뒤 늦게 도착한 위젯 제거 */
        widget?.remove();
        return;
      }
      setStatus(widget ? "ready" : "error");
    });

    return () => {
      cancelled = true;
    };
  }, [containerRef, id, theme]);

  return status;
}
