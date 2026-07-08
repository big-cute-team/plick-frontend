import type { RumorStage } from "./types";

/** 12400 → "12.4K", 940 → "940" */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
}

/** 루머 단계 표시 라벨 + 색 토큰(=Tailwind text 유틸 접미어) */
export const STAGE_META: Record<
  RumorStage,
  { label: string; toneClass: string }
> = {
  RUMOUR: { label: "RUMOUR", toneClass: "text-text-3" },
  IN_PROGRESS: { label: "IN PROGRESS", toneClass: "text-accent" },
  OFFICIAL: { label: "OFFICIAL", toneClass: "text-accent" },
};
