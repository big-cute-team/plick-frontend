"use client";

import { NicknameCheckNotice } from "@/_components/NicknameCheckNotice";
import type { NicknameCheckResult } from "@/_hooks/useNicknameCheck";
import { NICKNAME_MAX_LENGTH } from "@/_constants/onboarding";

/**
 * 닉네임 입력 필드 — accent 보더 인풋 + 글자수 카운터 + 중복확인 버튼 (KAN-269).
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
        <div className="bg-elevate-2 border-accent rounded-card flex h-14 min-w-0 flex-1 items-center gap-2.5 border px-4.75">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={NICKNAME_MAX_LENGTH}
            aria-label="닉네임"
            className="text-body-lg text-text min-w-0 flex-1 bg-transparent font-bold outline-none"
          />
          <span className="text-label text-text-4 font-semibold">
            {value.length}/{NICKNAME_MAX_LENGTH}
          </span>
        </div>

        <button
          type="button"
          onClick={onCheck}
          disabled={!trimmed || pending}
          className="bg-elevate-2 border-border text-text-3 rounded-card text-body h-14 shrink-0 border px-4 font-semibold active:opacity-70 disabled:opacity-40"
        >
          {pending ? "확인 중…" : "중복확인"}
        </button>
      </div>

      <div className="mt-2.5 pt-0.5">
        <NicknameCheckNotice result={result} />
      </div>
    </div>
  );
}
