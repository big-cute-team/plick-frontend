import { redirect } from "next/navigation";
import { ONBOARDING_ENTRY } from "@/_constants/app";
import { TeamSelectForm } from "./_components/TeamSelectForm";

/**
 * W9 온보딩 팀 선택(2/2) — 닉네임 다음, 다크 배경 중앙 카드로 마이팀을 고른다.
 * KAN-248 퍼블리싱, KAN-320 API 연결. 피그마 224-2.
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

  return <TeamSelectForm nickname={nickname} />;
}
