"use client";

import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { syncLikeIntoFeeds } from "@plick/core/like-sync";
import type { ArticleCard } from "@plick/domain/types";
import { HeartMiniIcon } from "@plick/ui/icons";
import { NewsItem } from "@/_components/NewsItem";
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
 * 좋아요 탭의 한 행 (KAN-567, 시안 MY 좋아요 탭). 홈 리스트 행(`NewsItem`)
 * 오른쪽에 44px 빨간 하트 버튼을 붙였고 누르면 좋아요가 풀린다.
 *
 * 좋아요 상태의 원본은 활동 캐시(`activityKeys.likes()`)다. 훅이 되돌려주는 새
 * 값을 `syncLikeIntoFeeds`로 흘리면 이 캐시와 기사·릴스 피드 캐시가 함께 맞고,
 * 목록(`LikedArticlesList`)은 `liked`가 꺼진 행을 걸러 그리므로 행이 그 자리에서
 * 빠진다. 실패하면 훅이 직전 값으로 되돌려 행이 되살아난다. 개수 무효화도 같은
 * 함수가 한다.
 *
 * 행의 왼쪽(`NewsItem`)은 기사로 가는 링크라 하트는 그 밖에 형제로 둔다. 아래
 * 선은 행과 버튼이 각자 그어 한 줄로 이어진다.
 *
 * @param article 좋아요한 기사 카드
 */
export function LikedArticleItem({ article }: { article: ArticleCard }) {
  const queryClient = useQueryClient();
  const { toggle, isPending, needsLogin, dismissLogin } = useArticleLike({
    articleId: article.id,
    state: { liked: article.liked, likeCount: article.likeCount },
    onChange: (next) => syncLikeIntoFeeds(queryClient, article.id, next),
  });

  return (
    <div className="flex items-stretch">
      <div className="min-w-0 flex-1">
        <NewsItem article={article} />
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-label="좋아요 해제"
        className="border-border-soft text-danger flex w-11 shrink-0 items-center justify-center border-b active:opacity-60 disabled:opacity-50"
      >
        <HeartMiniIcon filled size={20} />
      </button>
      {needsLogin && (
        <LoginPromptDialog
          onClose={dismissLogin}
          description="좋아요는 로그인한 사용자만 할 수 있어요."
        />
      )}
    </div>
  );
}
