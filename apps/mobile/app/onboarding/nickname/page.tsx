import { AppShell } from "@/_components/AppShell";
import { OnboardingTopBar } from "@/onboarding/_components/OnboardingTopBar";
import { NicknameStep } from "./_components/NicknameStep";

/** A5 온보딩 1/2 닉네임 설정 — 회원가입 직후 진입 (KAN-176, 피그마 96-6). */
export default function OnboardingNicknamePage() {
  return (
    <AppShell>
      <main className="flex h-full flex-col">
        <OnboardingTopBar step={1} backHref="/signup" />
        <NicknameStep />
      </main>
    </AppShell>
  );
}
