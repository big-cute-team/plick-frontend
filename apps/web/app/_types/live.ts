/**
 * @file 라이브 스코어 화면 전용 타입 (KAN-458). 도메인 타입은 `@plick/domain/live`고
 * 여기는 데스크톱 화면 구성에만 쓰는 것을 둔다.
 */

/**
 * 경기 상세 좌측 본문의 탭 (KAN-462). 모바일과 같은 요약, 라인업, 스탯, 뉴스(예정은
 * 프리뷰, 뉴스) 구성이고, 채팅은 탭이 아니라 우측 패널에 늘 떠 있어 여기 없다.
 * URL로 승격하지 않고 컴포넌트 상태로 둔다.
 *
 * `news`는 양 팀 기사 모아보기다 (KAN-484). 경기 지면에서 그 경기 팀 소식을
 * 보러 기사 목록으로 나갔다 오지 않게 한다. `table`은 리그 순위표다 (KAN-567 시안
 * 경기 상세 탭). 순위는 페이지가 서버에서 함께 받아 내려준다.
 *
 * `prediction`은 승부예측이다 (KAN-696). 투표, AI 경기 브리핑(KAN-724), 여론을 그리고 요약이 있는
 * 빅6 경기에만 생겨 맨 앞에 선다. 요약 API가 404(`PREDICTION_NOT_AVAILABLE`)를 주는 경기는 탭 자체가 없다.
 *
 * `preview`는 킥오프 전 프리뷰다 (KAN-462, KAN-699). 팀 비교, 결장자, 상대 전적, 리그 순위를 한 번에
 * 다 펼친다. KAN-709에서 예측과 한 탭으로 합쳤다가 브리핑이 들어오자 KAN-729에서 다시 갈랐다.
 */
export type MatchTabKey =
  | "preview"
  | "summary"
  | "lineups"
  | "stats"
  | "table"
  | "news"
  | "prediction";

/**
 * 채팅방이 붐벼(`ROOM_BUSY`) 방에 나가지 못하고 되돌아온 글 (KAN-572). 입력창이
 * 이 글을 다시 채운다. `at`은 같은 글이 또 튕겼을 때를 가르는 값이다.
 */
export interface BouncedMessage {
  content: string;
  at: number;
}
