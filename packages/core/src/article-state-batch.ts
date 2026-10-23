/**
 * @file 내 기사 상태 조회의 순수한 부분 (KAN-664). id 나누기와 단건 조회를 묶는 로더.
 *
 * 조회 함수(`article-states.ts`)는 `client.ts`를 물어 node 단위 테스트에서 못 부른다. 그래서
 * 네트워크 없이 검증할 수 있는 이 둘을 떼어 둔다(`tests/unit/article-states.test.mjs`).
 */

import type { ArticleState } from "@plick/domain/types";

/** BE가 한 번에 받는 id 수 상한 (KAN-663). 넘으면 400이다. */
export const ARTICLE_STATES_MAX_IDS = 60;

/** 응답에 없거나 묻지 않은 기사의 상태. "안 누름"이다. */
export const DEFAULT_ARTICLE_STATE: ArticleState = {
  liked: false,
  vote: null,
};

/**
 * 중복과 BE가 400으로 거절할 id(숫자가 아니거나 0 이하)를 걸러 상한 단위로 나눈다.
 *
 * @param ids 기사 id 목록. 순서를 지킨다
 * @param size 한 묶음의 크기
 */
export function chunkArticleIds(
  ids: readonly string[],
  size = ARTICLE_STATES_MAX_IDS,
): string[][] {
  const valid = [...new Set(ids)].filter(
    (id) => /^\d+$/.test(id) && Number(id) > 0,
  );
  const chunks: string[][] = [];
  for (let i = 0; i < valid.length; i += size) {
    chunks.push(valid.slice(i, i + size));
  }
  return chunks;
}

/**
 * 같은 순간에 들어온 단건 조회를 모아 한 번에 보내는 로더를 만든다.
 *
 * 카드가 각자 `load(id)`를 불러도 다음 매크로태스크(`setTimeout 0`)까지 모인 id는 한 번의
 * {@link getArticleStates}로 나간다. 한 렌더에서 마운트된 카드들의 쿼리는 모두 이 창 안에
 * 시작된다.
 *
 * @param fetchStates 실제 조회 함수(앱은 `getArticleStates`, 테스트는 가짜)
 */
export function createArticleStateLoader(
  fetchStates: (ids: readonly string[]) => Promise<Map<string, ArticleState>>,
) {
  type Waiter = {
    resolve: (state: ArticleState) => void;
    reject: (error: unknown) => void;
  };
  let pending = new Map<string, Waiter[]>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    const batch = pending;
    pending = new Map();
    timer = null;
    fetchStates([...batch.keys()]).then(
      (states) => {
        for (const [id, waiters] of batch) {
          const state = states.get(id) ?? DEFAULT_ARTICLE_STATE;
          for (const w of waiters) w.resolve(state);
        }
      },
      (error) => {
        for (const waiters of batch.values()) {
          for (const w of waiters) w.reject(error);
        }
      },
    );
  }

  return {
    /** 기사 하나의 내 상태. 같은 창의 다른 요청과 묶여 나간다 */
    load(articleId: string): Promise<ArticleState> {
      return new Promise((resolve, reject) => {
        const waiters = pending.get(articleId) ?? [];
        waiters.push({ resolve, reject });
        pending.set(articleId, waiters);
        timer ??= setTimeout(flush, 0);
      });
    },
  };
}
