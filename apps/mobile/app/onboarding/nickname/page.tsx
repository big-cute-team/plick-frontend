import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/_components/AppShell";
import { getMyProfile } from "@/_services/profile";
import { OnboardingTopBar } from "@/onboarding/_components/OnboardingTopBar";
import { NicknameStep } from "./_components/NicknameStep";

/** 가입 직후 흐름이라 색인 가치가 없다 — robots disallow 대신 이 noindex가 색인을 막는다 (KAN-384). */
export const metadata: Metadata = {
  title: "닉네임 설정",
  robots: { index: false, follow: false },
};

/**
 * A5 온보딩 1/2 닉네임 설정 — 회원가입 직후 진입 (KAN-176, 피그마 96-6).
 * 초깃값은 `GET /users/me`의 닉네임(KAN-267) — BE가 가입 시 자동 부여한 닉네임
 * (plick+숫자)을 채워 시작하고, 자동 부여 도입 전 레거시 유저만 null이라 빈 값으로 시작한다.
 */
export default async function OnboardingNicknamePage() {
  const profile = await getMyProfile();
  if (!profile) {
    redirect("/login"); // 온보딩은 가입 직후 흐름 — 세션 없이는 저장도 못 한다
  }

  return (
    <AppShell>
      <main className="flex h-full flex-col">
        <OnboardingTopBar step={1} backHref="/signup" />
        <NicknameStep initial={profile.nickname ?? ""} />
      </main>
    </AppShell>
  );
}
