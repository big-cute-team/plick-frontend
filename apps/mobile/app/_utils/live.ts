/**
 * @file 라이브 화면 전용 순수 헬퍼. 도메인 공용 헬퍼는 `@plick/domain/live`에 있고
 * 여기는 이 앱 화면이 쓰는 것만 둔다.
 */
import type { MatchSummary } from "@plick/domain/live";
import type { TeamCode } from "@plick/domain/types";

/**
 * 한 경기에서 기사를 모을 수 있는 팀 코드 목록 (KAN-484).
 *
 * 기사의 팀 태그는 빅6만 있어서(`TeamCode` 레지스트리) 빅6 밖 팀은 아예 뺀다.
 * 홈·어웨이가 다 빅6면 둘, 한쪽만이면 하나, 빅6가 없으면 빈 배열이고 호출부가
 * 빈 상태 문구를 그린다.
 *
 * 홈·어웨이 순서를 그대로 지킨다 — 화면에 "리버풀 기사 더 보기 / 토트넘 기사
 * 더 보기"가 헤더의 좌우 순서와 같게 선다.
 *
 * @param header 경기 헤더
 */
export function matchTeamCodes(header: MatchSummary): TeamCode[] {
  return [header.home.code, header.away.code].filter(
    (code): code is TeamCode => code !== null,
  );
}
