"use client";

import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@plick/core/client";
import type {
  PredictionReportReason,
  PredictionReportTarget,
} from "@plick/domain/prediction";
import {
  reportPredictionOpinion,
  reportPredictionReply,
} from "@/_services/prediction-actions";

/**
 * 예측 의견·답글 신고 뮤테이션 (KAN-697, 답글은 KAN-698). 댓글의 `useReportComment`와 같은
 * 꼴이고 모바일과 같은 구현이다. 대상 종류(`target.kind`)로 액션만 가른다. 사유와 실패 규약이 같아
 * 신고 시트 하나가 둘을 받는다.
 *
 * 신고는 접수만 하고 처리는 운영자 몫이라 성공해도 글 표시가 안 바뀐다. 캐시를 건드릴 게
 * 없어 QueryClient를 잡지 않고, 화면은 접수 안내로 상태만 바꾼다(`PredictionReportDialog`).
 *
 * 서버 액션은 실패를 값으로 돌려주므로 여기서 `ApiError`로 되살려 던진다. 호출부는
 * `classifyPredictionError`로 종류를 가른다. 401과 게스트 403은 로그인·연동 안내로, 내 글
 * 400 `PREDICTION_SELF_REPORT`와 중복 409 `REPORT_DUPLICATED`는 가이드 문구로 시트 안에 남긴다.
 */
export function useReportPrediction() {
  return useMutation({
    mutationFn: async ({
      target,
      reason,
    }: {
      target: PredictionReportTarget;
      reason: PredictionReportReason;
    }) => {
      const result =
        target.kind === "opinion"
          ? await reportPredictionOpinion(target.id, reason)
          : await reportPredictionReply(target.id, reason);
      if (!result.ok) {
        throw new ApiError(result.status, result.code, result.message);
      }
    },
  });
}
