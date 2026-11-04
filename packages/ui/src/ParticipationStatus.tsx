"use client";

import { useEffect, useState } from "react";
import { participationDeadline } from "@plick/domain/vs";

/**
 * 실제 참여 가능 상태와 마감 시간을 표시한다. 참여량을 임의로 늘리지 않는다.
 *
 * @param label 상태 글자(`예측 중`, `투표 중`)
 * @param closesAt 마감 시각. 있으면 남은 시간을 1분마다 다시 센다
 * @param tone 색. 기본은 강조색 글자, `accent`는 강조색 면 위라 흰 글자(KAN-714)
 */
export function ParticipationStatus({
  label,
  closesAt,
  tone = "neutral",
}: {
  label: string;
  closesAt?: string | null;
  tone?: "neutral" | "accent";
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!closesAt) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 60_000);
    return () => clearInterval(timer);
  }, [closesAt]);
  const deadline =
    now !== null && closesAt ? participationDeadline(closesAt, now) : null;
  const accent = tone === "accent";
  return (
    <span
      className={`text-caption flex min-h-6 min-w-0 items-center gap-1.5 font-bold ${accent ? "text-on-accent" : "text-accent"}`}
    >
      <span
        aria-hidden
        className={`size-1.5 shrink-0 rounded-full motion-safe:animate-pulse ${accent ? "bg-on-accent" : "bg-accent"}`}
      />
      <span className="shrink-0">{deadline === "마감" ? "마감" : label}</span>
      {deadline && deadline !== "마감" && (
        <span
          className={`ml-auto truncate tabular-nums ${accent ? "text-on-accent/80" : "text-text-3"}`}
        >
          {deadline}
        </span>
      )}
    </span>
  );
}
