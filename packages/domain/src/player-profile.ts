/**
 * @file 선수 프로필 도메인 타입·헬퍼 (KAN-600).
 *
 * BE 선수 프로필 API 셋(`GET /players/{id}`, `/matches`, `/seasons`)의 응답을 화면이 쓰는
 * 형태다. BE DTO와 다른 곳은 `@plick/core/player-profile`의 경계 변환이 흡수한다. 모바일
 * 선수 프로필도 같은 응답을 쓰므로 앱이 아니라 여기 둔다(ADR 0011 게이트 C).
 *
 * 값이 없으면 null이고 화면은 0이 아니라 "-"로 그린다(핸드오프 API_MAPPING "빈 값 처리").
 */
import type { LiveTeam, MatchScore, Position } from "./live";
import type { MatchResult, TeamSquadMember } from "./team-profile";

/** 경기 출전 형태. UNKNOWN은 그 경기 기록 조회 실패다. */
export type Participation = "STARTED" | "SUB" | "ABSENT" | "UNKNOWN";

/** 팀 내 평점 순위. `of`는 평점이 있는 팀 선수 수다. */
export interface RatingRank {
  rank: number;
  of: number;
}

/** 대회 하나의 선수 시즌 기록. 원본 숫자는 전부 null일 수 있다. */
export interface PlayerCompetitionStats {
  competitionId: number;
  competition: string;
  team: LiveTeam | null;
  appearances: number | null;
  lineups: number | null;
  minutes: number | null;
  rating: number | null;
  subIn: number | null;
  shots: number | null;
  shotsOn: number | null;
  goals: number | null;
  assists: number | null;
  conceded: number | null;
  saves: number | null;
  passes: number | null;
  keyPasses: number | null;
  /** 원본 문자열("78") */
  passAccuracy: string | null;
  tackles: number | null;
  blocks: number | null;
  interceptions: number | null;
  duels: number | null;
  duelsWon: number | null;
  dribbles: number | null;
  dribblesWon: number | null;
  foulsCommitted: number | null;
  foulsDrawn: number | null;
  yellowCards: number | null;
  /** 퇴장(직접 퇴장 + 경고 누적 퇴장) */
  redCards: number | null;
  penaltyScored: number | null;
  penaltyMissed: number | null;
  penaltySaved: number | null;
  /** 소속팀 항목에만 있다 */
  ratingRank: RatingRank | null;
}

/** 선수 프로필(`GET /players/{id}`). */
export interface PlayerProfile {
  playerId: number;
  name: string;
  nameEn: string | null;
  photo: string | null;
  number: number | null;
  position: Position | null;
  positionName: string | null;
  /** "1992-07-08" */
  birthDate: string | null;
  age: number | null;
  nationality: string | null;
  heightCm: number | null;
  weightKg: number | null;
  injured: boolean;
  injuryReason: string | null;
  /** EPL 우선으로 정한 소속팀. 경기와 레일은 이 팀 기준이다 */
  team: LiveTeam | null;
  /** 연결된 인물. 관련 이슈 조회 키이고 미연결이면 null */
  figureId: number | null;
  competitions: PlayerCompetitionStats[];
}

/** 선수 경기 한 줄(`GET /players/{id}/matches`). ABSENT나 UNKNOWN이면 숫자가 null이다. */
export interface PlayerMatch {
  matchId: number;
  competitionId: number;
  competition: string;
  round: string | null;
  kickoffAt: string;
  isHome: boolean;
  opponent: LiveTeam;
  /** 원본 홈 기준 스코어 */
  score: MatchScore;
  result: MatchResult | null;
  participation: Participation;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  shots: number | null;
  passes: number | null;
  rating: number | null;
  /** 선발이고 팀 무실점. ABSENT나 UNKNOWN이면 null */
  cleanSheet: boolean | null;
}

/** 시즌별 기록 한 줄(시즌 x 대회). */
export interface PlayerSeasonLine {
  season: string;
  competitionId: number;
  competition: string;
  team: LiveTeam | null;
  appearances: number | null;
  goals: number | null;
  assists: number | null;
  rating: number | null;
}

/** 기록 탭의 한 행. `per90`이 null이면 그 칸을 비운다(비율 행 등). */
export interface StatRow {
  label: string;
  total: string;
  per90: string | null;
}

/** 기록 탭의 묶음 하나(공격, 패스 등). */
export interface StatGroup {
  label: string;
  rows: StatRow[];
}

/** 시즌 출전 수. UNKNOWN 경기는 세지 않는다. */
export interface UsageCounts {
  started: number;
  sub: number;
  absent: number;
}

/**
 * 90분당 수치. 합계 / 출전 분 x 90을 소수 첫째 자리로. 합계나 출전 분이 없거나 0분이면 "-".
 *
 * @example
 * per90(4, 520); // "0.7"
 * per90(4, 0); // "-"
 */
export function per90(total: number | null, minutes: number | null): string {
  if (total === null || !minutes) return "-";
  return ((total / minutes) * 90).toFixed(1);
}

/**
 * 출전했는데 기록이 없는 골, 도움은 0이다(빈 값 처리 예외). 출전이 없거나 모르면 null 그대로.
 * 숫자 띠와 기록 탭이 같은 값을 보이게 둘 다 이 함수를 쓴다.
 *
 * @example
 * zeroIfPlayed(null, 6); // 0
 * zeroIfPlayed(null, 0); // null
 */
export function zeroIfPlayed(
  value: number | null,
  appearances: number | null,
): number | null {
  return value === null && appearances ? 0 : value;
}

/** 숫자 표기. null은 "-". */
function num(value: number | null): string {
  return value === null ? "-" : String(value);
}

/**
 * 기록 탭 묶음. 골키퍼는 골키핑, 패스, 파울이고 나머지는 공격, 패스, 드리블과 경합, 수비,
 * 파울이다. 각 행은 합계와 90분당이고 비율과 클린시트 행은 90분당을 비운다.
 *
 * @param stats 선택된 대회 기록
 * @param isKeeper 골키퍼 구성 여부(`positionCode`가 GK)
 * @param cleanSheets 선택 대회의 클린시트(경기 기록에서 센 값). 모르면 null
 */
export function playerStatGroups(
  stats: PlayerCompetitionStats,
  isKeeper: boolean,
  cleanSheets: number | null,
): StatGroup[] {
  const m = stats.minutes;
  const row = (label: string, value: number | null): StatRow => ({
    label,
    total: num(value),
    per90: per90(value, m),
  });
  const ratio = (label: string, value: string | null): StatRow => ({
    label,
    total: value === null ? "-" : `${value}%`,
    per90: null,
  });
  const goals = zeroIfPlayed(stats.goals, stats.appearances);
  const assists = zeroIfPlayed(stats.assists, stats.appearances);
  const discipline: StatGroup = {
    label: "파울",
    rows: [
      row("파울", stats.foulsCommitted),
      row("피파울", stats.foulsDrawn),
      row("경고", stats.yellowCards),
      row("퇴장", stats.redCards),
    ],
  };

  if (isKeeper) {
    return [
      {
        label: "골키핑",
        rows: [
          row("선방", stats.saves),
          row("실점", stats.conceded),
          { label: "클린시트", total: num(cleanSheets), per90: null },
          row("페널티 선방", stats.penaltySaved),
        ],
      },
      {
        label: "패스",
        rows: [
          row("패스", stats.passes),
          ratio("패스 성공률", stats.passAccuracy),
        ],
      },
      discipline,
    ];
  }
  return [
    {
      label: "공격",
      rows: [
        row("골", goals),
        row("도움", assists),
        row("슈팅", stats.shots),
        row("유효 슈팅", stats.shotsOn),
        row("페널티 골", stats.penaltyScored),
        row("페널티 실축", stats.penaltyMissed),
      ],
    },
    {
      label: "패스",
      rows: [
        row("패스", stats.passes),
        row("키패스", stats.keyPasses),
        ratio("패스 성공률", stats.passAccuracy),
      ],
    },
    {
      label: "드리블, 경합",
      rows: [
        row("드리블 시도", stats.dribbles),
        row("드리블 성공", stats.dribblesWon),
        row("경합", stats.duels),
        row("경합 승리", stats.duelsWon),
      ],
    },
    {
      label: "수비",
      rows: [
        row("태클", stats.tackles),
        row("블록", stats.blocks),
        row("인터셉트", stats.interceptions),
      ],
    },
    discipline,
  ];
}

/**
 * 선택 대회의 클린시트. 경기 기록에서 그 대회의 `cleanSheet`가 true인 경기를 센다. 경기 응답의
 * `cleanSheets`는 전 대회 합계라 대회 선택과 맞지 않아서다. 경기 기록이 없으면 null.
 */
export function cleanSheetsIn(
  matches: PlayerMatch[] | null,
  competitionId: number,
): number | null {
  if (matches === null) return null;
  return matches.filter(
    (m) => m.competitionId === competitionId && m.cleanSheet === true,
  ).length;
}

/**
 * 시즌 출전 막대 수치. STARTED, SUB, ABSENT를 세고 UNKNOWN은 뺀다.
 */
export function usageCounts(matches: PlayerMatch[]): UsageCounts {
  const count = (p: Participation) =>
    matches.filter((m) => m.participation === p).length;
  return {
    started: count("STARTED"),
    sub: count("SUB"),
    absent: count("ABSENT"),
  };
}

/**
 * 이 선수 기준 결과와 스코어 "승 2-1". 결과나 스코어가 없으면 null.
 *
 * @example
 * matchResultLabel({ isHome: false, result: "W", score: { home: 1, away: 3 } }); // "승 3-1"
 */
export function matchResultLabel(
  match: Pick<PlayerMatch, "isHome" | "result" | "score">,
): string | null {
  const { home, away } = match.score;
  if (match.result === null || home === null || away === null) return null;
  const label = { W: "승", D: "무", L: "패" }[match.result];
  return match.isHome ? `${label} ${home}-${away}` : `${label} ${away}-${home}`;
}

/**
 * 모바일 경기 행 아래 줄 "73', 1골, 슈팅 1, 패스 21" (KAN-604). 골과 도움은 있을 때만, 슈팅과
 * 패스는 값이 있으면 0이어도 쓴다. 결장은 "결장", 기록 조회 실패(UNKNOWN)는 "-"다.
 *
 * @example
 * matchStatLine({ participation: "SUB", minutes: 20, goals: 1, assists: 0, shots: 2, passes: 8 });
 * // "20', 1골, 슈팅 2, 패스 8"
 * matchStatLine({ participation: "ABSENT", ... }); // "결장"
 */
export function matchStatLine(
  match: Pick<
    PlayerMatch,
    "participation" | "minutes" | "goals" | "assists" | "shots" | "passes"
  >,
): string {
  if (match.participation === "ABSENT") return "결장";
  if (match.participation === "UNKNOWN") return "-";
  const parts = [
    match.minutes !== null ? `${match.minutes}'` : null,
    match.goals ? `${match.goals}골` : null,
    match.assists ? `${match.assists}도움` : null,
    match.shots !== null ? `슈팅 ${match.shots}` : null,
    match.passes !== null ? `패스 ${match.passes}` : null,
  ];
  return parts.filter(Boolean).join(", ") || "-";
}

/**
 * 생년월일과 나이 "1992.07.08 (34세)". 둘 중 있는 것만 쓰고 둘 다 없으면 null.
 *
 * @example
 * birthLabel("1992-07-08", 34); // "1992.07.08 (34세)"
 * birthLabel(null, 34); // "34세"
 */
export function birthLabel(
  birthDate: string | null,
  age: number | null,
): string | null {
  const date = birthDate?.replaceAll("-", ".") ?? null;
  if (date && age !== null) return `${date} (${age}세)`;
  return date ?? (age !== null ? `${age}세` : null);
}

const POSITION_RANK: Record<Position, number> = { GK: 0, DF: 1, MF: 2, FW: 3 };

/**
 * 레일 "같은 팀 선수". 본인을 빼고 포지션 순(GK, DF, MF, FW, 미상), 번호 순으로 `limit`명.
 */
export function teammates(
  players: TeamSquadMember[],
  selfId: number,
  limit = 8,
): TeamSquadMember[] {
  const rank = (p: TeamSquadMember) =>
    p.position === null ? 4 : POSITION_RANK[p.position];
  return players
    .filter((p) => p.playerId !== selfId)
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.number ?? Number.MAX_SAFE_INTEGER) -
          (b.number ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, limit);
}
