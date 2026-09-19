"use client";

import { useEffect, useRef } from "react";
import { trackScreenViewed } from "@plick/core/events";

/**
 * 화면 안 탭 전환을 `screen_viewed`로 보낸다 (KAN-543). 경기 상세 탭, 팀 프로필 탭,
 * 활동 탭처럼 캐시 때문에 서버 요청 없이 바뀌는 전환이 대상이다.
 *
 * 처음 보이는 탭은 보내지 않는다. 라우트 진입은 `AnalyticsTracker`가 이미 화면 하나로
 * 세고 있어, 기본 탭까지 보내면 진입 한 번이 화면 둘이 된다(이탈률이 "화면 2개 미만"
 * 기준이라 그러면 안 된다). 탭이 바뀐 뒤부터 `screen.tab` 값으로 나간다.
 *
 * 마지막으로 보낸 탭을 ref로 들고 비교한다. StrictMode가 이펙트를 되감아도 같은 탭이라
 * 두 번 나가지 않는다.
 *
 * @param screen 화면 값 (`match_detail`)
 * @param tab 지금 탭 키. 소문자·숫자·밑줄 30자 이하여야 서버가 받는다. 탭이 없는 상태
 *   (`tabs[0]`이 비는 경기 상태)는 undefined로 넘기면 보내지 않는다
 * @param ref 그 화면의 주인공 id(경기 id, 팀 slug). 없으면 생략
 */
export function useScreenTabView(
  screen: string,
  tab: string | undefined,
  ref?: string | number,
) {
  const seen = useRef(tab);

  useEffect(() => {
    if (seen.current === tab) return;
    seen.current = tab;
    if (tab) trackScreenViewed(`${screen}.${tab}`, ref);
  }, [screen, tab, ref]);
}
