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

/**
 * `TEAM_IDS`의 역방향 — BE `team_id` → 팀 코드 (KAN-271).
 * 기사·릴스 피드 응답의 `teams`가 id 배열로 와서 화면 표시용 코드로 되돌릴 때 쓴다.
 * 위 매핑에서 파생시켜 두 방향이 갈라지지 않게 한다. 모바일 `_constants/api.ts`에
 * 있던 것을 web 이식(KAN-321)에서 승격했다.
 */
export const TEAM_CODES: Record<number, TeamCode> = Object.fromEntries(
  Object.entries(TEAM_IDS).map(([code, id]) => [id, code as TeamCode]),
);

/**
 * BE 루머 단계 값 → 도메인 `RumorStage` (KAN-271, KAN-276).
 *
 * 철자가 한 글자 다르다. BE와 DB는 미국식 `RUMOR`, 도메인 타입은 영국식 `RUMOUR`다.
 * 캐스팅으로 넘기면 `STAGE_META["RUMOR"]`가 undefined가 되어 배지 자리에서 런타임에
 * 터지므로 반드시 이 테이블을 거친다. 모르는 값은 null로 떨어져 배지가 안 그려질
 * 뿐이다 — 잘못된 배지보다 없는 배지가 낫다.
 *
 * 기사 피드와 릴스 피드가 같은 값을 쓰므로 fetcher들이 함께 참조한다. 모바일
 * `_constants/api.ts`에 있던 것을 web 이식(KAN-321)에서 승격했다.
 */
export const STAGE_BY_BE_VALUE: Record<string, RumorStage> = {
  RUMOR: "RUMOUR",
  IN_PROGRESS: "IN_PROGRESS",
  /* CONFIRM은 BE 예정 단계 — 아직 enum·DB에 없고 값이 오기 시작하면 그대로 통과한다 (KAN-299) */
  CONFIRM: "CONFIRM",
  OFFICIAL: "OFFICIAL",
};

/** 루머 단계 표시 라벨 */
export const STAGE_META: Record<RumorStage, { label: string }> = {
  RUMOUR: { label: "RUMOUR" },
  IN_PROGRESS: { label: "IN PROGRESS" },
  CONFIRM: { label: "CONFIRM" },
  OFFICIAL: { label: "OFFICIAL" },
};
