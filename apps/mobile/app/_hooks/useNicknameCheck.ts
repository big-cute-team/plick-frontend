"use client";

import { useState, useTransition } from "react";
import { NICKNAME_MAX_LENGTH, NICKNAME_PATTERN } from "@plick/domain/constants";
import { checkNickname } from "@/_services/users";

/** 중복확인 결과 — 아직 안 눌렀으면 null, 눌렀으면 사용 가능 여부 또는 조회 실패. */
export type NicknameCheckResult =
  | { available: boolean }
  | { error: string }
  | null;

/**
 * 닉네임 중복확인 상태 기계 (KAN-269) — 온보딩·프로필 수정 공용.
 * `check`가 서버 액션(`checkNickname`)을 불러 결과를 들고, 입력이 바뀌면
 * 호출부가 `reset`으로 직전 결과를 지운다(결과는 마지막으로 확인한 문자열에만 유효).
 *
 * 형식(한글·영문·숫자 1~12자)은 서버를 부르기 전에 여기서 먼저 거른다(KAN-391).
 * 키 입력마다 검사하면 한글 조합 중 자모(ㅅ → 시)가 매번 걸려 경고가 깜빡이므로,
 * 버튼을 누른 순간에만 판정한다. 최종 판정은 항상 서버다(욕설 목록은 서버만 안다).
 */
export function useNicknameCheck() {
  const [result, setResult] = useState<NicknameCheckResult>(null);
  const [pending, startTransition] = useTransition();

  const check = (nickname: string) => {
    if (!NICKNAME_PATTERN.test(nickname)) {
      setResult({
        error: `닉네임은 한글·영문·숫자만 1~${NICKNAME_MAX_LENGTH}자로 쓸 수 있어요`,
      });
      return;
    }
    startTransition(async () => {
      setResult(await checkNickname(nickname));
    });
  };

  const reset = () => setResult(null);

  return { result, pending, check, reset };
}
