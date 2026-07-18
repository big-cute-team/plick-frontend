/**
 * @file 공용 참조 상수 — 팀 레지스트리·표시 순서·루머 단계 메타.
 *
 * 목데이터와 달리 BE가 붙어도 유지되는 참조 상수다. 두 앱 `app/_lib/constants.ts`에
 * 동일 값으로 복제돼 있던 것을 구조 감사(2026-07-16)로 승격했다(ADR 0018).
 * 앱 전용 상수(GNB 링크 등)는 각 앱 `app/_lib/constants.ts`에 남는다.
 */
import type { RumorStage, Team, TeamCode } from "./types";

/** 팀 레지스트리 — 코드 → 한글 이름·컬러 토큰 매핑 */
export const TEAMS: Record<TeamCode, Team> = {
  LIV: { code: "LIV", name: "리버풀", colorVar: "--plk-team-liv" },
  TOT: { code: "TOT", name: "토트넘", colorVar: "--plk-team-tot" },
  ARS: { code: "ARS", name: "아스날", colorVar: "--plk-team-ars" },
  MUN: { code: "MUN", name: "맨유", colorVar: "--plk-team-mun" },
  CHE: { code: "CHE", name: "첼시", colorVar: "--plk-team-che" },
  MCI: { code: "MCI", name: "맨시티", colorVar: "--plk-team-mci" },
};

/** 팀 필터 순서 (빅6) */
export const TEAM_ORDER: TeamCode[] = [
  "LIV",
  "TOT",
  "ARS",
  "MUN",
  "CHE",
  "MCI",
];

/** 루머 단계 표시 라벨 */
export const STAGE_META: Record<RumorStage, { label: string }> = {
  RUMOUR: { label: "RUMOUR" },
  IN_PROGRESS: { label: "IN PROGRESS" },
  OFFICIAL: { label: "OFFICIAL" },
};
