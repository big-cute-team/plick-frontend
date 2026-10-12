/**
 * @file 팀 프로필 도메인 타입·헬퍼 (KAN-599).
 *
 * BE 팀 프로필 API 넷(`GET /teams/{id}/summary`, `/fixtures`, `/season-stats`,
 * `/squad`)의 응답을 화면이 쓰는 형태다. BE DTO와 다른 곳은 `@plick/core/team-profile`의
 * 경계 변환이 흡수한다. 모바일 팀 프로필도 같은 응답을 쓰게 되므로 앱이 아니라
 * 여기 둔다(ADR 0011 게이트 C, 라이브 스코어와 같은 판단).
 *
 * 값이 없으면 null이고 화면은 0이 아니라 "-"로 그린다(핸드오프 API_MAPPING "빈 값 처리").
 */
import type {
  LiveTeam,
  MatchScore,
  MatchStatus,
  Position,
  StandingRow,
} from "./live";

/** 프리미어리그 API-Football league id. 대회 선택의 기본값이다(KAN-597이 바꿀 수 있다). */
export const PREMIER_LEAGUE_ID = 39;

/** 경기 결과(이 팀 기준). */
export type MatchResult = "W" | "D" | "L";

/** 결과 칸 글자. */
export const RESULT_LABEL: Record<MatchResult, string> = {
  W: "승",
  D: "무",
  L: "패",
};

/** 요약의 다음 경기. 상대는 빅6 밖이면 `id`, `code`가 null이다. */
export interface TeamNextFixture {
  matchId: number;
  kickoffAt: string;
  isHome: boolean;
  opponent: LiveTeam;
}

/** 요약의 숫자 띠 값(EPL 순위표의 이 팀 행). 득점과 실점은 옛 캐시면 null이다. */
export interface TeamStanding {
  rank: number;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDiff: number;
  /** 최근 경기 결과, 오른쪽이 최근이고 최대 5개 */
  form: MatchResult[];
}

/** 구단 정보. 값마다 null일 수 있다. */
export interface TeamInfo {
  coachName: string | null;
  stadium: string | null;
  capacity: number | null;
  city: string | null;
  founded: number | null;
}

/** 다음 경기 기준 결장자. `playerId`가 null이면 선수 프로필로 링크하지 않는다. */
export interface TeamInjury {
  playerId: number | null;
  name: string;
  photo: string | null;
  /** 결장 사유 원문(예: Hamstring Injury). 없으면 null */
  reason: string | null;
}

/** 팀 요약(`GET /teams/{id}/summary`). `info`, `nextFixture`, `standing`은 실패하면 null이다. */
export interface TeamSummary {
  teamId: number;
  name: string;
  nameEn: string;
  leagueName: string;
  info: TeamInfo | null;
  nextFixture: TeamNextFixture | null;
  standing: TeamStanding | null;
  injuries: TeamInjury[];
}

/** 팀 경기 한 줄(`GET /teams/{id}/fixtures`). */
export interface TeamFixture {
  matchId: number;
  competitionId: number;
  competition: string;
  /** `league.round` 원문(Regular Season - 7). 화면 문구는 {@link roundLabel} */
  round: string | null;
  kickoffAt: string;
  status: MatchStatus;
  home: LiveTeam;
  away: LiveTeam;
  score: MatchScore;
  isHome: boolean;
  /** 종료 경기만 값이 있다 */
  result: MatchResult | null;
}

/** 팀 시즌 경기. `upcoming`은 킥오프 오름차순, `results`는 내림차순이다. */
export interface TeamFixtures {
  upcoming: TeamFixture[];
  results: TeamFixture[];
}

/** 홈, 원정, 전체 성적 한 줄. */
export interface TeamRecord {
  played: number | null;
  win: number | null;
  draw: number | null;
  lose: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
}

/** 15분 구간 득실. 91분 이후는 서버가 76-90에 합쳐 준다. */
export interface MinuteBucket {
  /** "0-15" ... "76-90" */
  bucket: string;
  scored: number;
  conceded: number;
}

/** 대회 하나의 팀 시즌 기록(`GET /teams/{id}/season-stats`의 배열 한 칸). */
export interface TeamCompetitionStats {
  competitionId: number;
  competition: string;
  home: TeamRecord;
  away: TeamRecord;
  total: TeamRecord;
  goalsByMinute: MinuteBucket[];
  /** 원본 문자열 그대로("1.8") */
  goalsForPerMatch: string | null;
  goalsAgainstPerMatch: string | null;
  cleanSheets: number | null;
  failedToScore: number | null;
  longestWinStreak: number | null;
  mainFormation: string | null;
  yellowCards: number | null;
  redCards: number | null;
}

/** 선수 한 명의 대회별 기록. */
export interface SquadCompetitionStats {
  competitionId: number;
  appearances: number | null;
  goals: number | null;
  assists: number | null;
  rating: number | null;
}

/** 선수단 표의 선수 한 명(`GET /teams/{id}/squad` 확장 필드 포함). */
export interface TeamSquadMember {
  playerId: number;
  /** 사전 한글, 미등재는 영문 */
  name: string;
  number: number | null;
  /** GK, DF, MF, FW. 서버가 모르는 포지션이면 null */
  position: Position | null;
  photo: string | null;
  age: number | null;
  nationality: string | null;
  injured: boolean;
  competitions: SquadCompetitionStats[];
}

/** 대회 선택지 하나. */
export interface CompetitionOption {
  id: number;
  name: string;
}

/** 팀 내 순위 한 줄. */
export interface TeamLeader {
  playerId: number;
  name: string;
  value: number;
}

/** 선수단 표의 포지션 묶음. `position`이 null이면 포지션 미상 묶음이다. */
export interface SquadGroup {
  position: Position | null;
  players: TeamSquadMember[];
}

/**
 * 빅6 연고지와 홈구장의 한글 표기. BE는 API-Football 영문 원본을 준다. 여기 없는 값은
 * 원문을 그대로 쓴다.
 */
const PLACE_KO: Record<string, string> = {
  London: "런던",
  Manchester: "맨체스터",
  Liverpool: "리버풀",
  "Emirates Stadium": "에미레이츠 스타디움",
  "Stamford Bridge": "스탬퍼드 브리지",
  Anfield: "안필드",
  "Etihad Stadium": "에티하드 스타디움",
  "Old Trafford": "올드 트래퍼드",
  "Tottenham Hotspur Stadium": "토트넘 홋스퍼 스타디움",
};

/**
 * 연고지, 구장명 영문 원본 → 한글 표기. 사전에 없으면 원문이다.
 *
 * @example
 * placeLabel("London"); // "런던"
 * placeLabel("Villa Park"); // "Villa Park"
 */
export function placeLabel(name: string): string {
  return PLACE_KO[name] ?? name;
}

/**
 * `league.round` 원문 → 결과 칸 옆 라운드 문구. 모르는 형식이나 null은 null이라
 * 화면이 칸을 비운다.
 *
 * @example
 * roundLabel("Regular Season - 7"); // "7R"
 * roundLabel("Round of 16"); // "16강"
 * roundLabel("Semi-finals"); // "4강"
 */
export function roundLabel(round: string | null): string | null {
  if (!round) return null;
  const trailing = /-\s*(\d+)$/.exec(round);
  if (trailing) return `${trailing[1]}R`;
  const ordinal = /^(\d+)(?:st|nd|rd|th) Round/i.exec(round);
  if (ordinal) return `${ordinal[1]}R`;
  const roundOf = /^Round of (\d+)/i.exec(round);
  if (roundOf) return `${roundOf[1]}강`;
  if (/^quarter-?finals?/i.test(round)) return "8강";
  if (/^semi-?finals?/i.test(round)) return "4강";
  if (/^final$/i.test(round)) return "결승";
  return null;
}

/**
 * 킥오프 ISO 문자열 → "8월 15일"(KST). 지난 경기 날짜다. 예정 경기는 요일과 시각을
 * 붙이는 `kickoffDateLabel`, `kickoffTimeLabel`을 쓴다.
 *
 * @example
 * playedDateLabel("2026-08-15T23:00:00+09:00"); // "8월 15일"
 */
export function playedDateLabel(kickoffAt: string): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(kickoffAt));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}월 ${get("day")}일`;
}

/**
 * 킥오프 ISO 문자열 → "10.3"(KST). 모바일 선수 경기 행처럼 날짜 칸이 좁은 자리에 쓴다 (KAN-604).
 *
 * @example
 * dotDateLabel("2026-10-03T23:00:00+09:00"); // "10.3"
 */
export function dotDateLabel(kickoffAt: string): string {
  return playedDateLabel(kickoffAt).replace(/^(\d+)월 (\d+)일$/, "$1.$2");
}

/** 이 팀 기준 상대. */
export function fixtureOpponent(fixture: TeamFixture): LiveTeam {
  return fixture.isHome ? fixture.away : fixture.home;
}

/**
 * 이 팀 기준 스코어 "득-실". 스코어가 없으면 null이다.
 *
 * @example
 * teamScoreLabel({ isHome: false, score: { home: 1, away: 3 } }); // "3-1"
 */
export function teamScoreLabel(
  fixture: Pick<TeamFixture, "isHome" | "score">,
): string | null {
  const { home, away } = fixture.score;
  if (home === null || away === null) return null;
  return fixture.isHome ? `${home}-${away}` : `${away}-${home}`;
}

/**
 * 득실차 표기. 양수는 "+"를 붙인다.
 *
 * @example
 * goalDiffLabel(4); // "+4"
 * goalDiffLabel(-2); // "-2"
 */
export function goalDiffLabel(diff: number): string {
  return diff > 0 ? `+${diff}` : String(diff);
}

/**
 * 프로필 평점 색 단계(시안 "평점 색"): 7.5 이상 강조, 6.8 이상 본문 보조, 그 아래와 없음은 흐린 회색.
 *
 * @example
 * profileRatingTone(7.6); // "accent"
 * profileRatingTone(7.0); // "normal"
 * profileRatingTone(null); // "muted"
 */
export function profileRatingTone(
  rating: number | null,
): "accent" | "normal" | "muted" {
  if (rating === null) return "muted";
  if (rating >= 7.5) return "accent";
  if (rating >= 6.8) return "normal";
  return "muted";
}

/**
 * 순위표에서 이 팀 앞뒤로 `size`행을 자른다. 이 팀을 가운데 두되 맨 위나 아래면 한쪽으로
 * 치우쳐 `size`행을 채운다. 이 팀 행이 없으면 빈 배열이다.
 *
 * @example
 * standingsWindow(rows20, 1); // 1위 팀이면 1~5위
 * standingsWindow(rows20, 6); // 8위 팀이면 6~10위
 */
export function standingsWindow(
  rows: StandingRow[],
  teamId: number,
  size = 5,
): StandingRow[] {
  const index = rows.findIndex((row) => row.team.id === teamId);
  if (index < 0) return [];
  const start = Math.max(
    0,
    Math.min(rows.length - size, index - Math.floor(size / 2)),
  );
  return rows.slice(start, start + size);
}

/**
 * 대회 선택지. 팀 기록의 대회 순서(EPL 먼저)를 따르고, 선수단에만 있는 대회는 뒤에 붙인다.
 * 선수단 쪽 대회명은 응답에 있지만 기록 쪽이 정본이라 이름은 기록 쪽을 먼저 쓴다.
 */
export function competitionOptions(
  stats: TeamCompetitionStats[],
  squadNames: CompetitionOption[],
): CompetitionOption[] {
  const options = stats.map((c) => ({
    id: c.competitionId,
    name: c.competition,
  }));
  for (const option of squadNames) {
    if (!options.some((o) => o.id === option.id)) options.push(option);
  }
  return options;
}

/**
 * 선택한 대회의 선수 기록. 그 대회 항목이 없으면 null이라 화면이 "-"로 그린다.
 */
export function memberStats(
  member: TeamSquadMember,
  competitionId: number,
): SquadCompetitionStats | null {
  return (
    member.competitions.find((c) => c.competitionId === competitionId) ?? null
  );
}

/**
 * 팀 내 순위. 선택한 대회의 골이나 도움으로 내림차순 정렬해 상위 `limit`명을 고른다. 0이나
 * 기록 없음은 뺀다. 같으면 서버 순서(번호순)를 지킨다.
 *
 * @example
 * teamLeaders(players, 39, "goals"); // [{ playerId, name, value: 4 }, ...]
 */
export function teamLeaders(
  players: TeamSquadMember[],
  competitionId: number,
  key: "goals" | "assists",
  limit = 3,
): TeamLeader[] {
  return players
    .map((member) => ({
      playerId: member.playerId,
      name: member.name,
      value: memberStats(member, competitionId)?.[key] ?? 0,
    }))
    .filter((leader) => leader.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

const POSITION_GROUP_ORDER: (Position | null)[] = [
  "GK",
  "DF",
  "MF",
  "FW",
  null,
];

/**
 * 선수단을 포지션별(골키퍼, 수비수, 미드필더, 공격수) 묶음으로 나눈다. 포지션이 null인
 * 선수는 마지막 묶음이다. 묶음 안은 등번호 오름차순이고 번호 없는 선수는 뒤로 간다.
 * 빈 묶음은 뺀다.
 */
export function groupSquadByPosition(players: TeamSquadMember[]): SquadGroup[] {
  const byNumber = (a: TeamSquadMember, b: TeamSquadMember) =>
    (a.number ?? Number.MAX_SAFE_INTEGER) -
    (b.number ?? Number.MAX_SAFE_INTEGER);
  return POSITION_GROUP_ORDER.map((position) => ({
    position,
    players: players.filter((p) => p.position === position).sort(byNumber),
  })).filter((group) => group.players.length > 0);
}
