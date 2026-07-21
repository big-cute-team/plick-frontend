"use client";

import { CheckIcon } from "@plick/ui/icons";
import { NICKNAME_MAX_LENGTH } from "@/onboarding/_lib/constants";

/**
 * 닉네임 입력 필드 — accent 보더 인풋 + 글자수 카운터 + 사용 가능 안내.
 * 상태는 부모(NicknameStep)가 들고 있는 제어형 — 다음 단계로 값을 넘겨야 해서다.
 *
 * 검증은 닉네임 중복 확인 API 연동 전이라 목 동작: 비어있지 않으면 "사용 가능"으로 표시한다.
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
  const available = value.length > 0;

  return (
    <div>
      <div className="bg-elevate-2 border-accent rounded-card flex h-14 items-center gap-2.5 border px-4.75">
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

      {available && (
        <p className="text-label text-accent mt-2.5 flex items-center gap-1.5 px-1 pt-0.5 font-semibold">
          <CheckIcon size={14} />
          사용 가능한 닉네임이에요
        </p>
      )}
    </div>
  );
}
