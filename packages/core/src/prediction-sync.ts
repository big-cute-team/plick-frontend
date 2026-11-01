/**
 * @file 승부예측 쓰기 뒤 캐시 정리 (KAN-695). 뮤테이션 훅이 성공 뒤 어느 쿼리를 다시
 * 받을지와, 공감 낙관 갱신이 무한 쿼리 페이지의 어느 항목을 덮을지를 여기 모은다.
 * `debate-sync.ts`와 같은 자리다. 훅은 앱마다 복제되지만 무효화 범위가 앱마다 갈리면
 * 한쪽 화면만 옛 값을 보게 되므로 범위는 core가 들고 있는다.
 */

import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type {
  PredictionLikeState,
  PredictionOpinionPage,
  PredictionReply,
  PredictionReplyPage,
} from "@plick/domain/prediction";
import { predictionKeys } from "./predictionKeys";

/**
 * 예측 등록·수정·취소 뒤 다시 받을 쿼리(시안 가이드 §8 "성공 시 sum, ops, home, me 무효화").
 *
 * 요약은 등록 응답이 같은 모양을 돌려줘 `setQueryData`로 바로 덮을 수도 있지만, 의견
 * 목록은 잠금이 풀리며 통째로 바뀌고 홈 카드와 내 기록은 다른 경기까지 섞여 있어
 * 무효화가 맞다. 요약도 함께 무효화해 두면 서버 분포 캐시(30초)가 돌아온 뒤 숫자가
 * 한 번 더 맞춰진다. 랭킹은 정산 때만 바뀌므로 건드리지 않는다.
 *
 * @param queryClient 앱의 QueryClient
 * @param matchId 쓴 경기
 */
export function invalidateAfterPredictionWrite(
  queryClient: Pick<QueryClient, "invalidateQueries">,
  matchId: number,
): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: predictionKeys.summary(matchId),
    }),
    queryClient.invalidateQueries({
      queryKey: predictionKeys.opinionsOf(matchId),
    }),
    queryClient.invalidateQueries({ queryKey: predictionKeys.home() }),
    queryClient.invalidateQueries({ queryKey: predictionKeys.mine() }),
  ]);
}

/**
 * 답글 등록·수정·삭제 뒤 다시 받을 쿼리. 답글 목록 자체와, `replyCount`를 들고 있는
 * 의견 목록·의견 하나를 함께 받는다.
 *
 * @param queryClient 앱의 QueryClient
 * @param matchId 답글이 달린 의견의 경기
 * @param predictionId 답글이 달린 의견
 */
export function invalidateAfterReplyWrite(
  queryClient: Pick<QueryClient, "invalidateQueries">,
  matchId: number,
  predictionId: number,
): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: predictionKeys.replies(predictionId),
    }),
    queryClient.invalidateQueries({
      queryKey: predictionKeys.opinion(predictionId),
    }),
    queryClient.invalidateQueries({
      queryKey: predictionKeys.opinionsOf(matchId),
    }),
  ]);
}

/**
 * 의견 무한 쿼리 캐시에서 의견 하나의 공감 상태를 덮는다(낙관 갱신·확정·롤백 공용).
 * 같은 의견이 정렬·픽 필터별 캐시 여러 개에 살아 있어 `setQueriesData`로 상위 키를
 * 훑는 쪽이 부른다. 대상이 없는 페이지는 같은 참조를 돌려줘 불필요한 렌더를 막는다.
 *
 * @param data 무한 쿼리 데이터. 아직 없으면 그대로 undefined
 * @param predictionId 대상 의견
 * @param next 새 공감 상태
 */
export function applyOpinionLike(
  data: InfiniteData<PredictionOpinionPage, string | null> | undefined,
  predictionId: number,
  next: PredictionLikeState,
): InfiniteData<PredictionOpinionPage, string | null> | undefined {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    const items = page.items.map((item) =>
      item.id === predictionId ? { ...item, ...next } : item,
    );
    if (items.some((item, i) => item !== page.items[i])) {
      changed = true;
      return { ...page, items };
    }
    return page;
  });
  return changed ? { ...data, pages } : data;
}

/**
 * 답글 무한 쿼리 캐시에서 답글 하나의 공감 상태를 덮는다. {@link applyOpinionLike}와 같다.
 *
 * @param data 무한 쿼리 데이터
 * @param replyId 대상 답글
 * @param next 새 공감 상태
 */
export function applyReplyLike(
  data: InfiniteData<PredictionReplyPage, string | null> | undefined,
  replyId: number,
  next: PredictionLikeState,
): InfiniteData<PredictionReplyPage, string | null> | undefined {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    const items = page.items.map((item) =>
      item.id === replyId ? { ...item, ...next } : item,
    );
    if (items.some((item, i) => item !== page.items[i])) {
      changed = true;
      return { ...page, items };
    }
    return page;
  });
  return changed ? { ...data, pages } : data;
}

/**
 * 답글 무한 쿼리 캐시에서 답글 하나를 수정 응답으로 덮는다(KAN-698). PATCH가 같은 모양을
 * 돌려주고 `replyCount`는 안 변하니 다시 받을 이유가 없다. 대상이 없는 페이지는 같은 참조다.
 *
 * @param data 무한 쿼리 데이터
 * @param reply 수정 응답(`isEdited: true`)
 */
export function applyReplyUpdate(
  data: InfiniteData<PredictionReplyPage, string | null> | undefined,
  reply: PredictionReply,
): InfiniteData<PredictionReplyPage, string | null> | undefined {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    const items = page.items.map((item) =>
      item.id === reply.id ? reply : item,
    );
    if (items.some((item, i) => item !== page.items[i])) {
      changed = true;
      return { ...page, items };
    }
    return page;
  });
  return changed ? { ...data, pages } : data;
}

/**
 * 답글 무한 쿼리 캐시에서 답글 하나를 뺀다(KAN-698, 삭제 204). 댓글은 지운 자리를 tombstone으로
 * 남기지만 답글은 BE 목록에서 사라지므로 바로 빼야 다음 조회와 같은 모양이다. `replyCount`는
 * 의견 캐시에 있어 호출부가 {@link invalidateAfterReplyWrite}로 따로 맞춘다.
 *
 * @param data 무한 쿼리 데이터
 * @param replyId 지운 답글
 */
export function removeReply(
  data: InfiniteData<PredictionReplyPage, string | null> | undefined,
  replyId: number,
): InfiniteData<PredictionReplyPage, string | null> | undefined {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    const items = page.items.filter((item) => item.id !== replyId);
    if (items.length !== page.items.length) {
      changed = true;
      return { ...page, items };
    }
    return page;
  });
  return changed ? { ...data, pages } : data;
}

/**
 * 차단한 사용자의 의견을 무한 쿼리 캐시에서 뺀다(시안 가이드 §5.4 "차단한 사용자의 의견, 답글은
 * 목록에서 빼고 그린다"). 다음 조회부터는 BE가 빼 주지만 이미 받아 둔 페이지에는 남아 있어
 * 지금 보는 화면부터 치운다. 댓글은 플래그만 세워 안내 문구로 바꾸는데(`useBlockUser`), 예측
 * 의견은 BE 계약이 "목록에서 뺀다"라 같은 모양으로 맞춘다. 대상이 없는 페이지는 같은 참조를
 * 돌려준다.
 *
 * @param data 무한 쿼리 데이터. 아직 없으면 그대로 undefined
 * @param userId 차단한 사용자
 */
export function removeBlockedOpinions(
  data: InfiniteData<PredictionOpinionPage, string | null> | undefined,
  userId: number,
): InfiniteData<PredictionOpinionPage, string | null> | undefined {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    const items = page.items.filter((item) => item.author.userId !== userId);
    if (items.length !== page.items.length) {
      changed = true;
      return { ...page, items };
    }
    return page;
  });
  return changed ? { ...data, pages } : data;
}

/**
 * 차단한 사용자의 답글을 무한 쿼리 캐시에서 뺀다. {@link removeBlockedOpinions}와 같다.
 *
 * @param data 무한 쿼리 데이터
 * @param userId 차단한 사용자
 */
export function removeBlockedReplies(
  data: InfiniteData<PredictionReplyPage, string | null> | undefined,
  userId: number,
): InfiniteData<PredictionReplyPage, string | null> | undefined {
  if (!data) return data;
  let changed = false;
  const pages = data.pages.map((page) => {
    const items = page.items.filter((item) => item.author.userId !== userId);
    if (items.length !== page.items.length) {
      changed = true;
      return { ...page, items };
    }
    return page;
  });
  return changed ? { ...data, pages } : data;
}
