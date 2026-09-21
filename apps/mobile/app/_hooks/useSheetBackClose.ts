"use client";

import { useEffect, useRef } from "react";

/**
 * 시스템 뒤로가기로 바텀시트만 닫는다 (KAN-514).
 *
 * 시트는 라우트가 아니라 컴포넌트 상태라, 열려 있어도 히스토리에는 아무 자국이
 * 없다. 그래서 선수 스탯 시트를 열어 둔 채 뒤로가기를 누르면 시트가 닫히는 게
 * 아니라 **팀 프로필 자체에서 빠져나갔다** — 사용자가 보기엔 시트 하나 닫으려다
 * 화면이 통째로 사라지는 셈이다.
 *
 * 그래서 시트를 열 때 같은 URL로 히스토리 항목을 하나 쌓는다. URL이 그대로라
 * 주소는 바뀌지 않고 뒤로 갈 자리만 하나 생긴다. 뒤로가기가 그 항목을 꺼내면
 * (`popstate`) 라우트는 그대로인 채 우리가 시트만 닫는다.
 *
 * 다른 방법으로 닫혔을 때(스크림 탭·Escape·아래로 스와이프)는 그 항목이 히스토리에
 * 그대로 남아 있다. 안 걷어내면 시트를 닫은 뒤 누른 뒤로가기가 그 빈 항목을
 * 소모하느라 한 번 헛돈다. 그래서 정리에서 `back()`으로 직접 걷어낸다.
 * `popped`가 그 둘을 가른다 — 뒤로가기로 닫혔으면 항목은 이미 소모됐다.
 *
 * 시트 안에 다른 화면으로 가는 링크가 생기면 이 정리가 그 이동을 되돌린다.
 * 지금 `LiveSheet`를 쓰는 지면은 전부 링크가 없다.
 *
 * @param open 시트가 열려 있는가
 * @param onClose 뒤로가기가 왔을 때 부를 닫기 콜백
 */
export function useSheetBackClose(open: boolean, onClose: () => void): void {
  /* 리스너는 등록 시점에 굳으므로 최신 콜백은 ref로 건넨다 */
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    window.history.pushState(null, "");
    let popped = false;

    const onPop = () => {
      popped = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (!popped) window.history.back();
    };
  }, [open]);
}
