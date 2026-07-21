"use client";

import { useState, useTransition } from "react";
import { checkNickname } from "@/_lib/api/users";

/** 중복확인 결과 — 아직 안 눌렀으면 null, 눌렀으면 사용 가능 여부 또는 조회 실패. */
export type NicknameCheckResult =
  | { available: boolean }
  | { error: string }
  | null;

/**
 * 닉네임 중복확인 상태 기계 (KAN-269) — 온보딩·프로필 수정 공용.
 * `check`가 서버 액션(`checkNickname`)을 불러 결과를 들고, 입력이 바뀌면
 * 호출부가 `reset`으로 직전 결과를 지운다(결과는 마지막으로 확인한 문자열에만 유효).
 */
export function useNicknameCheck() {
  const [result, setResult] = useState<NicknameCheckResult>(null);
  const [pending, startTransition] = useTransition();

  const check = (nickname: string) => {
    startTransition(async () => {
      setResult(await checkNickname(nickname));
    });
  };

  const reset = () => setResult(null);

  return { result, pending, check, reset };
}
