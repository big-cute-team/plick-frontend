/**
 * @file AI 경기 브리핑 도메인 타입과 순수 헬퍼 (KAN-724, 에픽 KAN-717).
 *
 * BE `GET /api/v1/matches/{matchId}/briefing`(KAN-719)이 저장해 둔 브리핑 하나를 돌려주고 화면은
 * 읽기만 한다. 생성, 다시 요약, 강제 갱신 같은 쓰기는 없다. 웹과 모바일이 같은 카드를 그리므로
 * 앱 폴더를 거치지 않고 바로 여기 둔다(ADR 0011 게이트 C). BE 응답 봉투 모양은
 * `@plick/core/match-briefings`가 들고 있고 화면은 이 타입만 본다.
 *
 * 서버가 유일한 신뢰 판정이다. 만료(`expiresAt`)와 킥오프는 서버가 정한 값이고 FE는 그 위에 표시
 * 가드만 얹는다. 클라이언트 현재 시각에 24시간을 더하거나 KST 자정으로 바꾸지 않는다.
 */

/**
 * 핵심 문장 하나. BE는 문장마다 근거 출처 id(`evidenceIds`)와 출처 목록(`sources`)도 주지만 화면은
 * 읽지 않는다 (KAN-731. 근거 링크가 404로 떨어지는 경우가 있어 근거 목록을 걷었다).
 */
export interface MatchBriefingPoint {
  text: string;
}

/** 화면이 보는 브리핑. {@link parseMatchBriefing}을 거친 값만 이 타입이다. */
export interface MatchBriefing {
  /** 경기 id 문자열. 화면의 경기와 다르면 거절한다 */
  matchId: string;
  /** 모델이 결과를 저장한 시각(UTC ISO). 자료 기준 시각과 혼동하지 않는다 */
  generatedAt: string;
  /** 입력 자료를 조회한 기준 시각(UTC ISO). 화면 문구 "11월 4일 12:00 기준"의 출처 */
  dataAsOf: string;
  /** 서버가 정한 만료 시각(UTC ISO). `min(dataAsOf + 24h, 생성 당시 킥오프)` */
  expiresAt: string;
  points: MatchBriefingPoint[];
  cautions: string[];
}

/** 카드 제목. */
export const MATCH_BRIEFING_TITLE = "AI 경기 브리핑";

/** 주의사항 줄 머리말. */
export const MATCH_BRIEFING_CAUTION_LABEL = "주의";

/**
 * 카드 맨 아래 작고 연하게 한 줄 서는 고정 안내 (KAN-729). 모델이 쓴 주의사항(`cautions`)과 달리
 * 브리핑 내용과 무관하게 늘 있다. AI 요약이라 틀릴 수 있다는 걸 읽는 사람이 알게 한다.
 */
export const MATCH_BRIEFING_DISCLAIMER =
  "AI가 만든 요약이라 사실과 다를 수 있어요";

/**
 * 표시 상한(절약안 v2). 핵심 최대 3문장에 문장당 80자, 주의사항 최대 1개 60자.
 * 서버가 같은 한도로 생성하지만 화면도 같은 값으로 자른다. 모바일에서 긴 글이 투표 진입을 밀어내지
 * 않게 하는 마지막 가드다.
 */
export const MATCH_BRIEFING_MAX_POINTS = 3;
export const MATCH_BRIEFING_POINT_MAX_CHARS = 80;
export const MATCH_BRIEFING_MAX_CAUTIONS = 1;
export const MATCH_BRIEFING_CAUTION_MAX_CHARS = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** ISO 시각이 실제로 파싱되는가. 깨진 시각이 섞인 브리핑은 통째로 버린다. */
function isValidIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

/** 글자 수 상한으로 자른다. `@plick/domain/format`의 `truncateText`와 같은 규칙이고 의존을 피해 여기 둔다. */
function clip(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length <= max
    ? trimmed
    : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * BE가 준 `briefing` 객체를 화면용 {@link MatchBriefing}으로 검증해 접는다. 모양이 어긋나면 null이다.
 * 화면은 null이면 카드를 숨기고 기존 화면을 그대로 둔다. 브리핑 하나 때문에 경기 화면이 깨지면
 * 안 되므로 던지지 않는다.
 *
 * 거절하는 경우: 객체가 아님, `matchId`가 화면의 경기와 다름(늦게 도착한 다른 경기 응답이나 서버
 * 오류), 시각 셋 중 하나라도 파싱 실패, 핵심 문장이 하나도 없음. 문장과 주의사항은 표시 상한으로
 * 자른다. 출처 목록과 근거 id는 보지 않으므로 그쪽 모양이 어긋나도 브리핑은 그대로 통과한다.
 *
 * @param raw BE `data.briefing`
 * @param matchId 화면의 경기 id. 숫자든 문자열이든 문자열로 맞춰 비교한다
 */
export function parseMatchBriefing(
  raw: unknown,
  matchId: number | string,
): MatchBriefing | null {
  if (!isRecord(raw)) return null;
  if (!isNonEmptyString(raw.matchId) || raw.matchId !== String(matchId)) {
    return null;
  }
  const { generatedAt, dataAsOf, expiresAt } = raw;
  if (!isValidIso(generatedAt) || !isValidIso(dataAsOf)) return null;
  if (!isValidIso(expiresAt)) return null;

  const points: MatchBriefingPoint[] = [];
  if (Array.isArray(raw.points)) {
    for (const item of raw.points) {
      if (!isRecord(item) || !isNonEmptyString(item.text)) continue;
      points.push({ text: clip(item.text, MATCH_BRIEFING_POINT_MAX_CHARS) });
      if (points.length === MATCH_BRIEFING_MAX_POINTS) break;
    }
  }
  if (points.length === 0) return null;

  const cautions = Array.isArray(raw.cautions)
    ? raw.cautions
        .filter(isNonEmptyString)
        .slice(0, MATCH_BRIEFING_MAX_CAUTIONS)
        .map((text) => clip(text, MATCH_BRIEFING_CAUTION_MAX_CHARS))
    : [];

  return {
    matchId: raw.matchId,
    generatedAt,
    dataAsOf,
    expiresAt,
    points,
    cautions,
  };
}

/** 브리핑을 숨길지 판정하는 데 필요한 경기 헤더 조각. `MatchSummary`가 이 모양을 만족한다. */
export interface MatchBriefingHost {
  id: number;
  status: string;
  /** 킥오프 ISO. BE 경기 상세가 KST 오프셋으로 준다 */
  kickoffAt: string;
}

/**
 * 카드를 감출 시각(epoch ms). 서버 만료와 실제 킥오프 중 이른 쪽이다. 둘 중 하나라도 파싱이 안 되면
 * NaN이라 {@link isMatchBriefingVisible}이 숨기고 타이머도 걸리지 않는다.
 *
 * @param briefing 검증된 브리핑
 * @param kickoffAt 경기 헤더의 킥오프 ISO
 */
export function matchBriefingDeadline(
  briefing: MatchBriefing,
  kickoffAt: string,
): number {
  return Math.min(
    new Date(briefing.expiresAt).getTime(),
    new Date(kickoffAt).getTime(),
  );
}

/**
 * 지금 이 경기 화면에 브리핑을 보여도 되는가. 서버가 유일한 신뢰 판정이고 이건 추가 표시 가드다.
 *
 * 숨기는 조건: 경기가 SCHEDULED가 아님(라이브, 종료, 연기, 취소), 브리핑의 경기 id가 다름, 서버
 * 만료 시각이나 킥오프에 도달, 시각 파싱 실패. KST 자정을 넘긴 것만으로는 숨기지 않는다. 전날
 * 유효 결과가 당일 재생성 실패 뒤에 남아 있어도 서버가 READY로 주면 원래 만료까지 그대로 보인다.
 *
 * @param briefing 검증된 브리핑
 * @param host 경기 헤더(id, 상태, 킥오프)
 * @param now 비교 기준 시각(epoch ms). 테스트와 타이머가 고정값을 넣는다
 */
export function isMatchBriefingVisible(
  briefing: MatchBriefing,
  host: MatchBriefingHost,
  now: number,
): boolean {
  if (host.status !== "SCHEDULED") return false;
  if (briefing.matchId !== String(host.id)) return false;
  const deadline = matchBriefingDeadline(briefing, host.kickoffAt);
  return Number.isFinite(deadline) && now < deadline;
}

/**
 * 자료 기준 시각 문구. "11월 4일 12:00 기준"처럼 `dataAsOf`를 KST로 적는다. 생성 시각이 아니라 입력
 * 자료를 읽은 시각이고, "실시간"이나 "최신 선발 반영" 같은 표현은 쓰지 않는다(절약안 v2 문구 규칙).
 * 기기 시간대와 무관하게 KST로 고정하는 이유는 `formatChangeableAt`과 같다.
 *
 * @param dataAsOf 자료 기준 시각(UTC ISO)
 * @example
 * matchBriefingAsOfLabel("2026-11-04T03:00:00Z"); // "11월 4일 12:00 기준"
 */
export function matchBriefingAsOfLabel(dataAsOf: string): string {
  const at = new Date(dataAsOf);
  if (Number.isNaN(at.getTime())) return "";
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(at);
  const time = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
  return `${date} ${time} 기준`;
}
