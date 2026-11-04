/**
 * @file 승부예측 화면 상수 (KAN-696, 답글은 KAN-698, 시안 가이드 §5.4·§5.6·§7). 모바일 `_constants/predictions.ts`와 같은
 * 값의 수동 동기화 복제다. 카피와 잠금 지면 치수는 화면 정책이라 승격하지 않는다. BE 오류별
 * 문구는 `@plick/core/prediction-errors`가 든다.
 */

/** 잠금 지면(OPEN, 예측 전)의 안내. 설명체 금지 규칙의 예외로 기획 확인을 받은 문구다. */
export { PARTICIPATION_NOTICE as PREDICTION_LOCK_NOTICE } from "@plick/domain/vs";

/** 잠금 지면과 의견 머리글의 작성 버튼 문구. */
export const PREDICTION_COMPOSE_LABEL = "의견 남기기";

/** 의견 머리글의 작은 작성 버튼 문구(프리뷰 묶음과 같은 말). */
export const PREDICTION_VOTE_LABEL = "투표하기";

/**
 * 잠금 지면이 블러 아래 그리는 가짜 의견 행 수. 서버가 `locked: true`로 빈 목록을 주므로 실제
 * 본문은 DOM에 없고, 회색 막대 행이 "여기 의견이 있다"는 실루엣만 만든다.
 */
export const PREDICTION_FAKE_ROWS = 4;

/**
 * 잠금 지면이 닉네임을 보이며 그리는 의견 행 수 (KAN-714). 서버가 잠금 응답에 닉네임만 실린 행을
 * 주면 이만큼 그린다. 지면 높이가 길어지지 않을 만큼이다.
 */
export const PREDICTION_LOCKED_NAMED_ROWS = 6;

/** 작성 시트 입력란 안내. */
export const PREDICTION_OPINION_PLACEHOLDER = "의견 5자 이상";

/** 예측 취소 확인 시트 제목. */
export const PREDICTION_CANCEL_TITLE = "예측을 취소할까요?";

/** 게스트가 작성을 누르면 띄우는 연동 안내. */
export const PREDICTION_LINK_NOTICE = "계정 연동 후 예측할 수 있어요";

/**
 * 게스트가 예측을 등록한 직후 뜨는 연동 안내의 제목과 본문. 전에는 "예측이 등록됐어요"에 기록을 쌓으라는
 * 한 줄이었는데, 랭킹에서 적중률 높은 사람들의 기록을 보고 예측하기 쉬워진다는 쪽으로 바꿨다(KAN-724 PR에
 * 같이 실은 문구 변경). 등록은 이미 끝났으니 사실만 덧붙인다.
 */
export const PREDICTION_SUBMITTED_TITLE = "고수들은 어떻게 예측할까요?";
export const PREDICTION_SUBMITTED_BODY =
  "계정을 연동하면 시즌 랭킹에서 적중률 높은 사람들의 기록을 보고 승부를 더 쉽게 가늠할 수 있어요. 방금 등록한 예측은 그대로 남아요.";

/** 의견 신고 시트·팝업 제목. 댓글 신고와 같은 사유를 쓰고 제목만 다르다. */
export const PREDICTION_REPORT_TITLE = "의견 신고";

/** 비로그인이 의견에 신고·차단을 누르면 띄우는 로그인 안내 본문. */
export const PREDICTION_REPORT_LOGIN_PROMPT =
  "신고와 차단은 로그인한 사용자만 할 수 있어요";

/** 삭제된 의견(답글이 남아 자리만 있는 행)의 본문 대체 문구. */
export const PREDICTION_DELETED_OPINION = "삭제된 의견이에요";

/** 답글 신고 시트·팝업 제목(KAN-698). 의견 신고와 같은 사유를 쓰고 제목만 다르다. */
export const PREDICTION_REPLY_REPORT_TITLE = "답글 신고";

/** 답글 목록 빈 상태 문구. */
export const PREDICTION_REPLIES_EMPTY = "아직 답글이 없어요";

/** 답글 삭제 확인 제목. */
export const PREDICTION_REPLY_DELETE_TITLE = "답글을 삭제할까요?";

/** 의견 상세를 직접 열었는데 지워졌거나 가려진 의견일 때(404)의 안내. */
export const PREDICTION_OPINION_GONE = "지워졌거나 볼 수 없는 의견이에요";

/** 홈 승부예측 목록이 비었을 때(KAN-700). BE가 OPEN이 없으면 최근 SETTLED 하나를 넣어 주니 드물다. */
export const PREDICTION_HOME_EMPTY = "지금 예측할 경기가 없어요";

/** 홈 승부예측 목록을 서버와 브라우저 둘 다 못 받았을 때. */
export const PREDICTION_HOME_ERROR = "승부예측을 불러오지 못했어요";

/** 투표 화면 랭킹 탭의 제목(KAN-701, 시안 가이드 §5.7). */
export const PREDICTION_RANKING_TITLE = "시즌 랭킹";

/** 랭킹 표 머리글. 순서는 시안 그대로다. */
export const PREDICTION_RANKING_COLUMNS = [
  "순위",
  "닉네임",
  "적중률",
  "적중",
  "연속",
] as const;

/** 내 순위 줄의 이름 칸. */
export const PREDICTION_RANKING_ME_LABEL = "나";

/** 닉네임이 없는 사용자의 랭킹 행. MY 화면의 빈 닉네임 표기와 같은 말이다. */
export const PREDICTION_RANKING_NO_NICKNAME = "닉네임 미설정";

/** 정산된 사람이 아직 없어 목록이 빈 상태(티켓 KAN-701 "빈 상태 화면"). */
export const PREDICTION_RANKING_EMPTY = "아직 랭킹이 없어요";

/** 랭킹 첫 페이지를 못 받았을 때. */
export const PREDICTION_RANKING_ERROR = "랭킹을 불러오지 못했어요";

/** 랭킹으로 가는 링크의 글자. 순위가 있으면 `128위`가 대신 선다(`predictionRankLabel`). */
export const PREDICTION_RANKING_LINK_LABEL = "랭킹";
