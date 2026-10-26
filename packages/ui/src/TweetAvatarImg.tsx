import { tweetAvatarUrl } from "@plick/domain/tweet-photo";

/**
 * react-tweet 임베드의 작성자 아바타 `<img>`를 한 단계 큰 변형으로 바꿔 그리는 교체 컴포넌트
 * (KAN-672). `EmbeddedTweet`의 `components={{ AvatarImg }}`에 꽂는다. 이유는
 * {@link tweetAvatarUrl}에 있다.
 *
 * @param src react-tweet이 넘긴 아바타 주소
 * @param alt 작성자 이름
 * @param width react-tweet 고정값 48
 * @param height react-tweet 고정값 48
 */
export function TweetAvatarImg({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <img src={tweetAvatarUrl(src)} alt={alt} width={width} height={height} />
  );
}
