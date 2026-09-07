"use client";

import { useState } from "react";
import { TEAMS } from "@plick/domain/constants";
import type { LiveTeam } from "@plick/domain/live";
import { TeamCrest } from "@plick/ui/TeamCrest";

/**
 * 라이브 화면의 팀 표식 — 빅6는 로컬 크레스트, 빅6 밖은 API-Football CDN 로고,
 * 없거나 실패하면 축약 코드 제네릭 원형(모바일 `live/_components/LiveCrest`와
 * 같은 규약). 실패 상태 때문에 클라 컴포넌트다. 라이브 지면이 안정되면
 * `@plick/ui` 승격을 ADR 0011 게이트로 판단한다.
 */
export function LiveCrest({
  team,
  size = 24,
  className = "",
}: {
  team: LiveTeam;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (team.code) {
    return (
      <TeamCrest team={TEAMS[team.code]} size={size} className={className} />
    );
  }
  if (team.logo && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- CDN 로고 호스트가 외부라 next/image 대신 일반 img (TeamCrest·MediaThumb과 같은 이유)
      <img
        src={team.logo}
        alt={team.name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className={`shrink-0 object-contain ${className}`}
      />
    );
  }
  return (
    <span
      aria-label={team.name}
      className={`bg-elevate text-text-4 grid shrink-0 place-items-center rounded-full font-bold ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(7, size * 0.3) }}
    >
      {team.shortName.slice(0, 3)}
    </span>
  );
}
