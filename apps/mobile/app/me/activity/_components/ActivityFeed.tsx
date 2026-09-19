"use client";

import { useSearchParams } from "next/navigation";
import { useMyActivityCounts } from "@/_hooks/useMyActivityCounts";
import { useScreenTabView } from "@/_hooks/useScreenTabView";
import { useViewState } from "@/_stores/view-state";
import type { ActivityTab, InitialActivity } from "@/_types/activity";
import { activityTabFrom, activityTabPath } from "@/_utils/activity";
import { ActivityTabs } from "./ActivityTabs";
import { LikedArticlesList } from "./LikedArticlesList";
import { MyCommentsList } from "./MyCommentsList";

/**
 * 활동 화면 본체 (KAN-495). 개수가 붙은 탭 + 탭별 무한스크롤 리스트.
 *
 * 어느 탭을 보고 있는지는 URL `?tab=`이 정한다(기사 페이지의 팀 필터와 같은
 * 규약). 탭 선택은 `history.replaceState`로 URL만 바꾼다. 서버 왕복도 리마운트도
 * 없이 `useSearchParams`가 따라오고, 탭 선택이 히스토리에 쌓이지 않아 뒤로가기가
 * 마이페이지로 곧장 간다. 마이페이지의 개수 타일은 이 쿼리로 탭을 골라 들어온다.
 *
 * 탭을 바꾸면 맨 위로 올린다. 리스트 길이가 탭마다 달라 전환 전 자리에 두면
 * 스크롤 앵커링이 리스트 끝을 붙잡아 다음 페이지 요청이 연쇄로 나간다
 * (`ArticlesFeed`가 만난 것과 같은 함정). 탭별 스크롤 자리는 기억하지 않는다.
 * 둘뿐이고 목록이 서로 다른 것이라 되돌릴 자리라는 감각이 없다.
 *
 * @param initial 서버가 미리 받아 둔 개수와 지금 탭의 첫 페이지. 서버 fetch가
 *   실패했으면 없이 들어오고, 그때는 클라가 직접 받아 로딩·에러를 보여준다
 */
export function ActivityFeed({ initial }: { initial?: InitialActivity }) {
  const searchParams = useSearchParams();
  const tab = activityTabFrom(searchParams.get("tab"));
  /* 탭은 `?tab=`이라 pathname이 안 바뀐다 — 라우트 추적이 못 보니 여기서 센다 (KAN-543) */
  useScreenTabView("me_activity", tab);
  const counts = useMyActivityCounts(
    initial && { counts: initial.counts, fetchedAt: initial.fetchedAt },
  );

  function handleChange(next: ActivityTab) {
    if (next === tab) return;
    useViewState.getState().requestTop("activity");
    window.history.replaceState(null, "", activityTabPath(next));
  }

  return (
    <>
      <ActivityTabs value={tab} counts={counts.data} onChange={handleChange} />
      {tab === "likes" ? (
        <LikedArticlesList
          initial={
            initial?.likes && {
              page: initial.likes,
              fetchedAt: initial.fetchedAt,
            }
          }
        />
      ) : (
        <MyCommentsList
          initial={
            initial?.comments && {
              page: initial.comments,
              fetchedAt: initial.fetchedAt,
            }
          }
        />
      )}
    </>
  );
}
