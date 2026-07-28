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

/**
 * 팀 코드 → BE `teams.team_id` 매핑 (KAN-264). 온보딩·프로필 수정의 `teamIds` 요청과
 * 기사 피드 팀 필터 쿼리에 쓴다. 모바일 `_constants/api.ts`에 있던 것을
 * web 이식(KAN-319)에서 승격했다.
 *
 * ⚠️ BE에 팀 목록 조회 API가 없어 실제 DB(teams 테이블) 값을 상수로 박아둔 계약 공백이다.
 * teams는 어드민이 쓰기 소유하는 마스터 데이터라 재시드되면 조용히 어긋난다(실제로
 * KAN-264 작업 중 7~12 → 1~6으로 바뀐 적 있다). 어긋나면 요청이 400 "존재하지 않는
 * 팀입니다"로 드러난다 — `GET /teams` 류가 생기면 이 상수를 걷어내고 조회로 교체한다.
 */
export const TEAM_IDS: Record<TeamCode, number> = {
  MUN: 1,
  MCI: 2,
  LIV: 3,
  ARS: 4,
  CHE: 5,
  TOT: 6,
};

/** 루머 단계 표시 라벨 */
export const STAGE_META: Record<RumorStage, { label: string }> = {
  RUMOUR: { label: "RUMOUR" },
  IN_PROGRESS: { label: "IN PROGRESS" },
  CONFIRM: { label: "CONFIRM" },
  OFFICIAL: { label: "OFFICIAL" },
};
