"use client";

import { useState } from "react";
import Link from "next/link";
import { NICKNAME_MAX_LENGTH } from "@plick/domain/constants";
import { NicknameCheckNotice } from "@/_components/NicknameCheckNotice";
import { useNicknameCheck } from "@/_hooks/useNicknameCheck";
import { SkipLink } from "@/_onboarding/_components/SkipLink";
import { ONBOARDING_TOTAL_STEPS } from "@/_constants/onboarding";

/**
 * W8 온보딩 닉네임 설정 카드 — 스텝 표시(1/2) + 제목 + 닉네임 입력(글자수 카운터,
 * 검사 버튼, 결과 안내) + 하단 "다음" 버튼. KAN-567 리디자인으로 라이트 톤, 각진 상자에
 * 레일 테두리, 채운 강조색 버튼 48px이다.
 *
 * "다음"은 현재 입력값이 중복확인을 통과했을 때만 열린다. 중복이거나, 입력을
 * 바꾸고 아직 확인 안 했으면 잠긴다(입력이 바뀌면 결과를 지우므로 자동으로 다시 잠김).
 * 온보딩 저장 API는 두 단계 값을 한 번에 받으므로(KAN-320) 여기선 전송 없이
 * "다음"에 쿼리로 실어 2단계(팀 선택)로 넘긴다. 확인은 그 순간의 답이라 제출 때
 * BE가 다시 검사한다(팝업 처리).
 *
 * 카드 최소 높이(`min-h-150`)는 "다음" 버튼을 아래로 밀어내는 값이다(`flex-1` +
 * `justify-end`).
 *
 * @param initial 초기 닉네임. `GET /users/me`의 닉네임. 자동 닉네임(plick+숫자)은
 *   금지어 "plick"을 포함해 확인을 통과할 수 없으므로, 진행하려면 자기 닉네임을
 *   새로 정해야 한다(건너뛰기는 SkipLink 몫).
 */
export function NicknameForm({ initial = "" }: { initial?: string }) {
  const [nickname, setNickname] = useState(initial);
  const { result, pending, check, reset } = useNicknameCheck();

  const trimmed = nickname.trim();
  const confirmed =
    result !== null && "available" in result && result.available;

  /** 입력이 바뀌면 직전 확인 결과는 더 이상 유효하지 않다. 지워서 "다음"도 잠근다. */
  const handleChange = (next: string) => {
    setNickname(next);
    reset();
  };

  return (
    <main className="bg-elevate flex min-h-dvh items-center justify-center px-4 py-16">
      <section className="bg-bg border-border-strong max-w-onboarding flex min-h-150 w-full flex-col gap-3 border px-10 pt-9 pb-8">
        <p className="text-label text-text-4 text-right font-bold">
          1 / {ONBOARDING_TOTAL_STEPS}
        </p>

        <div className="flex w-full flex-col items-start gap-2">
          <h1 className="text-headline text-text-strong tracking-title font-black">
            닉네임을 정해주세요
          </h1>
          <p className="text-body text-text-3">
            댓글과 반응에 표시될 이름이에요
          </p>

          <div className="flex w-full items-stretch gap-2 pt-5">
            <label
              className={`bg-bg flex h-12 min-w-0 flex-1 items-center gap-2.5 border px-4 transition-colors ${
                confirmed
                  ? "border-accent"
                  : "border-border-table focus-within:border-accent"
              }`}
            >
              <input
                type="text"
                value={nickname}
                onChange={(e) => handleChange(e.target.value)}
                maxLength={NICKNAME_MAX_LENGTH}
                placeholder={`한글, 영문, 숫자 1~${NICKNAME_MAX_LENGTH}자`}
                aria-label="닉네임"
                className="text-body-md text-text placeholder:text-text-4 min-w-0 flex-1 bg-transparent font-bold outline-none"
              />
              <span className="text-caption text-text-4 shrink-0">
                {nickname.length}/{NICKNAME_MAX_LENGTH}
              </span>
            </label>

            <button
              type="button"
              onClick={() => check(trimmed)}
              disabled={!trimmed || pending}
              className="border-border-table text-body text-text-2 hover:border-accent hover:text-accent focus-visible:outline-accent h-12 shrink-0 border px-4 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
            >
              {pending ? "검사 중" : "닉네임 검사"}
            </button>
          </div>

          <NicknameCheckNotice result={result} />
        </div>

        <div className="flex flex-1 flex-col justify-end">
          <SkipLink />
          {confirmed ? (
            <Link
              href={`/onboarding/team?nickname=${encodeURIComponent(trimmed)}`}
              className="bg-accent text-on-accent text-body-lg hover:bg-accent-hover focus-visible:outline-accent flex h-12 w-full items-center justify-center font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              다음
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="bg-accent text-on-accent text-body-lg h-12 w-full font-bold disabled:opacity-40"
            >
              다음
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
