"use client";

import { useState } from "react";
import { BottomActionBar } from "@/_components/BottomActionBar";
import { PrimaryButton } from "@/_components/PrimaryButton";
import { SkipLink } from "@/onboarding/_components/SkipLink";
import { NicknameField } from "./NicknameField";

/**
 * 온보딩 1단계 폼 — 닉네임 상태를 들고, "다음"에 쿼리로 실어 2단계(팀 선택)로 넘긴다.
 * 온보딩 저장 API는 두 단계 값을 한 번에 받으므로(KAN-264) 여기선 전송 없이 값만 나른다.
 *
 * @param initial - 초기 닉네임 — `GET /users/me`의 닉네임(KAN-267). 온보딩 전엔 BE가
 *   null을 주므로(자동 닉네임 미구현) 페이지가 빈 값으로 좁혀 내려준다.
 */
export function NicknameStep({ initial = "" }: { initial?: string }) {
  const [nickname, setNickname] = useState(initial);
  const trimmed = nickname.trim();

  return (
    <>
      <section className="px-edge flex flex-1 flex-col pt-5.5">
        <h1 className="text-headline text-text font-extrabold">
          닉네임을 정해주세요
        </h1>
        <p className="text-body text-text-3 mt-2.5 font-semibold">
          댓글과 반응에 표시될 이름이에요
        </p>

        <div className="mt-7.5">
          <NicknameField value={nickname} onChange={setNickname} />
        </div>
      </section>

      <BottomActionBar>
        <SkipLink />
        {trimmed ? (
          <PrimaryButton
            href={`/onboarding/team?nickname=${encodeURIComponent(trimmed)}`}
          >
            다음
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled>다음</PrimaryButton>
        )}
      </BottomActionBar>
    </>
  );
}
