import Link from "next/link";
import { ArrowLeftIcon } from "@/_components/icons";
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
    <header style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="px-edge flex h-13 items-center justify-between">
        <Link
          href={backHref}
          aria-label="뒤로"
          className="text-icon -ml-1.5 grid size-9 place-items-center active:opacity-60"
        >
          <ArrowLeftIcon size={20} />
        </Link>
        <span className="text-body text-text-4 font-bold tracking-[1px]">
          {step} / {ONBOARDING_TOTAL_STEPS}
        </span>
      </div>
    </header>
  );
}
