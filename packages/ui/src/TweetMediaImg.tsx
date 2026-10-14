import {
  tweetPhotoSrcSet,
  tweetPhotoUrl,
  TWEET_GRID_SRCSET,
  TWEET_PHOTO_SIZE,
} from "@plick/domain/tweet-photo";

/**
 * react-tweet 임베드의 사진 `<img>`를 webp로 바꿔 그리는 교체 컴포넌트 (KAN-624).
 *
 * `EmbeddedTweet`의 `components={{ MediaImg }}`에 꽂는다. react-tweet `TweetMedia`가
 * `getMediaUrl(media, "small")`로 만든 `src`(`?format=jpg&name=small`)를 그대로 넘겨 주므로
 * 포맷만 webp로 바꾼다. 릴 첫 장 preload(모바일 `tweetImageUrl`)도 같은 함수로 주소를 만들어
 * 글자까지 일치한다. 다르면 같은 사진을 두 번 받는다(KAN-422).
 *
 * 영상 포스터는 `TweetMediaVideo`가 직접 그려 여기를 거치지 않는다.
 *
 * 사진이 두 장 이상이면 react-tweet이 격자로 그려 칸이 절반 폭이 된다. 그때는 `grid`로
 * 배율별 `srcset`(`TWEET_GRID_SRCSET`)을 달아 배율 1.75 이하 기기가 360짜리를 받는다.
 * 격자인지는 `MediaImg`가 모르므로 `TweetEmbed`가 트윗의 미디어 수를 보고
 * {@link TweetMediaImgGrid}를 꽂는다. preload(`tweetImageSrcSet`)도 같은 후보를 준다.
 *
 * @param src react-tweet이 만든 사진 주소
 * @param alt 대체 텍스트
 * @param grid 두 장 이상 격자 칸이면 true
 */
export function TweetMediaImg({
  src,
  alt,
  className,
  draggable,
  grid = false,
}: {
  src: string;
  alt: string;
  className?: string;
  draggable?: boolean;
  grid?: boolean;
}) {
  const webp = tweetPhotoUrl(src, TWEET_PHOTO_SIZE, "webp");
  return (
    <img
      src={webp}
      srcSet={
        grid
          ? (tweetPhotoSrcSet(webp, TWEET_GRID_SRCSET) ?? undefined)
          : undefined
      }
      alt={alt}
      className={className}
      draggable={draggable}
    />
  );
}

/** 격자(사진 두 장 이상) 트윗용. `components={{ MediaImg: TweetMediaImgGrid }}`에 꽂는다. */
export function TweetMediaImgGrid(props: {
  src: string;
  alt: string;
  className?: string;
  draggable?: boolean;
}) {
  return <TweetMediaImg {...props} grid />;
}
