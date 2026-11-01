/**
 * @file 승부예측 화면 상수 (KAN-696, 시안 가이드 §5.4·§7). 웹 `_constants/predictions.ts`와 같은
 * 값의 수동 동기화 복제다. 카피와 잠금 지면 치수는 화면 정책이라 승격하지 않는다. BE 오류별
 * 문구는 `@plick/core/prediction-errors`가 든다.
 */

/** 잠금 지면(OPEN, 예측 전)의 안내. 설명체 금지 규칙의 예외로 기획 확인을 받은 문구다. */
export const PREDICTION_LOCK_NOTICE =
  "의견을 남기고 다른 사람들의 의견을 확인해 보세요";

/** 잠금 지면과 의견 머리글의 작성 버튼 문구. */
export const PREDICTION_COMPOSE_LABEL = "의견 남기기";

/** 의견 머리글의 작은 작성 버튼 문구(프리뷰 묶음과 같은 말). */
export const PREDICTION_VOTE_LABEL = "투표하기";

/**
 * 잠금 지면이 블러 아래 그리는 가짜 의견 행 수. 서버가 `locked: true`로 빈 목록을 주므로 실제
 * 본문은 DOM에 없고, 회색 막대 행이 "여기 의견이 있다"는 실루엣만 만든다.
 */
export const PREDICTION_FAKE_ROWS = 4;

/** 작성 시트 입력란 안내. */
export const PREDICTION_OPINION_PLACEHOLDER = "의견 5자 이상";

/** 예측 취소 확인 시트 제목. */
export const PREDICTION_CANCEL_TITLE = "예측을 취소할까요?";

/** 게스트가 작성을 누르면 띄우는 연동 안내. */
export const PREDICTION_LINK_NOTICE = "계정 연동 후 예측할 수 있어요";
