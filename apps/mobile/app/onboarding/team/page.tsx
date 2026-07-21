import { redirect } from "next/navigation";
import { AppShell } from "@/_components/AppShell";
import { ONBOARDING_ENTRY } from "@/_lib/constants";
import { OnboardingTopBar } from "@/onboarding/_components/OnboardingTopBar";
import { TeamStep } from "./_components/TeamStep";

/**
 * A6 온보딩 2/2 마이팀 선택 — 닉네임 설정 다음 (KAN-176, 피그마 95-6).
 * 1단계가 정한 닉네임을 쿼리로 받아 제출까지 나른다 — 없이 직접 들어오면 1단계로 돌려보낸다.
 */
export default async function OnboardingTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ nickname?: string }>;
}) {
  const nickname = (await searchParams).nickname?.trim();
  if (!nickname) {
    redirect(ONBOARDING_ENTRY);
  }

  return (
    <AppShell>
      <OnboardingTopBar step={2} backHref={ONBOARDING_ENTRY} />
      <TeamStep nickname={nickname} />
    </AppShell>
  );
}
