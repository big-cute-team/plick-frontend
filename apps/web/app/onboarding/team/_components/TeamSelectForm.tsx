"use client";

import { useState } from "react";
import Link from "next/link";
import { TEAMS, TEAM_ORDER } from "@plick/domain/constants";
import { CURRENT_USER } from "@/_lib/mock";
import type { TeamCode } from "@plick/domain/types";
import { TeamCrestCard } from "@/_components/TeamCrestCard";
import { ONBOARDING_TOTAL_STEPS } from "@/onboarding/_lib/constants";

/**
 * W9 온보딩 팀 선택 카드 — 스텝 표시(2/2) + 제목 + 빅6 팀 그리드(2열, 선택 카드는
 * accent 보더 + 체크 배지) + 하단 "시작하기" 버튼. 피그마 node 224-2.
 *
 * 팀 카드는 공용 `TeamCrestCard`(프로필 수정 응원팀 픽커와 동일 마크업)를 쓰고,
 * 이 화면은 2열 배치·카드 프레임·CTA만 담당한다. 선택 상태는 로컬로만
 * 유지한다(퍼블리싱 단계라 저장은 미연결). 초깃값은 마이팀 목데이터
 * (`CURRENT_USER.myTeam`). "시작하기"는 홈(`/`)으로 이동한다.
 *
 * 카드 최소 높이(`min-h-170` = 680px)는 W8 닉네임 카드와 같은 온보딩 프레임 값으로,
 * "시작하기" 버튼을 아래로 밀어낸다(`flex-1` + `justify-end`).
 */
export function TeamSelectForm() {
  const [selected, setSelected] = useState<TeamCode>(CURRENT_USER.myTeam);

  return (
    <main className="px-edge flex min-h-dvh items-center justify-center py-16">
      <section className="border-border bg-elevate-2 rounded-hero max-w-onboarding gap-gap flex min-h-170 w-full flex-col border px-11 pt-10 pb-9">
        <p className="text-body text-text-4 tracking-label text-right font-bold">
          2 / {ONBOARDING_TOTAL_STEPS}
        </p>

        <div className="flex w-full flex-col items-start gap-2.5">
          <h1 className="text-headline text-text">
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
                selected={code === selected}
                onSelect={() => setSelected(code)}
                className="h-29.5"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-end">
          <Link
            href="/"
            className="rounded-pill bg-accent text-on-accent text-body-lg focus-visible:outline-accent flex h-13 w-full items-center justify-center font-extrabold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-60"
          >
            시작하기
          </Link>
        </div>
      </section>
    </main>
  );
}
