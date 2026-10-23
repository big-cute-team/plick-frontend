"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createArticleStateLoader,
  DEFAULT_ARTICLE_STATE,
} from "@plick/core/article-state-batch";
import {
  readArticleStateMemo,
  writeArticleStateMemo,
} from "@plick/core/article-state-memo";
import { getArticleStates } from "@plick/core/article-states";
import { articleStateKeys } from "@plick/core/articleStateKeys";
import type { ArticleState } from "@plick/domain/types";
import { useAuth } from "@/_components/AuthProvider";

/** 앱 전체가 나눠 쓰는 로더. 한 렌더에서 뜬 카드들의 조회가 여기서 한 번으로 묶인다. */
const loader = createArticleStateLoader(getArticleStates);

/** 세션 동안 다시 묻지 않는 시간. 바뀌는 건 내가 누를 때뿐이고 그건 캐시에 바로 적는다. */
const MY_STATE_GC_MS = 30 * 60 * 1000;

/**
 * 기사 하나에 대한 내 상태(좋아요·투표 여부)를 읽는다 (KAN-664).
 *
 * 기사·릴스·투표 화면은 익명으로 받아 ISR로 캐시한다. 그 응답의 `liked`·`myVote`는 늘 "안 누름"
 * 이라 화면은 이 훅의 값을 그린다. 카드마다 이 훅을 불러도 요청은 한 번이다. 같은 순간에 뜬 카드의
 * 조회를 로더가 묶어 `GET /users/me/article-states?ids=…` 하나로 보낸다.
 *
 * 그리는 순서는 이렇다.
 * 1. 서버 HTML과 하이드레이션 첫 패스는 "안 누름"이다. 세션을 모르는 상태라 서버와 같아야 한다.
 * 2. `AuthProvider`가 첫 프레임 전에 세션을 읽으면 조회가 켜지고, 응답 전까지는 이 브라우저에
 *    적어 둔 "내가 누른 기사" 기억으로 먼저 채운다(`placeholderData`).
 * 3. 응답이 오면 그 값으로 바꾸고 기억도 맞춘다.
 *
 * 다시 묻는 건 bfcache 복원과 세션 변경 때뿐이다(`AuthProvider`). 누른 직후는 묻지 않고
 * `setMyArticleState`로 캐시에 바로 적는다. 실패하면 "안 누름"으로 두고 재시도하지 않는다.
 * 하트가 비어 보이는 게 전부라 화면을 막을 이유가 없다.
 *
 * @param articleId 기사(릴) id
 * @returns 내 상태. 세션이 없거나 아직 모르면 "안 누름"
 */
export function useMyArticleState(articleId: string): ArticleState {
  const { isLoggedIn } = useAuth();
  const { data } = useQuery({
    queryKey: articleStateKeys.byId(articleId),
    queryFn: async () => {
      const state = await loader.load(articleId);
      writeArticleStateMemo(articleId, state);
      return state;
    },
    enabled: isLoggedIn,
    staleTime: Infinity,
    gcTime: MY_STATE_GC_MS,
    placeholderData: () => readArticleStateMemo(articleId),
    retry: false,
    /* 앱 기본값은 데이터 없는 실패를 에러 경계로 던진다(QueryProvider). 하트 하나 때문에 기사 화면 전체가
       "문제가 생겼어요"로 바뀌면 안 되므로 여기서는 끈다 (KAN-665에서 발견) */
    throwOnError: false,
  });

  return isLoggedIn ? (data ?? DEFAULT_ARTICLE_STATE) : DEFAULT_ARTICLE_STATE;
}
