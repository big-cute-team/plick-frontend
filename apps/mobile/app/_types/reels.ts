/**
 * @file 릴스 화면 전용 타입 — 세부 바텀시트의 제스처·모션 상태.
 *
 * 계약 타입(`ReelCard`·`ReelFeedPage`·`InitialReelFeed`)은 web이 두 번째
 * 사용처가 되면서 `@plick/domain/types`로 승격했다(KAN-323). 여기 남은 둘은
 * 모바일 바텀시트의 포인터 제스처 상태라 web(오른쪽 슬라이드 패널)과 공유할
 * 것이 없다.
 */

import type {
  PointerEvent as ReactPointerEvent,
  TransitionEvent as ReactTransitionEvent,
} from "react";
import type { Tweet } from "react-tweet/api";

/**
 * 서버가 미리 받아 둔 첫 릴의 트윗 데이터 (KAN-422).
 *
 * 임베드를 초기 HTML에 그려 LCP 이미지가 문서에서 바로 발견되게 하는 씨앗이다.
 * 피드가 refetch로 갈리면 첫 릴이 바뀔 수 있어, 어느 릴의 것인지 id로 못박아
 * 그 릴에만 붙인다.
 */
export interface ReelSeedTweet {
  /** 이 트윗이 속한 릴 id — 피드의 릴과 대조해 일치할 때만 쓴다 */
  reelId: string;
  tweet: Tweet;
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
  /** 본문 스크롤 영역에 다는 ref — 최상단에서 아래로 끄는 터치를 시트 드래그로 넘겨받는다 */
  scrollGrabRef: (node: HTMLDivElement | null) => void;
  onTransitionEnd: (e: ReactTransitionEvent<HTMLDivElement>) => void;
}

/** 세부 시트가 떠 있는 동안 릴의 칩·제목 요소에 적용할 이동 상태 */
export interface TitleMotion {
  /** 현재 translateY 오프셋(px) — 도킹 지점까지의 거리 + 드래그 오프셋 */
  offset: number;
  /** 드래그 중이면 transition 없이 손가락을 따라간다 */
  dragging: boolean;
}
