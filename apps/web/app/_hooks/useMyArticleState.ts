"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createArticleStateLoader,
  DEFAULT_ARTICLE_STATE,
} from "@plick/core/article-state-batch";
import { loadMyArticleState } from "@plick/core/article-state-cache";
import { readArticleStateMemo } from "@plick/core/article-state-memo";
import { getArticleStates } from "@plick/core/article-states";
import { articleStateKeys } from "@plick/core/articleStateKeys";
import type { ArticleState } from "@plick/domain/types";
import { useAuth } from "@/_components/AuthProvider";
import { useHydrated } from "@/_hooks/useHydrated";

/** 앱 전체가 나눠 쓰는 로더. 한 렌더에서 뜬 카드들의 조회가 여기서 한 번으로 묶인다. */
const loader = createArticleStateLoader(getArticleStates);

/** 세션 동안 다시 묻지 않는 시간. 바뀌는 건 내가 누를 때뿐이고 그건 캐시에 바로 적는다. */
const MY_STATE_GC_MS = 30 * 60 * 1000;

/**
 * 기사 하나에 대한 내 상태(좋아요·투표 여부)를 읽는다 (KAN-667, 모바일 KAN-664 이식).
 * 로더·기억·키는 `@plick/core`가 공용이고, `useAuth`에 묶이는 이 훅만 앱마다 둔다.
 *
 * 기사·릴스·투표 화면은 익명으로 받아 ISR로 캐시한다. 그 응답의 `liked`·`myVote`는 늘 "안 누름"
 * 이라 화면은 이 훅의 값을 그린다. 카드마다 이 훅을 불러도 요청은 한 번이다. 같은 순간에 뜬 카드의
 * 조회를 로더가 묶어 `GET /users/me/article-states?ids=…` 하나로 보낸다.
 *
 * 그리는 순서는 이렇다.
 * 1. 서버 HTML과 하이드레이션 첫 패스는 "안 누름"이다. 세션을 모르는 상태라 서버와 같아야 한다.
 * 2. `AuthProvider`가 첫 프레임 전에 세션을 읽으면 조회가 켜지고, 응답 전까지는 이 브라우저에
 *    적어 둔 "내가 누른 기사" 기억으로 먼저 채운다(`placeholderData`).
 * 3. 응답이 오면 그 값으로 바꾸고 기억도 맞춘다. 응답을 기다리는 사이에 누른 필드는 응답이
 *    덮지 않는다(`loadMyArticleState`, KAN-748).
 *
 * 다시 묻는 건 bfcache 복원과 세션 변경 때뿐이다(`AuthProvider`). 누른 직후는 묻지 않고
 * `setMyArticleState`로 캐시에 바로 적는다. 실패하면 "안 누름"으로 두고 재시도하지 않는다.
 * 하트가 비어 보이는 게 전부라 화면을 막을 이유가 없다. 웹 `QueryProvider`는 모바일과 달리
 * 실패를 에러 경계로 던지지 않아 `throwOnError`를 따로 끄지 않는다.
 *
 * 세션이 없어도 캐시에 값이 있으면 그 값을 그린다 (KAN-748). 처음 온 사람이 게스트 발급 전에
 * 누르면 낙관적 값이 캐시에 먼저 들어가는데, 예전에는 세션이 생길 때까지 "안 누름"을 돌려줘
 * 하트가 발급과 응답이 다 끝난 뒤에야 찼다. 서버 HTML과 맞춰야 하는 건 하이드레이션 첫 패스
 * 뿐이라 그때만 "안 누름"으로 고정한다(`useHydrated`). 브라우저 기억은 세션이 있을 때만
 * 읽으므로 세션이 없는 동안 남의 기록이 그려지지 않는다.
 *
 * @param articleId 기사(릴) id
 * @returns 내 상태. 하이드레이션 첫 패스이거나 아는 값이 없으면 "안 누름"
 */
export function useMyArticleState(articleId: string): ArticleState {
  const { isLoggedIn } = useAuth();
  const hydrated = useHydrated();
  const { data } = useQuery({
    queryKey: articleStateKeys.byId(articleId),
    queryFn: () => loadMyArticleState(loader, articleId),
    enabled: isLoggedIn,
    staleTime: Infinity,
    gcTime: MY_STATE_GC_MS,
    /* 기억은 세션이 있을 때만 먼저 채운다. 세션이 없는 동안 그릴 값은 낙관적으로 적어 둔 캐시뿐이다 */
    placeholderData: isLoggedIn
      ? () => readArticleStateMemo(articleId)
      : undefined,
    retry: false,
  });

  return hydrated ? (data ?? DEFAULT_ARTICLE_STATE) : DEFAULT_ARTICLE_STATE;
}
