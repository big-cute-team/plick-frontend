import Link from "next/link";
import { AppShell } from "@/_components/AppShell";
import { ScrollArea } from "@/_components/ScrollArea";
import { CURRENT_USER } from "@/_lib/mock";
import { OnboardingTopBar } from "@/onboarding/_components/OnboardingTopBar";
import { TeamSelectGrid } from "./_components/TeamSelectGrid";

/** A6 온보딩 2/2 마이팀 선택 — 닉네임 설정 다음 (KAN-176, 피그마 95-6). */
export default function OnboardingTeamPage() {
  return (
    <AppShell>
      <OnboardingTopBar step={2} backHref="/onboarding/nickname" />

      <ScrollArea>
        <section className="px-edge pt-5.5 pb-6">
          <h1 className="text-headline text-text leading-[1.35] font-extrabold tracking-[-0.4px]">
            응원하는 팀을 선택해주세요
          </h1>
          <p className="text-body text-text-3 mt-2.5 font-semibold">
            마이팀 소식을 가장 먼저 보여드려요
          </p>

          <div className="mt-7.5">
            <TeamSelectGrid initial={CURRENT_USER.myTeam} />
          </div>
        </section>
      </ScrollArea>

      <section
        className="px-edge"
        /* 피그마 하단 여백 56px, 홈 인디케이터가 그보다 두꺼운 기기에선 24px 띄움 */
        style={{
          paddingBottom: "max(56px, env(safe-area-inset-bottom) + 24px)",
        }}
      >
        <Link
          href="/"
          className="bg-accent text-on-accent rounded-pill text-body-lg flex h-13 w-full items-center justify-center font-extrabold active:opacity-90"
        >
          시작하기
        </Link>
      </section>
    </AppShell>
  );
}
