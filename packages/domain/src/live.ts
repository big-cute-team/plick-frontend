/**
 * @file 라이브 스코어 도메인 타입·헬퍼 (KAN-446 껍데기 → KAN-452 배선).
 *
 * BE 라이브 스코어 API 6종(`match` 태그, BE `MatchController`)의 응답을 FE가
 * 소비하는 형태다. BE DTO와 필드가 다른 곳은 `@plick/core/live`의 경계 변환이
 * 흡수하고, 화면은 이 타입만 본다. web·mobile이 함께 쓰므로 앱 레이어가 아니라
 * 여기 둔다(ADR 0011 게이트 C).
 */
import type { TeamCode } from "./types";

/** 경기 진행 상태 — BE `MatchStatus` 5값 그대로. */
export type MatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

/**
 * 라이브 화면에 등장하는 팀 참조. `id`·`code`가 null이면 빅6 밖 팀이다 —
 * 마이팀 강조·스쿼드 진입(`/live/teams/[teamId]`)이 불가능하고 크레스트는
 * CDN `logo`, 그것도 실패하면 `shortName` 이니셜 제네릭으로 그린다.
 */
export interface LiveTeam {
  /** BE teams.team_id — 빅6 밖이면 null */
  id: number | null;
  /** 빅6 로컬 크레스트 코드(`TEAMS` 레지스트리 키) — 빅6 밖이면 null */
  code: TeamCode | null;
  /** 영문 팀명 그대로 — 한글 번역은 대회명에만 있다(BE 규약) */
  name: string;
  /** 제네릭 크레스트·타임라인에 넣는 축약 코드 (예: COV, BHA) */
  shortName: string;
  /** API-Football CDN 로고 URL — 빅6는 로컬 에셋을 써서 무시한다 */
  logo: string | null;
}

/** 스코어. 킥오프 전에는 둘 다 null이고 화면은 "-"로 그린다. */
export interface MatchScore {
  home: number | null;
  away: number | null;
}

/** 경기 목록 카드 한 장(GET /matches)이자 상세 헤더(GET /matches/{id}) 공용 형태. */
export interface MatchSummary {
  id: number;
  /** API-Football league id — 목록의 대회 그룹핑 키 */
  competitionId: number;
  /** 대회명 — BE가 한글 사전으로 치환한다(미등재는 영문 폴백) */
  competition: string;
  status: MatchStatus;
  /** API-Football 세부 상태 코드(1H·HT·2H·FT·PEN·TBD 등) — 없으면 null */
  statusDetail: string | null;
  /** 킥오프 시각 ISO 문자열(BE가 KST 오프셋으로 준다) */
  kickoffAt: string;
  /** 라이브 경과 분 — 라이브가 아니면 null */
  elapsed: number | null;
  home: LiveTeam;
  away: LiveTeam;
  score: MatchScore;
}

/** 순위표 한 행(GET /standings). `zone`은 FE가 순위로 판정한다. */
export interface StandingRow {
  rank: number;
  team: LiveTeam;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalDiff: number;
  points: number;
  /** 챔피언스리그 진출권 존 표시 — 해당 없으면 null */
  zone: "UCL" | null;
}

/** 득점 요약 한 줄(GET /matches/{id}의 goals) — 시간순. */
export interface MatchGoal {
  /** "45+2'" 표기 문자열 */
  minute: string;
  playerName: string;
  /** 자책골·페널티 같은 부가 표기 — 일반 골이면 null */
  detail: string | null;
  side: "HOME" | "AWAY";
}

/**
 * 타임라인 이벤트 — 최신이 앞이다. `playerName`은 null일 수 있어(취소된 골
 * 흔적 등) 이름 없는 행도 깨지지 않게 그린다.
 */
export interface MatchEvent {
  /** "45+2'" 같은 표기 문자열 */
  minute: string;
  type: "GOAL" | "SUB" | "CARD" | "RED_CARD" | "VAR";
  playerName: string | null;
  /** 도움·교체 아웃·판정 내용 등 부가 설명 — 없으면 null */
  detail: string | null;
  side: "HOME" | "AWAY";
}

/** 라인업 포지션 그룹 — BE 라인업(G/D/M/F)과 스쿼드(Goalkeeper 등) 표기를 여기로 접는다. */
export type Position = "GK" | "DF" | "MF" | "FW";

/** 선발 선수 한 명. `grid`는 "줄:칸"(GK가 1줄)이고 null이면 벤치다. */
export interface LineupPlayer {
  id: number;
  number: number | null;
  name: string;
  grid: string | null;
  /** 무출전이면 null */
  rating: number | null;
  captain: boolean;
}

/** 벤치 선수 한 명 — 피치 좌표 없이 포지션 라벨로 그린다. */
export interface BenchPlayer {
  id: number;
  number: number | null;
  name: string;
  position: Position;
  rating: number | null;
}

/** 한 팀의 라인업(GET /matches/{id}의 lineups 블록 절반). */
export interface TeamLineup {
  team: LiveTeam;
  formation: string;
  coach: string | null;
  players: LineupPlayer[];
  bench: BenchPlayer[];
}

/** 팀 스탯 비교 한 행. value는 문자열 혼재("61%", "7", "1.04")라 그대로 담는다. */
export interface MatchStat {
  label: string;
  home: string;
  away: string;
}

/** 프리뷰 결장자 한 명. */
export interface Absentee {
  team: LiveTeam;
  playerName: string;
  photo: string | null;
  reason: string;
  kind: "INJURY" | "SUSPENSION";
}

/** 프리뷰 상대전적 한 경기 — result는 이 경기 홈 팀 기준 승·무·패다. */
export interface HeadToHeadGame {
  /** "25.03.10" 표기 */
  date: string;
  /** "LIV 2 - 1 MCI" 표기 */
  line: string;
  result: "W" | "D" | "L";
}

/** 프리뷰 리그 순위 요약 한 팀. */
export interface LeaguePosition {
  team: LiveTeam;
  rank: number;
  points: number;
  goalDiff: number;
  recentForm: ("W" | "D" | "L")[];
}

/**
 * 프리뷰의 직전 경기 선발. 예상 라인업이 아니라 직전 경기의 확정 선발이고,
 * 이 구분을 화면에 문구로 명시하는 게 명세 요구사항이다. 상대가 빅6 밖이면
 * 그 팀 것은 배열에서 빠진다 — 한 팀만 렌더되는 경우를 처리한다.
 */
export interface LastLineup {
  team: LiveTeam;
  formation: string;
  playerNames: string[];
}

/** 킥오프 전 프리뷰 블록(GET /matches/{id}의 preview). */
export interface MatchPreview {
  absentees: Absentee[];
  headToHead: HeadToHeadGame[];
  leaguePositions: LeaguePosition[];
  lastLineups: LastLineup[];
}

/**
 * 경기 상세(GET /matches/{id}). 서버가 조각 실패 시 그 블록만 null로 내리는
 * 구조(BE 블록 단위 폴백)라 블록별 조건부 렌더가 기본이다. 라인업·스탯이
 * 아직 공개 전이면(빈 배열) 경계 변환이 null로 접는다. 스코어 정본은
 * `header.score`다 — 득점 요약과 어긋나면 header를 믿는다.
 */
export interface MatchDetail {
  header: MatchSummary;
  /** 득점 요약(시간순) — BE가 취소 골(선수 null)을 뺀 것 */
  goals: MatchGoal[];
  preview: MatchPreview | null;
  events: MatchEvent[] | null;
  lineups: { home: TeamLineup; away: TeamLineup } | null;
  stats: MatchStat[] | null;
}

/** 스쿼드 선수 한 명(GET /teams/{id}/squad). */
export interface SquadPlayer {
  id: number;
  name: string;
  number: number | null;
  position: Position;
  photo: string | null;
}

/** 팀 스쿼드. 이적 반영이 며칠 늦을 수 있다는 안내를 화면에 함께 그린다. */
export interface TeamSquad {
  team: LiveTeam;
  size: number;
  players: SquadPlayer[];
}

/** 선수 경기 스탯 시트의 스탯 한 칸(GET /matches/{id}/players/{pid}). */
export interface PlayerStatEntry {
  label: string;
  value: string;
}

/**
 * 선수 경기 스탯(라인업에서 선수를 눌렀을 때 시트로 연다). 팀명은 응답에 없어
 * 호출부가 라인업 컨텍스트에서 넘긴다.
 */
export interface PlayerMatchStats {
  playerId: number;
  name: string;
  photo: string | null;
  position: Position;
  number: number | null;
  /** 무출전이면 null */
  minutes: number | null;
  rating: number | null;
  captain: boolean;
  substitute: boolean;
  stats: PlayerStatEntry[];
}

/** 시즌 스탯의 대회별 한 행 — 무출전 대회는 값이 null일 수 있다. */
export interface SeasonCompetitionStats {
  name: string;
  appearances: number | null;
  goals: number | null;
  assists: number | null;
  rating: number | null;
}

/**
 * 선수 시즌 스탯(GET /players/{id}/season-stats). 무출전은 404가 아니라
 * `competitions: []`로 온다 — 빈 상태 지면을 따로 그린다. 이름·포지션은
 * 응답에 없어 시트가 스쿼드 행에서 받는다.
 */
export interface PlayerSeasonStats {
  playerId: number;
  competitions: SeasonCompetitionStats[];
}

/** 서버 컴포넌트가 받아 둔 경기 목록 씨앗 — 시각을 묶는 이유는 기사 피드와 같다. */
export interface InitialMatchList {
  items: MatchSummary[];
  /** 서버가 응답을 받은 시각(epoch ms). 캐시 신선도의 기준점 */
  fetchedAt: number;
}

/** 서버 컴포넌트가 받아 둔 경기 상세 씨앗. */
export interface InitialMatchDetail {
  detail: MatchDetail;
  fetchedAt: number;
}

/** 이번 시즌 표기 — BE `football.season`(2026)의 화면 라벨. 시즌이 바뀌면 같이 올린다. */
export const LIVE_SEASON_LABEL = "2026-27";

/** 챔피언스리그 진출권으로 강조하는 순위 상한(1~4위). */
export const UCL_ZONE_MAX_RANK = 4;

/** 포지션 그룹 라벨 — 스쿼드·벤치·시트가 같은 표기를 쓴다. */
export const POSITION_LABEL: Record<Position, string> = {
  GK: "골키퍼",
  DF: "수비수",
  MF: "미드필더",
  FW: "공격수",
};

/** 스쿼드 화면의 포지션 그룹 나열 순서. */
export const POSITION_ORDER: Position[] = ["GK", "DF", "MF", "FW"];

/**
 * 빅6 밖 EPL 팀의 축약 코드. API-Football 팀명 기준이고 없으면
 * {@link teamShortName}이 이름에서 만든다.
 */
const TEAM_SHORT_NAMES: Record<string, string> = {
  "Aston Villa": "AVL",
  Newcastle: "NEW",
  Brighton: "BHA",
  "Nottingham Forest": "NFO",
  "West Ham": "WHU",
  "Crystal Palace": "CRY",
  Bournemouth: "BOU",
  Fulham: "FUL",
  Brentford: "BRE",
  Everton: "EVE",
  Wolves: "WOL",
  Leeds: "LEE",
  Burnley: "BUR",
  Sunderland: "SUN",
};

/**
 * 팀명 → 축약 코드. 알려진 EPL 팀은 표에서, 그 밖(컵 상대·친선 상대)은 첫
 * 세 글자 이상 단어의 앞 세 글자를 대문자로 쓴다.
 *
 * @example
 * teamShortName("Coventry"); // "COV"
 * teamShortName("Aston Villa"); // "AVL"
 */
export function teamShortName(name: string): string {
  const known = TEAM_SHORT_NAMES[name];
  if (known) return known;
  const word = name.split(/\s+/).find((w) => w.length >= 3) ?? name;
  return word.slice(0, 3).toUpperCase();
}

/**
 * 평점 강조 톤 (디자인 기준 7.5 이상 accent, 미만 warn, null은 무출전 "-").
 *
 * @example
 * ratingTone(8.4); // "accent"
 * ratingTone(6.9); // "warn"
 * ratingTone(null); // null
 */
export function ratingTone(rating: number | null): "accent" | "warn" | null {
  if (rating === null) return null;
  return rating >= 7.5 ? "accent" : "warn";
}

/**
 * 스탯 비교 막대의 홈 비율(0~1). value가 "61%"·"1.04"처럼 문자열 혼재라
 * 숫자만 파싱하고, 파싱 실패나 합계 0이면 null을 돌려 막대만 생략하게 한다
 * (값 텍스트는 그대로 보여준다 — 명세 함정 대응).
 *
 * @example
 * statHomeRatio({ label: "점유율", home: "58%", away: "42%" }); // 0.58
 */
export function statHomeRatio(stat: MatchStat): number | null {
  const home = Number.parseFloat(stat.home);
  const away = Number.parseFloat(stat.away);
  if (Number.isNaN(home) || Number.isNaN(away)) return null;
  const total = home + away;
  if (total <= 0) return null;
  return home / total;
}

/** 경기 카드 상태 표기 톤 — 앱이 토큰 색으로 매핑한다(live=danger, postponed=warn). */
export type MatchStatusTone = "live" | "scheduled" | "finished" | "postponed";

/** 라이브 세부 코드(API-Football status.short) → 두 번째 줄 표기. */
const LIVE_PHASE_LABEL: Record<string, string> = {
  "1H": "전반",
  HT: "하프타임",
  "2H": "후반",
  ET: "연장",
  BT: "휴식",
  P: "승부차기",
  SUSP: "중단",
  INT: "중단",
  LIVE: "진행 중",
};

/**
 * 경기 카드 상태 컬럼의 두 줄 표기. web·mobile 카드가 같은 문구를 쓰므로
 * 여기서 한 번만 정한다. `statusDetail`은 BE가 API-Football 세부 코드를
 * 그대로 주므로(1H·HT·FT·PEN·TBD 등) 코드별로 접는다.
 *
 * @example
 * matchStatusLabel(live); // { primary: "67'", secondary: "후반", tone: "live" }
 */
export function matchStatusLabel(match: MatchSummary): {
  primary: string;
  secondary: string;
  tone: MatchStatusTone;
} {
  const code = match.statusDetail;
  switch (match.status) {
    case "LIVE":
      return {
        primary:
          code === "HT" || code === "BT"
            ? code
            : code === "P"
              ? "PEN"
              : `${match.elapsed ?? 0}'`,
        secondary: (code && LIVE_PHASE_LABEL[code]) ?? "진행 중",
        tone: "live",
      };
    case "SCHEDULED":
      return {
        primary: code === "TBD" ? "미정" : kickoffTimeLabel(match.kickoffAt),
        secondary: "예정",
        tone: "scheduled",
      };
    case "FINISHED":
      return { primary: code ?? "FT", secondary: "종료", tone: "finished" };
    case "POSTPONED":
      return { primary: "연기", secondary: "추후 공지", tone: "postponed" };
    case "CANCELLED":
      return { primary: "취소", secondary: "취소된 경기", tone: "postponed" };
  }
}

/** "YYYY-MM-DD" 형식이면서 실제로 있는 날짜인지 — `?date=` 쿼리 검증. */
export function isDateKey(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateKey(value);
  return (
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10))
  );
}

/**
 * KST 기준 오늘의 날짜 키. 기기·서버 타임존에 기대지 않고 Intl로 고정한다
 * (BE도 `date`를 KST로 해석한다).
 *
 * @example
 * todayDateKeyKst(); // "2026-09-07"
 */
export function todayDateKeyKst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * 날짜 키 → 스트립 표기 조각. 요일은 한 글자다.
 *
 * @example
 * dateKeyParts("2026-09-05"); // { weekday: "토", day: 5 }
 */
export function dateKeyParts(dateKey: string): {
  weekday: string;
  day: number;
} {
  const date = parseDateKey(dateKey);
  const weekday =
    ["일", "월", "화", "수", "목", "금", "토"][date.getDay()] ?? "";
  return { weekday, day: date.getDate() };
}

/** 날짜 키의 연·월 조각. 날짜 스트립의 월 단위 렌더 기준이다. */
export function dateKeyYearMonth(dateKey: string): {
  year: number;
  month: number;
} {
  return {
    year: Number(dateKey.slice(0, 4)),
    month: Number(dateKey.slice(5, 7)),
  };
}

/**
 * 해당 연·월의 날짜 키 전부(1일~말일). 날짜 스트립이 월 전체를 슬라이드로
 * 담을 때 쓴다.
 *
 * @example
 * monthDateKeys(2026, 9); // ["2026-09-01", …, "2026-09-30"]
 */
export function monthDateKeys(year: number, month: number): string[] {
  const last = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return Array.from(
    { length: last },
    (_, i) => `${year}-${mm}-${String(i + 1).padStart(2, "0")}`,
  );
}

/** 연·월 표기 (예: "2026년 9월") — 날짜 스트립 위 셀렉터 버튼 라벨. */
export function monthLabel(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

/** "YYYY-MM-DD"를 로컬 자정 Date로 파싱한다(타임존 밀림 방지). */
function parseDateKey(dateKey: string): Date {
  const y = Number(dateKey.slice(0, 4));
  const m = Number(dateKey.slice(5, 7));
  const d = Number(dateKey.slice(8, 10));
  return new Date(y, m - 1, d);
}

/**
 * 킥오프 ISO 문자열 → "23:00" 시각 표기. 기기 타임존과 무관하게 KST로 고정한다.
 *
 * @example
 * kickoffTimeLabel("2026-09-05T23:00:00+09:00"); // "23:00"
 */
export function kickoffTimeLabel(kickoffAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(kickoffAt));
}

/**
 * 킥오프 ISO 문자열 → "9월 5일 (금)" 표기(KST). 상세 헤더의 예정 경기 날짜다.
 *
 * @example
 * kickoffDateLabel("2026-09-05T23:00:00+09:00"); // "9월 5일 (금)"
 */
export function kickoffDateLabel(kickoffAt: string): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(new Date(kickoffAt));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}월 ${get("day")}일 (${get("weekday")})`;
}

/**
 * 이벤트 분 표기 — 추가시간은 "90+6'"처럼 붙인다. 분이 없으면 빈 문자열.
 *
 * @example
 * eventMinuteLabel(45, 2); // "45+2'"
 */
export function eventMinuteLabel(
  minute: number | null,
  extraMinute: number | null,
): string {
  if (minute === null) return "";
  return `${minute}${extraMinute ? `+${extraMinute}` : ""}'`;
}

/** 목록에 라이브 경기가 하나라도 있는지 — 조건부 폴링의 판정. */
export function hasLiveMatch(matches: MatchSummary[] | undefined): boolean {
  return matches?.some((match) => match.status === "LIVE") ?? false;
}
