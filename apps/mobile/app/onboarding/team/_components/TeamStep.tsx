"use client";

import { useState, useTransition } from "react";
import type { TeamCode } from "@plick/domain/types";
import { BottomActionBar } from "@/_components/BottomActionBar";
import { PrimaryButton } from "@/_components/PrimaryButton";
import { ScrollArea } from "@/_components/ScrollArea";
import { submitOnboarding } from "@/_lib/api/users";
import { TeamSelectGrid } from "./TeamSelectGrid";

/**
 * 온보딩 2단계 폼 — 팀 선택 상태를 들고, "시작하기"에서 1단계 닉네임과 함께
 * 온보딩 저장 서버 액션을 부른다(KAN-264). 성공하면 액션이 홈으로 보낸다.
 * 팀은 안 골라도 된다(BE가 미선택 온보딩 허용) — 선택 없음으로 시작한다.
 *
 * @param nickname - 1단계에서 쿼리로 넘어온 닉네임
 */
export function TeamStep({ nickname }: { nickname: string }) {
  const [team, setTeam] = useState<TeamCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitOnboarding(nickname, team);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <>
      <ScrollArea>
        <section className="px-edge pt-5.5 pb-6">
          <h1 className="text-headline text-text font-extrabold">
            응원하는 팀을 선택해주세요
          </h1>
          <p className="text-body text-text-3 mt-2.5 font-semibold">
            마이팀 소식을 가장 먼저 보여드려요
          </p>

          <div className="mt-7.5">
            <TeamSelectGrid selected={team} onSelect={setTeam} />
          </div>
        </section>
      </ScrollArea>

      <BottomActionBar>
        {error && (
          <p
            className="text-caption text-danger mb-2.5 text-center"
            role="alert"
          >
            {error}
          </p>
        )}
        <PrimaryButton onClick={submit} disabled={pending}>
          {pending ? "저장 중…" : "시작하기"}
        </PrimaryButton>
      </BottomActionBar>
    </>
  );
}
