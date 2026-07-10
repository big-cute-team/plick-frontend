"use client";

import { useState } from "react";
import { CheckIcon } from "@/_components/icons";
import { NICKNAME_MAX_LENGTH } from "@/onboarding/_lib/constants";

/**
 * 닉네임 입력 필드 — accent 보더 인풋 + 글자수 카운터 + 사용 가능 안내.
 *
 * 검증은 BE 전이라 목 동작: 비어있지 않으면 "사용 가능"으로 표시한다.
 *
 * @param initial - 초기 닉네임 (회원가입 직후 소셜 프로필 이름)
 */
export function NicknameField({ initial }: { initial: string }) {
  const [nickname, setNickname] = useState(initial);
  const available = nickname.length > 0;

  return (
    <div>
      <div className="bg-elevate-2 border-accent rounded-card flex h-14 items-center gap-2.5 border px-4.75">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX_LENGTH}
          aria-label="닉네임"
          className="text-body-lg text-text min-w-0 flex-1 bg-transparent font-bold outline-none"
        />
        <span className="text-label text-text-4 font-semibold">
          {nickname.length}/{NICKNAME_MAX_LENGTH}
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
