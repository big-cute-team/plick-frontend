"use client";

import { useMyPredictionStats } from "@plick/core/prediction-queries";
import { debateTabPath } from "@/_utils/debates";
import { MeLinkRow } from "./MeLinkRow";

/**
 * MY의 `예측 랭킹  128위 >` 줄 (KAN-701, 시안 가이드 §5.8). 계정 줄 위에 서고 누르면 투표 화면 랭킹
 * 탭으로 간다. 소셜 계정일 때만 그리는 건 호출부(`page.tsx`)가 가른다.
 *
 * 순위는 `GET /me/prediction-stats`를 브라우저에서 받아 적는다. 유저별 값이라 서버 씨앗이 없고
 * (홈 승부예측 제목 줄과 같은 판단, KAN-700), 받기 전이나 자격 미달(`rank: null`), 실패면 값 없이 꺾쇠만
 * 둔다. 기록 상자(`MePredictionStats`)와 예측 탭은 KAN-702가 붙였고 같은 쿼리를 나눠 쓴다.
 *
 * @param className 테두리 등 호출부 보정
 */
export function MePredictionRankRow({ className }: { className?: string }) {
  const { data: stats } = useMyPredictionStats(true);
  const rank = stats?.season.rank ?? null;

  return (
    <MeLinkRow
      href={debateTabPath("rank")}
      label="예측 랭킹"
      value={rank === null ? undefined : `${rank}위`}
      tone="accent"
      className={className}
    />
  );
}
