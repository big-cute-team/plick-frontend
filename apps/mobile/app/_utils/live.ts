/**
 * @file 라이브 화면 전용 순수 헬퍼. 도메인 공용 헬퍼는 `@plick/domain/live`에 있고
 * 여기는 이 앱 화면이 쓰는 것만 둔다.
 */
import {
  dateKeyParts,
  dateKeyYearMonth,
  kickoffDateLabel,
  kickoffTimeLabel,
  matchStatusLabel,
  shiftDateKey,
  type LineupPlayer,
  type LiveTeam,
  type MatchSummary,
  type TeamLineup,
} from "@plick/domain/live";
import type { TeamCode } from "@plick/domain/types";
import { DATE_STRIP_SPAN } from "@/_constants/live";

/**
 * 한 경기에서 기사를 모을 수 있는 팀 코드 목록 (KAN-484).
 *
 * 기사의 팀 태그는 빅6만 있어서(`TeamCode` 레지스트리) 빅6 밖 팀은 아예 뺀다.
 * 홈·어웨이가 다 빅6면 둘, 한쪽만이면 하나, 빅6가 없으면 빈 배열이고 호출부가
 * 빈 상태 문구를 그린다.
 *
 * 홈·어웨이 순서를 그대로 지킨다. 화면에 "리버풀 기사 더 보기 / 토트넘 기사
 * 더 보기"가 헤더의 좌우 순서와 같게 선다.
 *
 * @param header 경기 헤더
 */
export function matchTeamCodes(header: MatchSummary): TeamCode[] {
  return [header.home.code, header.away.code].filter(
    (code): code is TeamCode => code !== null,
  );
}

/**
 * 날짜 줄에 그릴 7일의 날짜 키 (KAN-567). 선택한 날을 가운데 두고 앞뒤
 * `DATE_STRIP_SPAN`일씩 편다. 시안의 날짜 줄이 7칸 한 줄이라 그렇게 잡았고,
 * 좌우 스와이프로 하루씩 옮길 때 줄 전체가 한 칸씩 따라 흐른다.
 *
 * @param selected 가운데 둘 날짜 키
 * @example
 * dateStripKeys("2026-09-21"); // ["2026-09-18", …, "2026-09-24"]
 */
export function dateStripKeys(selected: string): string[] {
  return Array.from({ length: DATE_STRIP_SPAN * 2 + 1 }, (_, i) =>
    shiftDateKey(selected, i - DATE_STRIP_SPAN),
  );
}

/**
 * 날짜 줄 위 라벨 (KAN-567). 시안의 12px 회색 한 줄 자리에 지금 보는 날짜를
 * "9월 23일 화요일"로 적는다. 요일 한 글자는 도메인 헬퍼가 준다.
 *
 * @param dateKey 보고 있는 날짜 키
 * @example
 * dateStripLabel("2026-09-23"); // "9월 23일 수요일"
 */
export function dateStripLabel(dateKey: string): string {
  const { month } = dateKeyYearMonth(dateKey);
  const { weekday, day } = dateKeyParts(dateKey);
  return `${month}월 ${day}일 ${weekday}요일`;
}

/** 경기 목록 스코어 숫자의 톤. 시안 `homeScoreColor` 분기 그대로다. */
export type ScoreTone = "accent" | "strong" | "muted";

/**
 * 경기 목록 행의 스코어 한쪽 톤 (KAN-567). 라이브면 양쪽 다 강조색이고,
 * 끝난 경기는 이긴 쪽(동점 포함)만 진하게, 진 쪽은 회색으로 낮춘다.
 *
 * @param match 경기
 * @param side 홈인지 원정인지
 */
export function scoreTone(
  match: MatchSummary,
  side: "home" | "away",
): ScoreTone {
  if (match.status === "LIVE") return "accent";
  const mine = match.score[side] ?? 0;
  const other = match.score[side === "home" ? "away" : "home"] ?? 0;
  return mine >= other ? "strong" : "muted";
}

/**
 * 경기 상세 헤더의 킥오프 한 줄 (KAN-567). 시안은 "9월 21일 21:00"이다. 도메인의
 * 날짜 표기("9월 21일 (일)")와 시각 표기를 이어 붙인다.
 *
 * @param kickoffAt 킥오프 ISO 문자열
 */
export function kickoffFullLabel(kickoffAt: string): string {
  return `${kickoffDateLabel(kickoffAt)} ${kickoffTimeLabel(kickoffAt)}`;
}

/**
 * 경기 상세 헤더의 상태 한 줄 (KAN-567). 시안 `statusLabel` 분기다. 라이브는
 * "후반 67'"처럼 구간과 분을, 그 밖은 상태 문구를 돌려준다.
 *
 * @param match 경기 헤더
 */
export function matchStatusText(match: MatchSummary): string {
  switch (match.status) {
    case "LIVE": {
      const { primary, secondary } = matchStatusLabel(match);
      return `${secondary} ${primary}`;
    }
    case "FINISHED":
      return "경기 종료";
    case "SCHEDULED":
      return "킥오프 전";
    case "POSTPONED":
      return "연기";
    case "CANCELLED":
      return "취소";
  }
}

/**
 * 채팅방 배너가 가리킬 경기 (KAN-567). 시안의 통합 채팅방은 API에 없어서,
 * 지금 진행 중인 경기가 있으면 그 경기의 채팅 탭으로 보낸다. 라이브가 둘 이상이면
 * 목록(킥오프 오름차순)의 첫 경기다. 없으면 null이고 배너를 그리지 않는다.
 *
 * @param matches 오늘 경기 목록
 */
export function liveChatMatch(matches: MatchSummary[]): MatchSummary | null {
  return matches.find((match) => match.status === "LIVE") ?? null;
}

/** 선수별 스탯 표의 한 행. 선발 선수에 소속 팀을 붙인 것이다. */
export interface StarterRow {
  player: LineupPlayer;
  team: LiveTeam;
}

/**
 * 선수별 스탯 표에 깔 양 팀 선발 (KAN-567). 시안은 평점 높은 순으로 나열한다.
 * 평점이 아직 없는 선수(null)는 뒤로 보내고 같은 평점이면 홈 팀이 먼저다.
 *
 * @param lineups 양 팀 라인업
 */
export function ratedStarters(lineups: {
  home: TeamLineup;
  away: TeamLineup;
}): StarterRow[] {
  const rows: StarterRow[] = [
    ...lineups.home.players.map((player) => ({
      player,
      team: lineups.home.team,
    })),
    ...lineups.away.players.map((player) => ({
      player,
      team: lineups.away.team,
    })),
  ];
  return rows.sort((a, b) => (b.player.rating ?? -1) - (a.player.rating ?? -1));
}
