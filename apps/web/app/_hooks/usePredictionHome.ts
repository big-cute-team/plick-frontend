"use client";

import { useQuery } from "@tanstack/react-query";
import { predictionKeys } from "@plick/core/predictionKeys";
import { getPredictionHome } from "@plick/core/predictions";
import type { PredictionHomeCard } from "@plick/domain/prediction";
import { LIVE_MAX_RETRIES } from "@/_constants/live";

/**
 * 홈 승부예측 카드 목록 쿼리 (KAN-700). 홈은 익명 ISR(20초)이라 서버가 받아 둔 씨앗은 토큰 없이 받은
 * 값이다. OPEN 카드는 전부 `revealed: false`에 `myPick`이 없다. 그 값으로 첫 그림을 바로 그리고,
 * 마운트되면 브라우저가 `/be` 프록시로 다시 받는다. 프록시가 Bearer를 실어 주므로 그때 내 픽과
 * 분포, 마이팀 우선 순서가 그 사람 기준으로 온다(`usePredictionSummary`와 같은 구조). 사용자별 값은
 * 서버 HTML과 CloudFront 캐시에 들어가지 않는다(티켓 완료 조건).
 *
 * 예측 등록·취소 뒤에는 `invalidateAfterPredictionWrite`가 이 키를 다시 받는다. 폴링은 없다. 홈에
 * 머무는 동안 분포가 바뀌어도 들어갈 때 다시 받으면 된다.
 *
 * 실패해도 홈이 에러로 바뀌면 안 되므로 경계로 던지지 않는다. 씨앗이 없고 실패하면 `undefined`라
 * 섹션이 실패 문구를 둔다.
 *
 * @param initial 서버가 받아 둔 카드 목록. 서버가 못 받았으면 undefined
 */
export function usePredictionHome(initial: PredictionHomeCard[] | undefined) {
  return useQuery<PredictionHomeCard[]>({
    queryKey: predictionKeys.home(),
    queryFn: () => getPredictionHome(),
    ...(initial !== undefined && { initialData: initial }),
    staleTime: 0,
    retry: LIVE_MAX_RETRIES,
    throwOnError: false,
  });
}
