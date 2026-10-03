"use client";

import { NICKNAME_MAX_LENGTH } from "@plick/domain/constants";
import { NicknameCheckNotice } from "@/_components/NicknameCheckNotice";
import type { NicknameCheckResult } from "@/_hooks/useNicknameCheck";

/**
 * 닉네임 입력 필드. 입력 면 인풋 + 글자수 카운터 + 중복확인 버튼 (KAN-269, KAN-567에서
 * 입력 면 토큰과 rounded-control로 정리).
 * 상태는 전부 부모(NicknameStep)가 든다 — 값은 다음 단계로 넘겨야 하고,
 * 중복확인 결과는 "다음" 버튼 잠금 판단에 필요해서다. 이 컴포넌트는 표시만 한다.
 *
 * @param value - 현재 닉네임
 * @param onChange - 입력 변경 핸들러
 * @param result - 중복확인 결과 (`useNicknameCheck`)
 * @param pending - 중복확인 진행 중 여부
 * @param onCheck - "중복확인" 버튼 클릭 핸들러
 */
export function NicknameField({
  value,
  onChange,
  result,
  pending,
  onCheck,
}: {
  value: string;
  onChange: (value: string) => void;
  result: NicknameCheckResult;
  pending: boolean;
  onCheck: () => void;
}) {
  const trimmed = value.trim();

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <div className="bg-input rounded-control flex h-12 min-w-0 flex-1 items-center gap-2.5 px-3.5">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={NICKNAME_MAX_LENGTH}
            aria-label="닉네임"
            placeholder={`한글, 영문, 숫자 ${NICKNAME_MAX_LENGTH}자까지`}
            className="text-body-md text-text-strong placeholder:text-text-4 min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-normal"
          />
          <span className="text-label text-text-4">
            {value.length}/{NICKNAME_MAX_LENGTH}
          </span>
        </div>

        <button
          type="button"
          onClick={onCheck}
          disabled={!trimmed || pending}
          className="border-border-strong text-text-2 rounded-control text-label-lg h-12 shrink-0 border px-3.5 font-bold active:opacity-70 disabled:opacity-40"
        >
          {pending ? "검사 중" : "닉네임 검사"}
        </button>
      </div>

      <div className="mt-2.5 pt-0.5">
        <NicknameCheckNotice result={result} />
      </div>
    </div>
  );
}
