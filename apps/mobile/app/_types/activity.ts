/**
 * @file MY 활동 탭 타입 (KAN-495). 첫 사용처가 모바일뿐이라 앱 레이어에
 * 둔다. web이 두 번째 사용처가 되면 `@plick/domain/types`로 승격한다(ADR 0011
 * 게이트 C, `ArticleCard`가 밟은 길과 같다). 좋아요한 기사는 홈 피드 카드와 같은
 * 모양이라 새 타입 없이 `ArticleCard`·`ArticleFeedPage`를 그대로 쓴다.
 *
 * 활동 화면이 `/me/activity`에서 MY 본문 탭으로 들어오면서(KAN-567) 탭에
 * `votes`가 늘었다. 내 투표 목록 API는 아직 없어 그 탭은 빈 상태만 그린다.
 */

import type { ArticleFeedPage } from "@plick/domain/types";

/** MY 활동 탭. URL `?tab=`의 값이자 쿼리키의 스코프다. */
export type ActivityTab = "comments" | "likes" | "votes";

/**
 * 내가 쓴 댓글 한 건 (`GET /api/v1/users/me/comments`).
 *
 * 기사 댓글 목록의 `ArticleComment`와 다른 계약이다. 작성자는 늘 나라 닉네임·
 * userId가 없고, 답글이 인라인되지 않으며, 삭제한 댓글은 tombstone이 아니라
 * 아예 빠진다. 대신 어느 기사에 쓴 댓글인지 기사 조각이 함께 온다.
 */
export interface MyComment {
  id: number;
  /** 본문. 삭제 댓글은 목록에서 빠지므로 null이 없다. 블라인드여도 원문 그대로 온다. */
  content: string;
  /** 작성 시각 ISO-8601 (KST 오프셋 포함). 최신순 정렬의 기준. */
  createdAt: string;
  isEdited: boolean;
  /** 운영자 블라인드 여부. 본인 화면이라 가린 사실을 본인은 알게 표시한다. */
  isBlinded: boolean;
  likeCount: number;
  /** 댓글이 달린 기사. 눌러서 들어갈 곳이자 제목의 출처. */
  article: {
    /** BE `articleSummaryId`를 문자열로 담는다 (라우트 파라미터와 결이 같다). */
    id: string;
    title: string;
    imageUrl: string | null;
  };
}

/**
 * 내 댓글 커서 페이지네이션 한 페이지. 기사 피드({@link ArticleFeedPage})와 같은
 * 규약이다. 총 건수도 `hasNext`도 없고 `nextCursor`가 null인지로만 끝을 판단한다.
 */
export interface MyCommentPage {
  items: MyComment[];
  /** 서버 발급 opaque 커서. null이면 마지막 페이지. 파싱하지 말고 되돌려준다. */
  nextCursor: string | null;
}

/** 활동 개수 (`GET /api/v1/users/me/activity`). 두 목록과 같은 필터로 센 값이다. */
export interface MyActivityCounts {
  likeCount: number;
  commentCount: number;
}

/**
 * MY 서버 컴포넌트가 미리 받아 클라 캐시에 심을 씨앗.
 *
 * 개수와 지금 보는 탭의 첫 페이지를 한 번의 서버 렌더에서 받는다. 받은 시각을
 * 함께 묶는 이유는 `InitialArticleFeed`와 같고, 여기서는 하나 더 있다. 화면에
 * 다시 들어올 때 캐시에 남은 옛 목록보다 이 씨앗이 새것이면 씨앗으로 갈아
 * 끼운다(`useFreshSeed`). 그 비교의 기준이 이 시각이다.
 */
export interface InitialActivity {
  counts: MyActivityCounts;
  /** 좋아요 탭을 보고 있을 때만 있다. */
  likes?: ArticleFeedPage;
  /** 댓글 탭을 보고 있을 때만 있다. */
  comments?: MyCommentPage;
  /** 서버가 응답을 받은 시각(epoch ms). 캐시 신선도의 기준점. */
  fetchedAt: number;
}
