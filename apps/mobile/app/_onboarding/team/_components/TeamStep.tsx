"use client";

import { useState, useTransition } from "react";
import type { TeamCode } from "@plick/domain/types";
import { BottomActionBar } from "@/_components/BottomActionBar";
import { ErrorDialog } from "@/_components/ErrorDialog";
import { PrimaryButton } from "@/_components/PrimaryButton";
import { ScrollArea } from "@/_components/ScrollArea";
import { submitOnboarding } from "@/_services/users";
import { SkipLink } from "@/_onboarding/_components/SkipLink";
import { TeamSelectGrid } from "./TeamSelectGrid";

/**
 * 온보딩 2단계 폼 — 팀 선택 상태를 들고, "시작하기"에서 1단계 닉네임과 함께
 * 온보딩 저장 서버 액션을 부른다(KAN-264). 성공하면 액션이 홈으로 보낸다.
 * 저장 거절(닉네임 중복·금지어 등)은 중앙 팝업(`ErrorDialog`)으로 보여준다.
 * 응원팀은 다중 선택이다(KAN-267 피드백) — 안 골라도 되고(빈 배열 허용),
 * 카드를 다시 누르면 해제된다.
 *
 * @param nickname - 1단계에서 쿼리로 넘어온 닉네임
 */
export function TeamStep({ nickname }: { nickname: string }) {
  const [teams, setTeams] = useState<TeamCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (code: TeamCode) => {
    setTeams((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitOnboarding(nickname, teams);
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
            <TeamSelectGrid selected={teams} onToggle={toggle} />
          </div>
        </section>
      </ScrollArea>

      <BottomActionBar>
        <SkipLink />
        <PrimaryButton onClick={submit} disabled={pending}>
          {pending ? "저장 중…" : "시작하기"}
        </PrimaryButton>
      </BottomActionBar>

      {error && <ErrorDialog message={error} onClose={() => setError(null)} />}
    </>
  );
}
