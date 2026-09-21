"use client";

import { useEffect, useRef } from "react";
import { recordArticleView, takeFeedRank } from "@plick/core/article-views";

/**
 * 기사·릴을 봤다고 서버에 기록한다 (KAN-310). 렌더에 관여하지 않는 부수효과 전용 훅이다.
 *
 * 비로그인이어도 부른다 (KAN-543, BE KAN-538). 서버가 토큰 없는 호출을 기록 없이
 * 분석 이벤트(`article_opened`)로만 남기게 바뀌어, 로그인 여부를 볼 이유가 없어졌다.
 *
 * 세션 안 같은 기사 중복도 거르지 않는다 (KAN-543). 전에는 모듈 Set으로 기사당 한 번만
 * 보냈는데, 그러면 같은 기사를 다시 열어도 열람 이벤트가 한 건이라 건별 열람을 못 센다.
 * 조회수는 서버가 하루 한 번으로 접으니 부풀지 않는다. 대신 한 번의 활성 구간 안에서는
 * 한 번만 보낸다 — 릴이 활성인 채로 리렌더되거나 StrictMode가 이펙트를 되감아도 같은
 * 요청이 반복되지 않게, 마지막으로 보낸 id를 ref로 들고 활성이 풀리면 지운다.
 *
 * 실패해도 조용히 삼킨다. 조회 기록은 화면이 아니라 통계를 위한 것이라, 실패했다고
 * 사용자에게 보여줄 것도 되돌릴 것도 없다. 원인은 콘솔에만 남긴다.
 *
 * 카운트를 화면에서 즉시 올리지는 않는다. 응답이 갱신된 조회수를 안 주는 데다,
 * 하루 1회 제약 때문에 이번 호출이 실제로 셌는지 아닌지를 FE가 알 수 없다.
 * 오늘 두 번째로 들어온 사람에게 +1을 보여주면 새로고침에서 도로 내려간다.
 *
 * @param articleId 기사(릴) id
 * @param active 지금 보고 있는가. 릴스는 활성 슬라이드가 될 때만 true로 넘긴다.
 *   기사 세부처럼 화면 자체가 곧 조회인 곳은 기본값(true)을 쓴다
 * @param rank 피드 안 순위(0부터). 릴스는 슬라이드 인덱스를 넘기고, 기사 세부는 생략하면
 *   목록 링크가 기억해 둔 순위(`rememberFeedRank`)를 꺼내 쓴다
 */
export function useArticleView(
  articleId: string,
  active = true,
  rank?: number,
) {
  const sentFor = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      sentFor.current = null;
      return;
    }
    if (sentFor.current === articleId) return;
    sentFor.current = articleId;
    const feedRank = rank ?? takeFeedRank(articleId);
    recordArticleView(articleId, feedRank).catch((e) => {
      console.error("[views] 조회 기록 실패:", e);
    });
  }, [articleId, active, rank]);
}
