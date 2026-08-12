"use client";

import { useState, useTransition } from "react";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import type { TeamCode } from "@plick/domain/types";
import { ErrorDialog } from "@/_components/ErrorDialog";
import { TeamCrestCard } from "@/_components/TeamCrestCard";
import { submitOnboarding } from "@/_services/users";
import { SkipLink } from "@/_onboarding/_components/SkipLink";
import { ONBOARDING_TOTAL_STEPS } from "@/_constants/onboarding";

/**
 * W9 온보딩 팀 선택 카드 — 스텝 표시(2/2) + 제목 + 빅6 팀 그리드(2열, 선택 카드는
 * accent 보더 + 체크 배지) + 하단 "시작하기" 버튼. 피그마 node 224-2.
 *
 * 팀 카드는 공용 `TeamCrestCard`(프로필 수정 응원팀 픽커와 동일 마크업)를 쓰고,
 * 이 화면은 2열 배치·카드 프레임·CTA만 담당한다. 응원팀은 다중 선택이다(모바일
 * KAN-267 피드백과 동일) — 안 골라도 되고(빈 배열 허용), 카드를 다시 누르면 해제된다.
 * "시작하기"에서 1단계 닉네임과 함께 온보딩 저장 서버 액션을 부른다(KAN-320).
 * 성공하면 액션이 홈으로 보낸다. 저장 거절(닉네임 중복·금지어 등)은 중앙 팝업
 * (`ErrorDialog`)으로 보여준다.
 *
 * 카드 최소 높이(`min-h-170` = 680px)는 W8 닉네임 카드와 같은 온보딩 프레임 값으로,
 * "시작하기" 버튼을 아래로 밀어낸다(`flex-1` + `justify-end`).
 *
 * @param nickname - 1단계에서 쿼리로 넘어온 닉네임
 */
export function TeamSelectForm({ nickname }: { nickname: string }) {
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
    <main className="px-edge flex min-h-dvh items-center justify-center py-16">
      <section className="border-border bg-elevate-2 rounded-hero max-w-onboarding gap-gap flex min-h-170 w-full flex-col border px-11 pt-10 pb-9">
        <p className="text-body text-text-4 tracking-label text-right font-bold">
          2 / {ONBOARDING_TOTAL_STEPS}
        </p>

        <div className="flex w-full flex-col items-start gap-2.5">
          <h1 className="text-headline text-text font-extrabold">
            응원하는 팀을 선택해주세요
          </h1>
          <p className="text-body text-text-3">
            마이팀 소식을 가장 먼저 보여드려요
          </p>

          <div className="gap-gap grid w-full grid-cols-2 pt-4">
            {TEAM_ORDER.map((code) => (
              <TeamCrestCard
                key={code}
                team={TEAMS[code]}
                selected={teams.includes(code)}
                onSelect={() => toggle(code)}
                className="h-29.5"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-end">
          <SkipLink />
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-pill bg-accent text-on-accent text-body-lg focus-visible:outline-accent h-13 w-full font-extrabold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60 disabled:opacity-40"
          >
            {pending ? "저장 중…" : "시작하기"}
          </button>
        </div>

        {error && (
          <ErrorDialog message={error} onClose={() => setError(null)} />
        )}
      </section>
    </main>
  );
}
