import type {
  PointerEvent as ReactPointerEvent,
  TransitionEvent as ReactTransitionEvent,
} from "react";
import type { RumorStage, TeamCode } from "@plick/domain/types";

/**
 * 릴 한 장의 데이터 (KAN-276, `GET /api/v1/reels`).
 *
 * 퍼블리싱 때 만든 `@plick/domain`의 `FeedPost`를 쓰지 않는다. 그 타입은 BE가 이렇게
 * 줄 것이라는 추정이었고 실계약과 여러 군데 어긋난다 — 팀이 다중이고, 단계와 기자
 * 정보가 null일 수 있고, 본문·댓글·토론·저장 여부는 응답에 아예 없다. `FeedPost`를
 * 실계약에 맞게 고치면 아직 목데이터로 도는 web까지 끌려들어가므로 그대로 두었다
 * (ADR 0030에서 기사 피드가 같은 판단을 했다).
 *
 * 기사 피드의 `ArticleCard`와 지금은 필드가 같지만 타입을 따로 둔다. BE에서 두 응답이
 * 같은 이유는 릴스 큐레이션이 아직 없어 같은 쿼리를 쓰기 때문이고(be-verify 확인),
 * 릴스가 제 기준으로 갈라질 때 기사 카드를 건드리지 않으려는 것이다.
 */
export interface ReelCard {
  /** BE `articleSummaryId`를 문자열로 담는다. */
  id: string;
  title: string;
  /** BE가 긴 요약(`summary_detail`)을 내려준다. 짧은 요약은 이 API에 없다. */
  summary: string;
  /** 루머 단계. BE 실데이터의 절반이 비어 있다. */
  stage: RumorStage | null;
  /** 발행 시각 ISO-8601. BE가 KST 오프셋(+09:00)을 박아 내려준다. */
  publishedAt: string;
  /** 태그된 팀 목록 — 다중이고 없을 수 있다. 첫 팀을 대표로 쓴다. */
  teams: TeamCode[];
  /** 릴 배경 이미지. BE 실데이터가 아직 전부 비어 있어 placeholder로 폴백한다. */
  imageUrl: string | null;
  /** 기자. 객체 자체가 없을 수 있고 `tier`도 절반이 비어 있다. */
  reporter: { name: string; tier: number | null } | null;
  /** 원문 링크 (현재는 전부 x.com) */
  sourceUrl: string | null;
  views: number;
  commentCount: number;
  likeCount: number;
  liked: boolean;
  /** 해시태그(`#` 제외). 태그된 팀의 한국어명이 들어온다. */
  hashtags: string[];
}

/**
 * 커서 페이지네이션 한 페이지.
 *
 * 총 건수도 `hasNext`도 없다. 다음 페이지 존재 여부는 `nextCursor`가 null인지로만
 * 판단한다. 마지막 페이지도 items가 꽉 차서 올 수 있어 건수로 끝을 판정하면 안 된다.
 */
export interface ReelFeedPage {
  items: ReelCard[];
  /** 서버 발급 opaque 커서. null이면 마지막 페이지. 파싱하지 말고 되돌려준다. */
  nextCursor: string | null;
}

/**
 * 서버 컴포넌트가 미리 받아 클라 캐시에 심을 첫 페이지.
 *
 * 페이지와 받은 시각을 한 덩어리로 묶는다. 시각 없이 데이터만 넘기면 캐시가 묵은
 * 데이터를 방금 받은 것으로 착각한다({@link InitialReelFeed.fetchedAt}).
 */
export interface InitialReelFeed {
  page: ReelFeedPage;
  /**
   * 서버가 응답을 받은 시각(epoch ms). 캐시 신선도의 기준점이다.
   *
   * 이 값을 안 넘기면 RQ가 캐시 엔트리를 만드는 순간을 신선도 기준으로 찍어서,
   * 묵은 씨앗이 방금 받은 것으로 취급돼 갱신이 안 걸린다.
   */
  fetchedAt: number;
}

/** 릴 세부 시트의 개폐·드래그 상태 (useReelDetailMotion이 만들고 시트·피드가 공유) */
export interface ReelDetailMotion {
  /** 시트가 DOM에 있어야 하는가 (닫힘 애니메이션이 끝나면 false) */
  mounted: boolean;
  /** 올라온 상태인가 — false→true 전환이 슬라이드 업, 반대가 다운 */
  shown: boolean;
  /** 드래그 중 시트를 따라 내리는 오프셋(px) */
  dragY: number;
  dragging: boolean;
  open: () => void;
  requestClose: () => void;
  /** 그랩 존(기자 줄)에 스프레드할 포인터 핸들러 */
  grabProps: {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
  onTransitionEnd: (e: ReactTransitionEvent<HTMLDivElement>) => void;
}

/** 세부 시트가 떠 있는 동안 릴의 칩·제목 요소에 적용할 이동 상태 */
export interface TitleMotion {
  /** 현재 translateY 오프셋(px) — 도킹 지점까지의 거리 + 드래그 오프셋 */
  offset: number;
  /** 드래그 중이면 transition 없이 손가락을 따라간다 */
  dragging: boolean;
}
