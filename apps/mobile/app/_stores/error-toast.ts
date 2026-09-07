"use client";

/**
 * @file 전역 에러 토스트 상태 (KAN-447).
 *
 * 뮤테이션 전역 안전망(MutationCache onError)이 React 트리 밖에서 실패를 받아
 * 화면에 알려야 해서 모듈 스코프 스토어로 둔다 — 트리 밖에서는
 * `useErrorToast.getState().show()`로 부른다.
 *
 * seq는 같은 문구가 연달아 와도 토스트 타이머를 다시 걸기 위한 일련번호다.
 * message만 들고 있으면 동일 문자열 set이 상태 변경으로 안 잡혀 두 번째
 * 실패가 조용히 묻힌다.
 */

import { create } from "zustand";

interface ErrorToastState {
  message: string | null;
  seq: number;
  show: (message: string) => void;
  clear: () => void;
}

export const useErrorToast = create<ErrorToastState>((set) => ({
  message: null,
  seq: 0,
  show: (message) => set((state) => ({ message, seq: state.seq + 1 })),
  clear: () => set({ message: null }),
}));
