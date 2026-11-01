/**
 * @file 예측 작성 임시 저장 (KAN-696, 시안 가이드 §5.5). 경기별로 `localStorage`에
 * 픽과 본문을 두고 시트를 닫았다 열면 되살린다. 등록, 취소 성공 시 지운다.
 *
 * 비로그인이 작성 시트 대신 로그인 시트를 만났을 때도 여기 적어 둔다. 로그인 왕복은 OAuth
 * 콜백이 홈으로 돌려보내는 하드 내비게이션이라 메모리 상태가 다 날아가는데, 그 사람이 다시
 * 경기로 들어와 "의견 남기기"를 누르면 고른 픽과 쓰던 글이 그대로 선다.
 *
 * 저장소 접근은 전부 try로 감싼다. 사파리 프라이빗 모드, 저장소 꽉 찬 상태, 서버 렌더에서는
 * 읽기 쓰기가 던질 수 있고, 임시 저장은 없어도 되는 편의라 그때는 조용히 없는 셈 친다.
 */

import {
  parsePredictionDraft,
  predictionDraftKey,
  type PredictionDraft,
} from "@plick/domain/prediction";

/**
 * 경기의 임시 저장을 읽는다. 없거나 깨졌거나 저장소를 못 쓰면 null이다.
 *
 * @param matchId 경기 id
 */
export function readPredictionDraft(matchId: number): PredictionDraft | null {
  try {
    return parsePredictionDraft(
      window.localStorage.getItem(predictionDraftKey(matchId)),
    );
  } catch {
    return null;
  }
}

/**
 * 임시 저장을 쓴다. 픽도 없고 본문도 비었으면 지운다. 빈 값을 남겨 두면 다음에 열 때
 * 아무것도 없는 값을 "되살리는" 꼴이 된다.
 *
 * @param matchId 경기 id
 * @param draft 픽과 본문
 */
export function writePredictionDraft(
  matchId: number,
  draft: PredictionDraft,
): void {
  if (draft.pick === null && draft.opinion.length === 0) {
    clearPredictionDraft(matchId);
    return;
  }
  try {
    window.localStorage.setItem(
      predictionDraftKey(matchId),
      JSON.stringify(draft),
    );
  } catch {
    /* 저장소를 못 쓰면 임시 저장만 포기한다 */
  }
}

/**
 * 임시 저장을 지운다. 등록과 취소가 성공했을 때 부른다.
 *
 * @param matchId 경기 id
 */
export function clearPredictionDraft(matchId: number): void {
  try {
    window.localStorage.removeItem(predictionDraftKey(matchId));
  } catch {
    /* 없는 셈 친다 */
  }
}
