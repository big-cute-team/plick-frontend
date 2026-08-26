"use client";

import { useEffect } from "react";

/**
 * 지금 보고 있는 릴을 주소창에 되비춘다 (KAN-349, 유튜브 쇼츠 방식).
 *
 * 릴을 넘길 때마다 URL을 `/reels/{id}`로 바꿔서, 새로고침하면 그 릴에서 다시
 * 시작하고 주소를 복사해도 그 릴이 공유된다. 내비게이션이 아니라 표시 갱신이라
 * `router.replace` 대신 네이티브 `history.replaceState`를 쓴다 — Next App Router가
 * 네이티브 호출을 가로채 `usePathname`만 동기화하고 라우트 트리는 다시 그리지
 * 않으므로(ADR 0094와 같은 전제) 릴이 리렌더 없이 주소만 바뀐다. `router.replace`는
 * 소프트 내비게이션이라 딥링크 라우트를 실제로 마운트해 피드가 통째로 갈린다.
 *
 * state를 버리지 않고 그대로 되넘긴다 — 세부 시트가 열려 있으면 히스토리 최상단이
 * `useBackToClose`가 쌓은 항목이고, state를 null로 밀면 그 표식이 지워져 닫기
 * 정리 단계의 back() 판정이 어긋난다.
 *
 * replace라 히스토리가 쌓이지 않는다 — 뒤로가기는 릴을 되감지 않고 릴스에 들어오기
 * 전 화면으로 나간다.
 *
 * @param reelId 지금 보고 있는 릴 id. 로딩 중처럼 아직 없으면 건드리지 않는다.
 */
export function useReelUrlSync(reelId: string | undefined) {
  useEffect(() => {
    if (!reelId) return;
    const path = `/reels/${reelId}`;
    if (window.location.pathname === path) return;
    window.history.replaceState(window.history.state, "", path);
  }, [reelId]);
}
