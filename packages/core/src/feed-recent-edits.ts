/**
 * @file 방금 누른 좋아요 수와 투표 집계를 릴스 피드 응답 위에 지킨다 (KAN-748).
 *
 * 릴 카드의 좋아요 수와 토론 집계는 피드 캐시가 원본이다. 씨앗이 묵어 피드를 다시 받는 중에
 * 누르면, 누르기 전에 나간 요청이 누르기 전 수를 싣고 돌아와 캐시를 통째로 바꾼다. 응답이 액션보다
 * 먼저 오면 수가 내려갔다 올라가고, 액션이 먼저 끝났으면 옛 수가 다음 갱신까지 남는다. 하트와 내
 * 표는 내 상태 캐시(`article-state-cache.ts`)가 지켜서 수만 어긋난다.
 *
 * 피드 조회는 취소하지 않는다. 묵은 씨앗의 커서로 다음 페이지를 이어 받게 된다(KAN-404). 그래서 내
 * 상태 캐시와 같은 방식으로 방금 적은 값을 잠깐 기억해 두고, 피드 응답이 캐시에 들어가기 전에 그
 * 카드에만 덮어쓴다.
 */

import type { DebateVoteState } from "@plick/domain/types";
import { RECENT_EDIT_MS } from "./article-state-cache";

/** 집계만 지킨다. 내 표(`myVote`)는 내 상태 캐시가 원본이다 */
type VoteCounts = Pick<DebateVoteState, "voteCountA" | "voteCountB">;

/** 피드 카드에서 이 파일이 보는 부분 */
interface FeedItem {
  id: string;
  likeCount: number;
  debate?: ({ id: string } & VoteCounts) | null;
}

/**
 * 기사 id별 좋아요 수와 토론 id별 집계, 그리고 적은 시각. 모듈 전역이지만 쓰는 쪽(뮤테이션
 * 콜백)이 브라우저에서만 돌아 서버 프로세스에서는 늘 비어 있다. 사람마다 다른 값이 아니라
 * 세션이 바뀌어도 지울 필요가 없다.
 */
const likeCounts = new Map<string, { likeCount: number; at: number }>();
const voteCounts = new Map<string, { counts: VoteCounts; at: number }>();

/**
 * 방금 캐시에 적은 좋아요 수를 기억한다. 낙관적 값과 서버 확정 값 모두 여기로 온다.
 *
 * @param articleId 기사(릴) id
 * @param likeCount 캐시에 적은 수
 */
export function rememberLikeCount(articleId: string, likeCount: number): void {
  likeCounts.set(articleId, { likeCount, at: Date.now() });
}

/**
 * 좋아요 수 기억을 지운다. 실패해 되돌린 뒤에 부른다. 되돌린 수는 누르기 전에 보던 값이라
 * 그 사이 받은 피드 응답보다 옛 값일 수 있다.
 */
export function forgetLikeCount(articleId: string): void {
  likeCounts.delete(articleId);
}

/**
 * 방금 캐시에 적은 토론 집계를 기억한다.
 *
 * @param debateId 토론 id
 * @param counts 캐시에 적은 집계
 */
export function rememberVoteCounts(debateId: string, counts: VoteCounts): void {
  voteCounts.set(debateId, {
    counts: { voteCountA: counts.voteCountA, voteCountB: counts.voteCountB },
    at: Date.now(),
  });
}

/** 토론 집계 기억을 지운다. 실패해 되돌린 뒤에 부른다 */
export function forgetVoteCounts(debateId: string): void {
  voteCounts.delete(debateId);
}

/**
 * 피드 한 페이지를 받아 방금 적은 수를 덮어 돌려준다. 릴스 피드 쿼리의 queryFn이 감싼다.
 *
 * 요청이 출발하기 {@link RECENT_EDIT_MS} 전 이후에 적은 값만 덮는다. 누른 뒤에 출발한 요청이라도
 * 액션이 BE에 닿기 전이면 옛 수를 받아 오기 때문에 출발 시각보다 앞까지 본다. 그보다 오래된
 * 기억은 응답이 맞으니 버린다.
 *
 * @param load 페이지를 받아 오는 함수
 */
export async function loadFeedKeepingRecentEdits<
  Page extends { items: FeedItem[] },
>(load: () => Promise<Page>): Promise<Page> {
  const since = Date.now() - RECENT_EDIT_MS;
  const page = await load();

  for (const [id, edit] of likeCounts) {
    if (edit.at < since) likeCounts.delete(id);
  }
  for (const [id, edit] of voteCounts) {
    if (edit.at < since) voteCounts.delete(id);
  }
  if (likeCounts.size === 0 && voteCounts.size === 0) return page;

  return {
    ...page,
    items: page.items.map((item) => {
      const like = likeCounts.get(item.id);
      const votes = item.debate ? voteCounts.get(item.debate.id) : undefined;
      if (!like && !votes) return item;
      return {
        ...item,
        ...(like && { likeCount: like.likeCount }),
        ...(votes &&
          item.debate && { debate: { ...item.debate, ...votes.counts } }),
      };
    }),
  };
}

/** 기억을 모두 지운다. 테스트가 서로 섞이지 않게 쓴다 */
export function clearRecentFeedEdits(): void {
  likeCounts.clear();
  voteCounts.clear();
}
