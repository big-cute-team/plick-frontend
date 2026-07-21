"use client";

import { NicknameCheckNotice } from "@/_components/NicknameCheckNotice";
import { useNicknameCheck } from "@/_lib/useNicknameCheck";
import { NICKNAME_MAX_LENGTH } from "@/onboarding/_lib/constants";

/**
 * 닉네임 입력 필드 — accent 보더 인풋 + 글자수 카운터 + 중복확인 버튼 (KAN-269).
 * 상태는 부모(NicknameStep)가 들고 있는 제어형 — 다음 단계로 값을 넘겨야 해서다.
 *
 * "중복확인"은 `useNicknameCheck`(프로필 수정과 공용)로 사용 가능 여부만 확인한다.
 * 확인은 그 순간의 답일 뿐이라 저장(온보딩 제출) 때 BE가 다시 검사한다.
 *
 * @param value - 현재 닉네임
 * @param onChange - 입력 변경 핸들러
 */
export function NicknameField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { result, pending, check, reset } = useNicknameCheck();
  const trimmed = value.trim();

  /** 입력이 바뀌면 직전 확인 결과는 더 이상 유효하지 않다 — 지운다. */
  const handleChange = (next: string) => {
    onChange(next);
    reset();
  };

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <div className="bg-elevate-2 border-accent rounded-card flex h-14 min-w-0 flex-1 items-center gap-2.5 border px-4.75">
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
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
          onClick={() => check(trimmed)}
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
