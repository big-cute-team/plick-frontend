"use client";

import { formatCount } from "@plick/domain/format";
import { useMyActivityCounts } from "@/_hooks/useMyActivityCounts";
import type { MyActivityCounts } from "@/_types/activity";

/**
 * "댓글 N, 좋아요 N" 한 줄 (KAN-567). 개수는 쿼리 캐시가 원본이라 클라 경계다.
 * 좋아요 탭에서 하트를 끄면 `syncLikeIntoFeeds`가 개수를 무효화하고 이 줄이
 * 따라 바뀐다. 시안의 "투표 N"은 내 투표 수 API가 없어 뺐다.
 *
 * 아직 못 받았으면 줄을 비워 두지 않고 라벨만 남긴다. 숫자 자리가 비었다
 * 채워지며 줄이 튀지 않게.
 *
 * @param initial 서버가 미리 받은 개수와 그 시각
 */
export function ActivityCountsLine({
  initial,
}: {
  initial?: { counts: MyActivityCounts; fetchedAt: number };
}) {
  const { data } = useMyActivityCounts(initial);

  return (
    <p className="text-label-lg text-text-3 mt-1.5">
      댓글 {data ? formatCount(data.commentCount) : "-"}, 좋아요{" "}
      {data ? formatCount(data.likeCount) : "-"}
    </p>
  );
}
