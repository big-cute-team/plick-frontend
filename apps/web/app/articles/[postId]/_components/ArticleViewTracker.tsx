"use client";

import { useArticleView } from "@/_hooks/useArticleView";

/**
 * 기사 세부 진입을 조회로 기록한다 (모바일 `ArticleViewTracker` 복제, KAN-332).
 * 그리는 것은 없다.
 *
 * 페이지가 서버 컴포넌트라 훅을 직접 못 부른다. 그렇다고 세부 화면 전체를 클라로
 * 내릴 이유는 없어서, 부수효과만 담은 이 얇은 클라 경계를 하나 세운다.
 *
 * 서버 렌더 중에 부르지 않는 이유는 하나 더 있다. 조회 기록은 POST이고, 서버
 * 컴포넌트 렌더는 사용자가 실제로 본 순간과 정확히 겹치지 않는다 — Next가 링크를
 * prefetch하면서 미리 그릴 수 있어서, 목록에 스쳐 지나간 기사가 조회로 잡힐 수 있다.
 * 이펙트는 브라우저에 실제로 마운트된 뒤에만 돈다.
 *
 * @param articleId 이 페이지가 보여주는 기사 id
 */
export function ArticleViewTracker({ articleId }: { articleId: string }) {
  useArticleView(articleId);
  return null;
}
