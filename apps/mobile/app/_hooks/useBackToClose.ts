"use client";

import { useEffect, useRef } from "react";

/** 이 훅이 쌓은 히스토리 항목임을 표시하는 state 키. Next가 내부 키(`__NA` 등)와 병합해 보존한다. */
const STATE_KEY = "plkBackToClose";

/**
 * 안드로이드 뒤로가기(=브라우저 history back)로 시트·모달을 닫는 훅 (유튜브 쇼츠 방식).
 *
 * 시트가 열릴 때 같은 URL로 히스토리 항목을 하나 쌓아 뒤로가기 한 번을 흡수한다.
 * 뒤로가기를 누르면 브라우저가 그 항목을 소비하며 popstate를 쏘고, 페이지 이탈
 * 대신 `onClose`가 불린다. X 버튼이나 드래그로 닫히면 정리 단계에서 `history.back()`으로
 * 남은 유령 항목을 지워 다음 뒤로가기가 씹히지 않게 한다. iOS 사파리의 엣지
 * 스와이프 백도 같은 popstate라 동작이 같다.
 *
 * Next App Router는 네이티브 pushState를 가로채 `usePathname`과 동기화하는데,
 * 같은 URL이라 리렌더 없이 항목만 쌓이고 커스텀 state 키도 보존된다(실측, ADR 0094).
 *
 * 시트가 열린 채 다른 페이지로 소프트 내비게이션하면 유령 항목이 새 항목 밑에
 * 남는다 — 정리 단계에서 최상단이 우리 항목일 때만 back()하므로 이동을 되돌리는
 * 사고는 없고, 그 경로로 돌아왔을 때 뒤로가기가 한 번 더 필요할 뿐이다.
 *
 * @param open 시트가 화면에 있는 동안 true (릴 시트는 `motion.mounted`)
 * @param onClose 뒤로가기가 눌렸을 때 닫기를 시작할 콜백 (릴 시트는 `requestClose`)
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  /* 개폐마다 이펙트를 다시 걸지 않도록 콜백은 ref로 든다 */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    window.history.pushState({ [STATE_KEY]: true }, "");
    /** 뒤로가기가 항목을 이미 소비했는지 — true면 정리 단계의 back()을 건너뛴다 */
    let consumed = false;

    const onPopState = () => {
      consumed = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      if (!consumed && window.history.state?.[STATE_KEY]) {
        window.history.back();
      }
    };
  }, [open]);
}
