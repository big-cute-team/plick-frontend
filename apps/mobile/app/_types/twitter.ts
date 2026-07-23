/**
 * @file X 공식 widgets.js 전역 타입 (KAN-291).
 *
 * `platform.twitter.com/widgets.js`가 로드되면 `window.twttr`가 생긴다.
 * 공식 타입 패키지가 없어서 우리가 쓰는 `widgets.createTweet` 표면만 선언한다.
 */

/** `twttr.widgets.createTweet` 임베드 옵션 — 쓰는 것만 선언 */
interface TweetWidgetOptions {
  /** 카드 테마. iframe 내부라 PLick 토큰을 못 물려 dark/light 중 고른다 */
  theme?: "light" | "dark";
  /** `"none"`이면 답글 대상(스레드 부모) 트윗을 숨긴다 */
  conversation?: "none";
  align?: "left" | "center" | "right";
  /** Do Not Track — 임베드의 개인화 추적을 끈다 */
  dnt?: boolean;
}

declare global {
  interface Window {
    /** widgets.js 로드 후 생기는 공식 임베드 API */
    twttr?: {
      widgets: {
        /**
         * 트윗 하나를 container 안에 iframe으로 그린다.
         * 트윗이 삭제·비공개면 아무것도 그리지 않고 undefined로 resolve된다.
         */
        createTweet(
          id: string,
          container: HTMLElement,
          options?: TweetWidgetOptions,
        ): Promise<HTMLElement | undefined>;
      };
    };
  }
}

export {};
