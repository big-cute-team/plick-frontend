/**
 * @file 내 기사 상태 캐시에 쓰기 (KAN-664, KAN-748). 누른 직후의 값을 캐시와 기억에 적고,
 * 그 값이 먼저 나가 있던 조회 응답에 덮이지 않게 지킨다.
 *
 * 내 상태는 페이지가 뜬 직후 한 번 묻는다. 그 응답이 오기 전에 누르면 응답에는 누르기 전
 * 상태가 담겨 있고, 늦게 도착해 방금 누른 값을 덮는다. 하트가 찼다가 빠지고, 액션이 먼저
 * 끝난 경우에는 빈 채로 남는다(KAN-748). 그래서 방금 누른 필드를 잠깐 따로 적어 두고
 * (`recent`), 조회 응답이 캐시에 들어가기 전에 그 필드만 덮어쓴다. 조회를 취소하는 방법은
 * 누르지 않은 쪽 필드(좋아요만 눌렀을 때의 투표)를 잃어서 쓰지 않았다.
 *
 * 조회 함수(`article-states.ts`)는 `client.ts`를 물어 node 단위 테스트에서 못 부른다. 여기는
 * 물지 않아 실제 QueryClient로 검증한다(`tests/unit/article-state-cache.test.mjs`).
 */

import type { QueryClient } from "@tanstack/react-query";
import type { ArticleState } from "@plick/domain/types";
import { DEFAULT_ARTICLE_STATE } from "./article-state-batch";
import {
  readArticleStateMemo,
  writeArticleStateMemo,
} from "./article-state-memo";
import { articleStateKeys } from "./articleStateKeys";

/**
 * 방금 누른 값이 조회 응답을 이기는 시간. 이보다 먼저 누른 값은 응답이 맞다고 본다.
 *
 * 누른 뒤에 출발한 조회라도 액션이 BE에 닿기 전이면 옛 상태를 받아 온다. 액션 한 번은 게스트
 * 발급과 503 재시도(1초)를 합쳐도 이 안에 끝난다. 길게 잡지 않는 건 다른 기기에서 바꾼 값을
 * 이 탭의 옛 기록이 계속 덮지 않게 하려는 것이다.
 */
export const RECENT_EDIT_MS = 30_000;

/**
 * 기사 id별로 방금 누른 필드와 누른 시각. 모듈 전역이지만 쓰는 쪽(뮤테이션 콜백)과 읽는 쪽
 * (세션이 켜진 뒤의 조회)이 모두 브라우저에서만 돌아, 서버 프로세스에서는 늘 비어 있다.
 */
const recent = new Map<string, { patch: Partial<ArticleState>; at: number }>();

/**
 * 누른 직후 내 상태를 캐시와 기억에 적는다. 낙관적 갱신과 서버 확정, 롤백이 모두 이 함수다.
 *
 * 캐시가 비어 있어도 적는다. 조회가 아직 안 끝났거나(페이지를 연 직후) 세션이 없어 조회가
 * 꺼져 있는(처음 온 사람) 때다. 이때는 이 브라우저의 기억, 없으면 "안 누름" 위에 덮는다.
 * 누르지 않은 쪽 필드는 모르는 값이라 엔트리를 무효로 표시해 둔다. 진행 중인 조회는 그대로
 * 끝나 {@link loadMyArticleState}가 서버 값과 합치고, 조회가 없었다면 그 기사가 다음에
 * 화면에 뜰 때 다시 묻는다. KAN-664가 빈 캐시에 쓰지 않았던 이유(모르는 필드를 "안 함"으로
 * 굳힘)를 이 표시로 막는다.
 *
 * @param queryClient 앱의 QueryClient
 * @param articleId 기사 id
 * @param patch 바뀐 필드
 */
export function setMyArticleState(
  queryClient: QueryClient,
  articleId: string,
  patch: Partial<ArticleState>,
): void {
  recent.set(articleId, {
    patch: { ...recent.get(articleId)?.patch, ...patch },
    at: Date.now(),
  });

  const key = articleStateKeys.byId(articleId);
  const known = queryClient.getQueryData<ArticleState>(key);
  queryClient.setQueryData<ArticleState>(key, {
    ...(known ?? readArticleStateMemo(articleId) ?? DEFAULT_ARTICLE_STATE),
    ...patch,
  });
  writeArticleStateMemo(articleId, patch);
  if (!known) {
    void queryClient.invalidateQueries({ queryKey: key, refetchType: "none" });
  }
}

/**
 * 기사 하나의 내 상태를 받아 방금 누른 필드를 덮어 돌려준다. `useMyArticleState`의 queryFn이다.
 *
 * 응답에는 조회가 BE에 닿은 시점의 상태가 담긴다. 조회가 출발하기 {@link RECENT_EDIT_MS} 전
 * 이후에 누른 필드는 응답보다 새 값이라 그 필드만 덮는다. 그보다 오래된 기록은 응답이 맞으니
 * 버린다. 기억도 합친 값으로 맞춘다.
 *
 * @param loader 단건 조회를 묶어 보내는 로더(`createArticleStateLoader`)
 * @param articleId 기사 id
 */
export async function loadMyArticleState(
  loader: { load: (articleId: string) => Promise<ArticleState> },
  articleId: string,
): Promise<ArticleState> {
  const startedAt = Date.now();
  const server = await loader.load(articleId);

  const edit = recent.get(articleId);
  const fresh = edit !== undefined && edit.at >= startedAt - RECENT_EDIT_MS;
  if (edit && !fresh) recent.delete(articleId);

  const state = fresh ? { ...server, ...edit.patch } : server;
  writeArticleStateMemo(articleId, state);
  return state;
}

/**
 * 롤백한 필드를 서버에 다시 묻는다. 뮤테이션이 실패해 누르기 전 값으로 되돌린 뒤에 부른다.
 *
 * 되돌린 값은 누를 때 화면이 보여 주던 값이다. 조회가 끝나기 전에 눌렀다면 그 값은 기억이나
 * 기본값이라 서버와 다를 수 있다. 그 필드의 방금 누른 기록을 지우고 다시 받아 서버 값으로
 * 맞춘다. 세션이 없으면 조회가 꺼져 있어 요청은 나가지 않는다.
 *
 * @param queryClient 앱의 QueryClient
 * @param articleId 기사 id
 * @param fields 되돌린 필드
 */
export function refreshMyArticleState(
  queryClient: QueryClient,
  articleId: string,
  fields: readonly (keyof ArticleState)[],
): void {
  const edit = recent.get(articleId);
  if (edit) {
    const patch = { ...edit.patch };
    for (const field of fields) delete patch[field];
    if (Object.keys(patch).length === 0) recent.delete(articleId);
    else recent.set(articleId, { ...edit, patch });
  }
  void queryClient.invalidateQueries({
    queryKey: articleStateKeys.byId(articleId),
  });
}

/**
 * 방금 누른 기록을 모두 지운다. 세션이 바뀌었거나(남의 기록이 된다) bfcache에서 복원돼 내
 * 상태를 통째로 다시 물을 때(떠나 있던 사이 다른 기기에서 바꿨을 수 있다) 부른다.
 */
export function clearRecentArticleStateEdits(): void {
  recent.clear();
}
