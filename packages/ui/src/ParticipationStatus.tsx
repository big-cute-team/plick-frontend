"use client";

import { useEffect, useState } from "react";
import { participationDeadline } from "@plick/domain/vs";

/** 실제 참여 가능 상태와 마감 시간을 표시한다. 참여량을 임의로 늘리지 않는다. */
export function ParticipationStatus({
  label,
  closesAt,
}: {
  label: string;
  closesAt?: string | null;
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
  return (
    <span className="text-caption text-accent flex min-h-6 min-w-0 items-center gap-1.5 font-bold">
      <span
        aria-hidden
        className="bg-accent size-1.5 shrink-0 rounded-full motion-safe:animate-pulse"
      />
      <span className="shrink-0">{deadline === "마감" ? "마감" : label}</span>
      {deadline && deadline !== "마감" && (
        <span className="text-text-3 ml-auto truncate tabular-nums">
          {deadline}
        </span>
      )}
    </span>
  );
}
