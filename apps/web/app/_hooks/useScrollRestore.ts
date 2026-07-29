"use client";

import { useLayoutEffect } from "react";
import { useViewState } from "@/_stores/view-state";
import type { PostListVariant } from "@/_types/app";

/**
 * 피드 화면이 떠났다 돌아와도 보던 자리를 되돌려 준다 (KAN-321, 모바일
 * `useScrollRestore` KAN-314와 같은 판단을 문서 스크롤러에 옮긴 것).
 *
 * GNB로 다른 페이지에 갔다 링크로 돌아오는 건 뒤로가기(popstate)가 아니라 새
 * push 내비게이션이라 브라우저도 Next도 스크롤을 복원해 주지 않는다(항상 맨
 * 위다). 목록 데이터는 쿼리 캐시가 들고 있어 그대로 살아나는데 위치만 잃는
 * 게 어색하므로, 문서 `scrollY`를 스토어에 적어 두고 직접 되돌린다.
 *
 * 되돌리기는 세 번 시도한다. 모바일과 달리 문서 스크롤러는 Next도 만지기
 * 때문이다 — Next는 push 내비게이션 커밋의 부모 레이아웃 이펙트에서 새 페이지를
 * 맨 위로 올리는데, 이 훅의 레이아웃 이펙트는 자식이라 그보다 먼저 돌아서 즉시
 * 복원만 하면 도로 덮인다. 그래서 커밋이 끝난 직후이자 페인트 전인
 * 마이크로태스크에서 한 번 더 되돌리고(화면은 처음부터 그 자리였던 것처럼
 * 보인다), 다음 프레임에 마지막으로 한 번 더 시도해 늦게 자리 잡는 콘텐츠로
 * 문서가 자라는 경우를 잡는다. 캐시가 정리돼 목록이 첫 페이지로 짧아졌으면
 * 브라우저가 끝까지만 내려 준다.
 *
 * 마운트 동안 `history.scrollRestoration`을 `manual`로 눌러 둔다. 브라우저
 * 기본(auto)은 새로고침 때 이전 위치를 되살리려 드는데, 새로고침 후 목록은 첫
 * 페이지뿐이라 문서 끝(저 밑)으로 떨어져 버린다. 새로고침은 처음부터 보겠다는
 * 뜻이므로 맨 위에서 시작한다(스토어가 메모리라 저장값도 함께 사라진다 —
 * 모바일과 같은 의미론). 이 모드는 세션 히스토리 엔트리에 붙어 새로고침에도
 * 유지되고, 떠날 때 원래 값으로 되돌려 다른 화면의 복원은 건드리지 않는다.
 *
 * 저장은 scroll 이벤트에서 바로 한다. 모바일은 rAF로 프레임당 한 번으로
 * 눌렀지만, 이 스토어의 `scrollTops`는 구독자가 없어(`getState()`로만 읽는다)
 * 갱신 비용이 스프레드 하나뿐이라 지연시킬 이유가 없다. 언마운트에서는 저장하지
 * 않는다 — Next의 맨 위 리셋과 순서를 다투다 0을 덮어쓸 수 있고, 마지막 위치는
 * 이미 스크롤하는 동안 저장돼 있다.
 *
 * @param surface 이 화면의 피드 surface (news=홈, article=기사)
 */
export function useScrollRestore(surface: PostListVariant) {
  useLayoutEffect(() => {
    const prevMode = history.scrollRestoration;
    history.scrollRestoration = "manual";

    const saved = useViewState.getState().scrollTops[surface] ?? 0;
    let cancelled = false;
    const restore = () => {
      if (!cancelled && saved > window.scrollY) window.scrollTo(0, saved);
    };
    restore();
    queueMicrotask(restore);
    const retry = requestAnimationFrame(restore);

    const onScroll = () => {
      useViewState.getState().setScrollTop(surface, window.scrollY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelled = true;
      cancelAnimationFrame(retry);
      window.removeEventListener("scroll", onScroll);
      history.scrollRestoration = prevMode;
    };
  }, [surface]);
}
