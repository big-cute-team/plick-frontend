"use client";

import { create } from "zustand";

interface DebateOpinionState {
  articleId: string | null;
  open: (articleId: string) => void;
  close: (articleId: string) => void;
}

/** 댓글 잠금 영역과 투표 카드가 같은 작성 창을 연다. 다른 기사로 이동하면 해당 창만 닫는다. */
export const useDebateOpinion = create<DebateOpinionState>((set) => ({
  articleId: null,
  open: (articleId) => set({ articleId }),
  close: (articleId) =>
    set((state) =>
      state.articleId === articleId ? { articleId: null } : state,
    ),
}));
