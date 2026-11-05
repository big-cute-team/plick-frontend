/**
 * @file AI 경기 브리핑 도메인 타입과 순수 헬퍼 (KAN-724, 에픽 KAN-717).
 *
 * BE `GET /api/v1/matches/{matchId}/briefing`(KAN-719)이 저장해 둔 브리핑 하나를 돌려주고 화면은
 * 읽기만 한다. 생성, 다시 요약, 강제 갱신 같은 쓰기는 없다. 웹과 모바일이 같은 카드를 그리므로
 * 앱 폴더를 거치지 않고 바로 여기 둔다(ADR 0011 게이트 C). BE 응답 봉투 모양은
 * `@plick/core/match-briefings`가 들고 있고 화면은 이 타입만 본다.
 *
 * 서버가 유일한 신뢰 판정이다. READY를 주면 보이고 아니면 숨긴다. 처음엔 서버 만료(`expiresAt`)와
 * 킥오프에 카드를 닫았는데 KAN-735에서 걷었다. 경기가 시작하거나 끝난 뒤에도 마지막 경기 전 요약이
 * 남고, 언제 자료인지는 카드의 기준 시각("11월 7일 09:00 기준")이 말해 준다. FE가 얹는 가드는 경기
 * id 일치와 취소·연기 제외 둘뿐이다.
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
 * 오류), 생성 시각이나 자료 기준 시각 파싱 실패, 핵심 문장이 하나도 없음. 문장과 주의사항은 표시
 * 상한으로 자른다.
 *
 * 화면이 안 쓰는 필드는 들여다보지 않는다. 출처 목록과 근거 id(KAN-731), 만료 시각 `expiresAt`
 * (KAN-735)이 그렇다. BE는 계속 주지만 그쪽 모양이 어긋나거나 빠져도 브리핑은 그대로 통과한다.
 * 끝난 경기의 `expiresAt`은 늘 과거다.
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
  const { generatedAt, dataAsOf } = raw;
  if (!isValidIso(generatedAt) || !isValidIso(dataAsOf)) return null;

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
    points,
    cautions,
  };
}

/** 브리핑 조회와 표시 판정에 필요한 경기 헤더 조각. `MatchSummary`가 이 모양을 만족한다. */
export interface MatchBriefingHost {
  id: number;
  status: string;
  /** 킥오프 ISO. BE 경기 상세가 KST 오프셋으로 준다. 받은 값을 굳힐 시각으로만 쓴다 */
  kickoffAt: string;
}

/** 브리핑이 설 수 있는 경기 상태. 예정, 진행, 종료다. */
const MATCH_BRIEFING_STATUSES: ReadonlySet<string> = new Set([
  "SCHEDULED",
  "LIVE",
  "FINISHED",
]);

/**
 * 이 상태의 경기에 브리핑을 물어봐도 되는가. 예정, 진행, 종료 경기만 그렇다. 취소와 연기 경기는
 * 서버도 UNAVAILABLE을 주므로(KAN-732) 요청부터 보내지 않는다. 모르는 상태값도 묻지 않는다.
 *
 * @param status 경기 헤더의 상태(`MatchStatus`)
 */
export function isMatchBriefingEligible(status: string): boolean {
  return MATCH_BRIEFING_STATUSES.has(status);
}

/**
 * 지금 이 경기 화면에 브리핑을 보여도 되는가. 서버가 유일한 신뢰 판정이고 이건 추가 표시 가드다.
 *
 * 숨기는 조건은 둘이다. 경기가 취소나 연기로 바뀜(예정일 때 받아 둔 캐시가 남아 있을 수 있다),
 * 브리핑의 경기 id가 다름. 서버 만료 시각과 킥오프로는 숨기지 않는다 (KAN-735). 진행 중이거나 끝난
 * 경기에서도 마지막 경기 전 요약이 그대로 보인다.
 *
 * @param briefing 검증된 브리핑
 * @param host 경기 헤더(id, 상태)
 */
export function isMatchBriefingVisible(
  briefing: MatchBriefing,
  host: Pick<MatchBriefingHost, "id" | "status">,
): boolean {
  return (
    isMatchBriefingEligible(host.status) && briefing.matchId === String(host.id)
  );
}

/**
 * 브리핑이 아직 바뀔 수 있는 경기인가. 상태가 예정이고 킥오프 시각 전일 때만 그렇다. 훅이 이 값으로
 * 받은 브리핑을 60초 뒤 낡은 것으로 볼지(다시 받을 수 있다), 끝까지 그대로 쓸지 정한다.
 *
 * 서버 배치는 킥오프 전까지만 매일 다시 만들고 킥오프 뒤에는 만들지 않는다(KAN-734). 상태만 보지
 * 않고 시각도 보는 이유는 예정 경기의 상세가 폴링되지 않아서다. 화면을 켜 둔 채 킥오프를 넘기면
 * 헤더는 SCHEDULED로 남는다. 킥오프가 파싱되지 않으면 false다.
 *
 * @param host 경기 헤더(상태, 킥오프)
 * @param now 비교 기준 시각(epoch ms)
 */
export function isMatchBriefingPrematch(
  host: Pick<MatchBriefingHost, "status" | "kickoffAt">,
  now: number,
): boolean {
  return (
    host.status === "SCHEDULED" && now < new Date(host.kickoffAt).getTime()
  );
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
