"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { syncLikeIntoFeeds } from "@plick/core/like-sync";
import { TEAMS } from "@plick/domain/constants";
import { formatRelativeTime } from "@plick/domain/format";
import type { ArticleCard } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { VsMark } from "@plick/ui/VsMark";
import { LoginPromptDialog } from "@/_components/LoginPromptDialog";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { useArticleLike } from "@/_hooks/useArticleLike";

/**
 * 좋아요한 기사 한 줄 (KAN-567 시안 MY 634-651행) — 표 한 행
 * (`40px 1fr 128px 54px 46px`): 엠블럼 20, VS + 제목 13.5/700 + 댓글 수 빨강, 기자
 * 12, 시각, 그리고 "해제". 제목을 누르면 기사로 간다.
 *
 * 해제는 좋아요 토글 훅(`useArticleLike`)으로 끈다. 원본은 활동 목록 캐시라
 * `syncLikeIntoFeeds`로 되돌려 쓴다. 목록은 `liked`가 false인 카드를 그리지 않으므로
 * 눌리는 즉시 줄이 빠지고, 실패하면 훅이 되돌려 다시 나타난다. 대표 팀은 기사의
 * 첫 팀이다.
 *
 * @param article 좋아요한 기사 카드
 */
export function LikedArticleRow({ article }: { article: ArticleCard }) {
  const queryClient = useQueryClient();
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  const like = useArticleLike({
    articleId: article.id,
    state: { liked: article.liked, likeCount: article.likeCount },
    onChange: (next) => syncLikeIntoFeeds(queryClient, article.id, next),
  });

  return (
    <div className="border-border-soft hover:bg-elevate-2 grid min-h-9.5 grid-cols-[40px_minmax(0,1fr)_54px_46px] items-center border-b py-1.75 transition-colors lg:grid-cols-[40px_minmax(0,1fr)_128px_54px_46px]">
      <span className="flex justify-center">
        {team && <TeamCrest team={team} size={20} />}
      </span>
      <Link
        href={`/articles/${article.id}`}
        className="focus-visible:outline-accent flex min-w-0 items-center gap-1.75 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {article.contentType === "DEBATE" && <VsMark size="md" />}
        <span className="text-body text-text-strong hover:text-accent truncate font-bold">
          {article.title}
        </span>
        {article.commentCount > 0 && (
          <span className="text-label-lg text-danger shrink-0 font-black">
            [{article.commentCount}]
          </span>
        )}
      </Link>
      <span className="text-label text-text-3 hidden truncate lg:block">
        {article.reporter?.name}
      </span>
      <span
        className="text-label text-text-3 text-center"
        suppressHydrationWarning
      >
        {formatRelativeTime(article.publishedAt)}
      </span>
      <button
        type="button"
        onClick={like.toggle}
        disabled={like.isPending}
        className="text-caption-lg text-text-3 hover:text-danger focus-visible:outline-accent text-right focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
      >
        해제
      </button>

      {like.needsLogin && (
        <LoginPromptDialog
          onClose={like.dismissLogin}
          description={LIKE_LOGIN_PROMPT}
        />
      )}
    </div>
  );
}
