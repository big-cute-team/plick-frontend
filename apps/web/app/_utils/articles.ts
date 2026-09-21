/**
 * @file 기사 목록 쿼리 헬퍼 (KAN-523).
 */

import { articleKeys } from "@plick/core/articleKeys";
import type { ArticleScope } from "@/_types/articles";

/**
 * 범위(인물·이슈)의 쿼리키. 목록 훅과, 커서 400에서 첫 페이지부터 다시 받는
 * 복구가 같은 키를 봐야 해서 한 곳에서 만든다.
 *
 * @param scope 무엇으로 거를지
 * @example
 * scopedArticlesKey({ kind: "story", id: "50" }); // ["articles", "story", "50"]
 */
export function scopedArticlesKey(scope: ArticleScope) {
  return scope.kind === "figure"
    ? articleKeys.figureFeed(scope.id)
    : articleKeys.storyFeed(scope.id);
}
