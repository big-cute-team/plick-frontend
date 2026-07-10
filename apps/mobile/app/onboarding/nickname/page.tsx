import Link from "next/link";
import { AppShell } from "@/_components/AppShell";
import { CURRENT_USER } from "@/_lib/mock";
import { OnboardingTopBar } from "@/onboarding/_components/OnboardingTopBar";
import { NicknameField } from "./_components/NicknameField";

/** A5 온보딩 1/2 닉네임 설정 — 회원가입 직후 진입 (KAN-176, 피그마 96-6). */
export default function OnboardingNicknamePage() {
  return (
    <AppShell>
      <main className="flex h-full flex-col">
        <OnboardingTopBar step={1} backHref="/signup" />

        <section className="px-edge flex flex-1 flex-col pt-5.5">
          <h1 className="text-headline text-text leading-[1.35] font-extrabold tracking-[-0.4px]">
            닉네임을 정해주세요
          </h1>
          <p className="text-body text-text-3 mt-2.5 font-semibold">
            댓글과 반응에 표시될 이름이에요
          </p>

          <div className="mt-7.5">
            <NicknameField initial={CURRENT_USER.nickname} />
          </div>
        </section>

        <section
          className="px-edge"
          /* 피그마 하단 여백 56px, 홈 인디케이터가 그보다 두꺼운 기기에선 24px 띄움 */
          style={{
            paddingBottom: "max(56px, env(safe-area-inset-bottom) + 24px)",
          }}
        >
          <Link
            href="/onboarding/team"
            className="bg-accent text-on-accent rounded-pill text-body-lg flex h-13 w-full items-center justify-center font-extrabold active:opacity-90"
          >
            다음
          </Link>
        </section>
      </main>
    </AppShell>
  );
}
