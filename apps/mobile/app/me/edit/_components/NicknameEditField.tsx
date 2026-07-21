"use client";

import { useState } from "react";
import { NICKNAME_MAX_LENGTH } from "@/onboarding/_lib/constants";

/**
 * 닉네임 변경 입력 — 인풋 + 중복확인 버튼.
 *
 * 현재 닉네임은 위 정보 카드에 이미 보이므로, 이 인풋은 "새로 바꿀 값"만 받는다
 * (빈 값 + 플레이스홀더로 시작). 아직 껍데기다: 입력값만 로컬로 들고, 중복확인·저장은
 * BE 연동 티켓에서 채운다(BE 닉네임 변경은 7일 제한이라 409를 그때 다뤄야 한다).
 */
export function NicknameEditField() {
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-body text-text font-extrabold">닉네임 변경</span>
        <span className="text-caption text-text-4">
          7일마다 한 번 바꿀 수 있어요
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        <div className="bg-elevate-2 border-border rounded-card flex h-13 min-w-0 flex-1 items-center gap-2.5 border px-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={NICKNAME_MAX_LENGTH}
            aria-label="닉네임 변경"
            placeholder="새 닉네임"
            className="text-body text-text placeholder:text-text-4 min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-semibold"
          />
          <span className="text-label text-text-4 font-semibold">
            {value.length}/{NICKNAME_MAX_LENGTH}
          </span>
        </div>

        <button
          type="button"
          className="bg-elevate-2 border-border text-text-3 rounded-card text-body h-13 shrink-0 border px-4 font-semibold active:opacity-70"
        >
          중복확인
        </button>
      </div>
    </div>
  );
}
