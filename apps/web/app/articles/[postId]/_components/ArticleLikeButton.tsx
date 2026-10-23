"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncLikeIntoFeeds } from "@plick/core/like-sync";
import { formatCount } from "@plick/domain/format";
import type { LikeState } from "@plick/domain/types";
import { HeartMiniIcon } from "@plick/ui/icons";
import { LoginPromptDialog } from "@/_components/LoginPromptDialog";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { useArticleLike } from "@/_hooks/useArticleLike";
import { useMyArticleState } from "@/_hooks/useMyArticleState";

/**
 * 기사 세부 좋아요 버튼 (KAN-308, web 이식 KAN-330, 시안 KAN-567) — 액션 줄의 하트
 * 17px과 수 14/700. 눌렸으면 빨강, 아니면 보조색이고 hover에 빨강이다. 알약
 * 테두리 버튼이었는데 시안이 테두리 없는 텍스트 버튼이라 걷었다.
 *
 * 서버 컴포넌트인 `ArticleMain`에서 이 버튼만 클라 경계로 떼어 냈다 — 본문
 * 전체를 클라로 내리면 문단·관련 기사까지 번들에 실린다.
 *
 * 좋아요 수는 여기 state로 든다. 기사 상세엔 클라 캐시가 없고 서버가 준 props가
 * 원본이라, 낙관적 갱신은 이 state를 고치는 게 곧 화면을 고치는 것이다. 눌렀는가는
 * 다르다. 페이지가 익명 ISR이라 props의 값은 늘 "안 누름"이고, 내 상태 캐시
 * (`useMyArticleState`, KAN-667)가 원본이다. 누르면 `syncLikeIntoFeeds`가 그 캐시를 고친다.
 *
 * 같은 값을 캐시된 피드 목록에도 옮겨 적는다 (KAN-379) — 여기서 누르고 목록으로
 * 돌아가면 목록이 누르기 전 숫자를 그대로 보여주던 걸 맞춘다.
 *
 * @param articleId 기사 id
 * @param initialCount 서버가 내려준 좋아요 수(익명 캐시라 ISR 주기만큼 늦을 수 있다)
 */
export function ArticleLikeButton({
  articleId,
  initialCount,
}: {
  articleId: string;
  initialCount: number;
}) {
  const [likeCount, setLikeCount] = useState(initialCount);
  const { liked } = useMyArticleState(articleId);
  const state: LikeState = { liked, likeCount };
  const queryClient = useQueryClient();
  const like = useArticleLike({
    articleId,
    state,
    onChange: (next) => {
      setLikeCount(next.likeCount);
      syncLikeIntoFeeds(queryClient, articleId, next);
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={like.toggle}
        aria-pressed={state.liked}
        /* 이름에 보이는 수를 담는다. 눌린 상태는 aria-pressed가 읽는다 (KAN-670) */
        aria-label={`좋아요 ${formatCount(state.likeCount)}`}
        className={`text-body-md focus-visible:outline-accent inline-flex items-center gap-1.5 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 ${
          state.liked
            ? "text-danger-strong"
            : "text-text-3 hover:text-danger-strong"
        }`}
      >
        <HeartMiniIcon size={17} filled={state.liked} />
        {formatCount(state.likeCount)}
      </button>

      {like.needsLogin && (
        <LoginPromptDialog
          onClose={like.dismissLogin}
          description={LIKE_LOGIN_PROMPT}
        />
      )}
    </>
  );
}
