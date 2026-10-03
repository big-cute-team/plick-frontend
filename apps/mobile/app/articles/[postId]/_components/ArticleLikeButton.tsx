"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncLikeIntoFeeds } from "@plick/core/like-sync";
import { formatCount } from "@plick/domain/format";
import type { LikeState } from "@plick/domain/types";
import { LikeIcon } from "@plick/ui/icons";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { useArticleLike } from "@/_hooks/useArticleLike";

/**
 * LoginPromptDialog는 탭해야 뜨는 조건부 UI라 초기 번들에서 뺀다 (KAN-428).
 */
const LoginPromptDialog = dynamic(
  () =>
    import("@/_components/LoginPromptDialog").then((m) => m.LoginPromptDialog),
  { ssr: false },
);

/**
 * 기사 세부 좋아요 버튼 (KAN-308). 본문 밑 액션 줄의 하트(18px) + 수(13.5/700).
 * 시안(KAN-567)대로 테두리 없는 텍스트 버튼이고, 누르면 하트와 숫자가 빨강으로
 * 찬다(빨강은 하트·댓글 수 같은 신호에만 쓰는 시안 규칙). 기본은 text-2다.
 *
 * 서버 컴포넌트인 `ArticleBody`에서 이 버튼만 클라 경계로 떼어 냈다 — 본문
 * 전체를 클라로 내리면 문단·관련 기사까지 번들에 실린다.
 *
 * 상태를 여기 state로 든다. 릴스와 달리 기사 상세엔 클라 캐시가 없고 서버가 준
 * props가 원본이라, 낙관적 갱신은 이 state를 고치는 게 곧 화면을 고치는 것이다.
 * 다시 들어오면 서버가 새로 받은 값으로 다시 시작한다.
 *
 * 같은 값을 캐시된 피드 목록에도 옮겨 적는다 (KAN-379) — 여기서 누르고 홈으로
 * 돌아가면 목록이 누르기 전 숫자를 그대로 보여주던 걸 맞춘다.
 *
 * @param articleId 기사 id
 * @param initial 서버가 내려준 최초 좋아요 상태(`likedByMe`·`likeCount`)
 */
export function ArticleLikeButton({
  articleId,
  initial,
}: {
  articleId: string;
  initial: LikeState;
}) {
  const [state, setState] = useState<LikeState>(initial);
  const queryClient = useQueryClient();
  const like = useArticleLike({
    articleId,
    state,
    onChange: (next) => {
      setState(next);
      syncLikeIntoFeeds(queryClient, articleId, next);
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={like.toggle}
        aria-pressed={state.liked}
        aria-label={state.liked ? "좋아요 취소" : "좋아요"}
        className={`${
          state.liked ? "text-danger" : "text-text-2"
        } text-body flex items-center gap-1.5 font-bold active:opacity-60`}
      >
        <LikeIcon size={18} filled={state.liked} />
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
