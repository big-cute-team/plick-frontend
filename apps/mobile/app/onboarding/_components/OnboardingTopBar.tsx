import { BackButton } from "@/_components/BackButton";
import { TopBarShell } from "@/_components/TopBarShell";
import { ONBOARDING_TOTAL_STEPS } from "@/onboarding/_lib/constants";

/**
 * 온보딩 상단바 — 뒤로가기 + 우측 스텝 표시(`1 / 2`).
 *
 * @param step - 현재 스텝(1부터)
 * @param backHref - 뒤로가기 목적지
 */
export function OnboardingTopBar({
  step,
  backHref,
}: {
  step: number;
  backHref: string;
}) {
  return (
    <TopBarShell innerClassName="justify-between">
      <BackButton href={backHref} />
      <span className="text-body text-text-4 tracking-label font-bold">
        {step} / {ONBOARDING_TOTAL_STEPS}
      </span>
    </TopBarShell>
  );
}
