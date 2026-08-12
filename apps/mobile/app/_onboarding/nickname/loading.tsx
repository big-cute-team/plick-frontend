import { AppShell } from "@/_components/AppShell";
import { OnboardingTopBar } from "@/_onboarding/_components/OnboardingTopBar";

/** 온보딩 1단계 로딩 스켈레톤 — 초기 닉네임 fetch(`GET /users/me`) 동안 자리를 잡아둔다. */
export default function OnboardingNicknameLoading() {
  return (
    <AppShell>
      <main className="flex h-full flex-col">
        <OnboardingTopBar step={1} backHref="/signup" />
        <section className="px-edge flex flex-1 animate-pulse flex-col pt-5.5">
          <div className="bg-elevate rounded-tile h-7 w-52" />
          <div className="bg-elevate rounded-tile mt-3 h-5 w-64" />
          <div className="bg-elevate rounded-card mt-7.5 h-13" />
        </section>
      </main>
    </AppShell>
  );
}
