/**
 * @file 라이브 스코어 도메인 타입·헬퍼 (KAN-446).
 *
 * BE 라이브 스코어 API 6종([API 명세] 라이브 스코어, ADR 0126)의 응답을 FE가
 * 소비하는 목표 형태다. 껍데기 단계에서 web·mobile이 동시에 소비하므로 앱
 * 레이어가 아니라 여기 둔다(ADR 0011 게이트 — 사용처 2곳). 실제 배선 세션에서
 * BE 응답과 대조해 조정한다.
 */
import type { TeamCode } from "./types";

/** 경기 진행 상태. POSTPONED·CANCELLED는 목록 카드에서 연기·취소 칩으로 그린다. */
export type MatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

/**
 * 라이브 화면에 등장하는 팀 참조. `id`·`code`가 null이면 빅6 밖 팀이다 —
 * 마이팀 강조·스쿼드 진입(`/live/teams/[teamId]`)이 불가능하고 크레스트는
 * `shortName` 이니셜 제네릭으로 그린다.
 */
export interface LiveTeam {
  /** BE teams.team_id — 빅6 밖이면 null */
  id: number | null;
  /** 빅6 로컬 크레스트 코드(`TEAMS` 레지스트리 키) — 빅6 밖이면 null */
  code: TeamCode | null;
  /** 영문 팀명 그대로 — 한글 번역은 대회명에만 있다(명세 규약) */
  name: string;
  /** 제네릭 크레스트에 넣는 축약 코드 (예: COV, BHA) */
  shortName: string;
}

/** 스코어. 킥오프 전에는 둘 다 null이고 화면은 "-"로 그린다. */
export interface MatchScore {
  home: number | null;
  away: number | null;
}

/** 경기 목록 카드 한 장(GET /matches)이자 상세 헤더(GET /matches/{id}) 공용 형태. */
export interface MatchSummary {
  id: number;
  /** 대회명 — 명세상 유일한 한글 필드 */
  competition: string;
  /** 라운드 표기 (예: "4R") */
  round: string;
  status: MatchStatus;
  /** HT(하프타임)·PEN 같은 세부 상태 — 없으면 null */
  statusDetail: string | null;
  /** 킥오프 시각 ISO 문자열(KST 기준 표기용) */
  kickoffAt: string;
  /** 라이브 경과 분 — 라이브가 아니면 null */
  elapsed: number | null;
  home: LiveTeam;
  away: LiveTeam;
  score: MatchScore;
}

/** 순위표 한 행(GET /standings). */
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

/** 타임라인 이벤트. `playerName`은 null일 수 있어 이름 없는 행도 깨지지 않게 그린다. */
export interface MatchEvent {
  /** "45+2'" 같은 표기 문자열 그대로 */
  minute: string;
  type: "GOAL" | "SUB" | "CARD" | "VAR";
  playerName: string | null;
  /** 도움·사유·판정 내용 등 부가 설명 — 없으면 null */
  detail: string | null;
  side: "HOME" | "AWAY";
}

/** 선발 선수 한 명. `grid`는 "줄:칸"(GK가 1줄)이고 null이면 벤치다. */
export interface LineupPlayer {
  id: number;
  number: number;
  name: string;
  grid: string | null;
  /** 무출전이면 null */
  rating: number | null;
}

/** 벤치 선수 한 명 — 피치 좌표 없이 포지션 라벨로 그린다. */
export interface BenchPlayer {
  id: number;
  number: number;
  name: string;
  position: string;
  rating: number | null;
}

/** 한 팀의 라인업(GET /matches/{id}의 lineups 블록 절반). */
export interface TeamLineup {
  team: LiveTeam;
  formation: string;
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
  reason: string;
  kind: "INJURY" | "SUSPENSION";
}

/** 프리뷰 상대전적 한 경기 — result는 이 경기 홈 팀 기준 승·무·패다. */
export interface HeadToHeadGame {
  date: string;
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
 * 구조(Redis 캐시 설계)라 블록별 조건부 렌더가 기본이다. 스코어 정본은
 * `header.score`다 — 이벤트 요약과 어긋나면 header를 믿는다.
 */
export interface MatchDetail {
  header: MatchSummary;
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
  position: "GK" | "DF" | "MF" | "FW";
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

/** 선수 경기 스탯(라인업에서 선수를 눌렀을 때 시트로 연다). */
export interface PlayerMatchStats {
  playerId: number;
  name: string;
  teamName: string;
  position: string;
  number: number;
  minutes: number;
  rating: number | null;
  stats: PlayerStatEntry[];
}

/** 시즌 스탯의 대회별 한 행. */
export interface SeasonCompetitionStats {
  name: string;
  appearances: number;
  goals: number;
  assists: number;
  rating: number;
}

/**
 * 선수 시즌 스탯(GET /players/{id}/season-stats). 무출전은 404가 아니라
 * `competitions: []`로 온다 — 빈 상태 지면을 따로 그린다.
 */
export interface PlayerSeasonStats {
  playerId: number;
  name: string;
  teamName: string;
  position: string;
  season: string;
  competitions: SeasonCompetitionStats[];
}

/** 포지션 그룹 라벨 — 스쿼드·벤치 화면이 같은 표기를 쓴다. */
export const POSITION_LABEL: Record<SquadPlayer["position"], string> = {
  GK: "골키퍼",
  DF: "수비수",
  MF: "미드필더",
  FW: "공격수",
};

/** 스쿼드 화면의 포지션 그룹 나열 순서. */
export const POSITION_ORDER: SquadPlayer["position"][] = [
  "GK",
  "DF",
  "MF",
  "FW",
];

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

/**
 * 경기 카드 상태 컬럼의 두 줄 표기. web·mobile 카드가 같은 문구를 쓰므로
 * 여기서 한 번만 정한다. HT·PEN 같은 `statusDetail`이 있으면 그걸 우선한다.
 *
 * @example
 * matchStatusLabel(live); // { primary: "67'", secondary: "후반", tone: "live" }
 */
export function matchStatusLabel(match: MatchSummary): {
  primary: string;
  secondary: string;
  tone: MatchStatusTone;
} {
  switch (match.status) {
    case "LIVE":
      return {
        primary: match.statusDetail ?? `${match.elapsed ?? 0}'`,
        secondary: (match.elapsed ?? 0) > 45 ? "후반" : "전반",
        tone: "live",
      };
    case "SCHEDULED":
      return {
        primary: kickoffTimeLabel(match.kickoffAt),
        secondary: "예정",
        tone: "scheduled",
      };
    case "FINISHED":
      return {
        primary: match.statusDetail ?? "FT",
        secondary: "종료",
        tone: "finished",
      };
    case "POSTPONED":
      return { primary: "연기", secondary: "추후 공지", tone: "postponed" };
    case "CANCELLED":
      return { primary: "취소", secondary: "취소된 경기", tone: "postponed" };
  }
}

/**
 * "YYYY-MM-DD" 날짜 키에 일수를 더한다. 날짜 스트립이 기준일 좌우 7칸을
 * 만들 때 쓴다. 문자열을 로컬 자정으로 파싱해 타임존 밀림이 없다.
 */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
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
 * 킥오프 ISO 문자열 → "23:00" 시각 표기. 껍데기 단계는 목데이터의 KST
 * 오프셋(+09:00)이 박힌 ISO를 그대로 쓰므로 단순 추출이다 — 실배선 때
 * Intl 기반 KST 유틸로 교체한다(클라 타임존에 기대지 않기, ADR 0126).
 */
export function kickoffTimeLabel(kickoffAt: string): string {
  return kickoffAt.match(/T(\d{2}:\d{2})/)?.[1] ?? kickoffAt;
}
