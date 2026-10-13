import { tweetPhotoUrl, TWEET_PHOTO_SIZE } from "@plick/domain/tweet-photo";

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
 * @param src react-tweet이 만든 사진 주소
 * @param alt 대체 텍스트
 */
export function TweetMediaImg({
  src,
  alt,
  className,
  draggable,
}: {
  src: string;
  alt: string;
  className?: string;
  draggable?: boolean;
}) {
  return (
    <img
      src={tweetPhotoUrl(src, TWEET_PHOTO_SIZE, "webp")}
      alt={alt}
      className={className}
      draggable={draggable}
    />
  );
}
