/**
 * @file 라이브 스코어 화면 전용 타입 (KAN-458). 도메인 타입은 `@plick/domain/live`고
 * 여기는 모바일 화면 구성에만 쓰는 것을 둔다.
 */

/**
 * 경기 상세 안의 탭. 상태별로 보이는 조합이 다르다(`MATCH_TABS_BY_STATUS`).
 * URL로 승격하지 않고 컴포넌트 상태로 둔다(ADR 0126 스토리 2).
 *
 * `news`는 양 팀 기사 모아보기다 (KAN-484). 경기 지면에서 그 경기 팀 소식을
 * 보러 기사 탭으로 나갔다 오지 않게 한다.
 *
 * `table`은 리그 순위표다 (KAN-567). 시안의 경기 상세 여섯 탭 가운데 하나로,
 * 목록 화면 맨 아래 순위표와 같은 표를 경기 지면 안에서 본다.
 */
export type MatchTabKey =
  | "preview"
  | "summary"
  | "lineups"
  | "stats"
  | "table"
  | "news"
  | "chat";
