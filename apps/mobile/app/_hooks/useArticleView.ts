"use client";

import { useEffect } from "react";
import { recordArticleView } from "@plick/core/article-views";
import { useAuth } from "@/_components/AuthProvider";

/**
 * 이번 브라우저 세션에서 이미 조회를 보낸 기사 id.
 *
 * 모듈 수준에 두는 이유는 릴스 때문이다. 릴은 앞뒤로 넘길 때마다 같은 슬라이드가
 * 다시 활성이 되고, 기사 세부도 뒤로 갔다 다시 들어올 수 있다. 컴포넌트 안에
 * 두면 그때마다 초기화돼 같은 요청이 반복해서 나간다. 하드 리로드하면 사라지는데,
 * 그게 곧 "이번 세션"의 정의라 의도한 수명이다.
 *
 * 서버가 어차피 하루 1회로 막으므로 이건 정합성이 아니라 낭비 방지용이다.
 */
const recorded = new Set<string>();

/**
 * 기사·릴을 봤다고 서버에 기록한다 (KAN-310). 렌더에 관여하지 않는 부수효과 전용 훅이다.
 *
 * 비로그인이면 아무것도 하지 않는다 — 보호 API라 401만 쌓이고 익명 조회수도 없다.
 * 로그인 여부는 서버가 심어 준 `AuthProvider`로 읽는다(쿠키가 HttpOnly라 클라가
 * 직접 못 본다).
 *
 * 실패해도 조용히 삼킨다. 조회 기록은 화면이 아니라 통계를 위한 것이라, 실패했다고
 * 사용자에게 보여줄 것도 되돌릴 것도 없다. 원인은 콘솔에만 남긴다. 실패한 id도
 * 보낸 것으로 쳐서 다시 시도하지 않는다 — 404(미발행 기사)처럼 계속 실패할 요청을
 * 릴을 넘길 때마다 반복하느니 조회 한 건을 잃는 편이 낫다.
 *
 * 카운트를 화면에서 즉시 올리지는 않는다. 응답이 갱신된 조회수를 안 주는 데다,
 * 하루 1회 제약 때문에 이번 호출이 실제로 셌는지 아닌지를 FE가 알 수 없다.
 * 오늘 두 번째로 들어온 사람에게 +1을 보여주면 새로고침에서 도로 내려간다.
 *
 * @param articleId 기사(릴) id
 * @param active 지금 보고 있는가. 릴스는 활성 슬라이드가 될 때만 true로 넘긴다.
 *   기사 세부처럼 화면 자체가 곧 조회인 곳은 기본값(true)을 쓴다
 */
export function useArticleView(articleId: string, active = true) {
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn || !active || recorded.has(articleId)) return;
    /* 응답을 기다리지 않고 먼저 찍는다 — 기다리면 StrictMode의 이펙트 두 번 실행이나
       빠른 재활성이 같은 요청을 두 번 내보낸다 */
    recorded.add(articleId);
    recordArticleView(articleId).catch((e) => {
      console.error("[views] 조회 기록 실패:", e);
    });
  }, [articleId, active, isLoggedIn]);
}
