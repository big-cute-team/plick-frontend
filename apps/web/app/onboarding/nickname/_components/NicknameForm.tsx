"use client";

import { useState } from "react";
import { CheckIcon } from "@plick/ui/icons";
import { CURRENT_USER } from "@/_mocks/posts";
import {
  NICKNAME_MAX_LENGTH,
  ONBOARDING_TOTAL_STEPS,
} from "@/_constants/onboarding";

/**
 * W8 온보딩 닉네임 설정 카드 — 스텝 표시(1/2) + 제목 + 닉네임 입력(글자수 카운터·
 * 사용 가능 안내) + 하단 "다음" 버튼. 피그마 node 225-2.
 *
 * 소셜 가입에서 넘어온 이름(`CURRENT_USER.nickname`)을 초깃값으로 채운다. BE 전이라
 * "사용 가능" 판정은 비어있지 않으면 통과하는 목 검증이다.
 *
 * 카드 최소 높이(`min-h-170` = 680px)는 피그마 프레임을 그대로 재현해 "다음" 버튼을
 * 아래로 밀어내는 값이다(`flex-1` + `justify-end`).
 */
export function NicknameForm() {
  const [nickname, setNickname] = useState(CURRENT_USER.nickname);
  const isAvailable = nickname.trim().length > 0;

  return (
    <main className="px-edge flex min-h-dvh items-center justify-center py-16">
      <section className="border-border bg-elevate-2 rounded-hero max-w-onboarding gap-gap flex min-h-170 w-full flex-col border px-11 pt-10 pb-9">
        <p className="text-body text-text-4 tracking-label text-right font-bold">
          1 / {ONBOARDING_TOTAL_STEPS}
        </p>

        <div className="flex w-full flex-col items-start gap-2.5">
          <h1 className="text-headline text-text">닉네임을 정해주세요</h1>
          <p className="text-body text-text-3">
            댓글과 반응에 표시될 이름이에요
          </p>

          <div className="w-full pt-5">
            <label
              className={`rounded-card bg-elevate-2 flex h-13.5 w-full items-center gap-2.5 border px-5 transition-colors ${
                isAvailable
                  ? "border-accent"
                  : "border-border focus-within:border-accent"
              }`}
            >
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={NICKNAME_MAX_LENGTH}
                placeholder="닉네임 입력"
                aria-label="닉네임"
                className="text-body-lg text-text placeholder:text-text-4 min-w-0 flex-1 bg-transparent font-bold outline-none"
              />
              <span className="text-label text-text-4 shrink-0 tabular-nums">
                {nickname.length}/{NICKNAME_MAX_LENGTH}
              </span>
            </label>
          </div>

          {isAvailable && (
            <p className="text-accent text-label flex items-center gap-1.5 px-1">
              <CheckIcon size={14} />
              사용 가능한 닉네임이에요
            </p>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-end">
          <button
            type="button"
            disabled={!isAvailable}
            className="rounded-pill bg-accent text-on-accent text-body-lg focus-visible:outline-accent h-13 w-full font-extrabold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </section>
    </main>
  );
}
