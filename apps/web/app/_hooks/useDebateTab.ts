"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RANKINGS_PATH } from "@/_constants/app";
import type { DebateTab } from "@/_types/debates";
import {
  DEFAULT_DEBATE_TAB,
  LEGACY_RANK_TAB,
  debateTabFrom,
  debateTabPath,
} from "@/_utils/debates";

/**
 * 투표 화면의 지금 탭 (KAN-683). 원본은 URL `?tab=`이고 바꾸면 `history.replaceState`로
 * URL만 고친다(서버 왕복도 히스토리 쌓임도 없다).
 *
 * `useSearchParams`를 쓰지 않는다. 정적(ISR) 페이지에서 그 훅은 가장 가까운 Suspense 경계까지
 * 클라이언트 렌더로 미뤄서, 서버 HTML에는 fallback(스켈레톤)만 남고 투표 목록이 한 건도 안
 * 실렸다(KAN-667 이후 상태). 크롤러와 애드센스 심사자는 그 HTML을 본다. 대신 서버와
 * 하이드레이션 첫 렌더는 기본 탭으로 그리고, 마운트 뒤 `location.search`를 읽어 맞춘다.
 * 승부예측 직접 진입은 마운트 뒤 해당 탭으로 맞춘다. 뒤로·앞으로
 * 가기(popstate)도 따라간다. 옛 `?tab=rank`(모바일 링크, 북마크)는 랭킹이 `/rankings` 페이지로 나가서
 * (KAN-724 PR) 거기로 바꿔 보낸다.
 *
 * @returns `[tab, selectTab]`. `selectTab`은 URL을 바꾸고 상태를 올린다
 */
export function useDebateTab(): readonly [
  DebateTab,
  (next: DebateTab) => void,
] {
  const [tab, setTab] = useState<DebateTab>(DEFAULT_DEBATE_TAB);
  const router = useRouter();

  useEffect(() => {
    const read = () => {
      const raw = new URLSearchParams(window.location.search).get("tab");
      if (raw === LEGACY_RANK_TAB) {
        router.replace(RANKINGS_PATH);
        return;
      }
      setTab(debateTabFrom(raw));
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [router]);

  const selectTab = useCallback((next: DebateTab) => {
    window.history.replaceState(null, "", debateTabPath(next));
    setTab(next);
  }, []);

  return [tab, selectTab] as const;
}
