import { useEffect, useMemo, useRef } from "react";
import {
  enrichTweet,
  QuotedTweet,
  TweetActions,
  TweetBody,
  TweetContainer,
  TweetHeader,
  TweetInReplyTo,
  TweetMedia,
  TweetReplies,
  type TwitterComponents,
} from "react-tweet";
import type { Tweet } from "react-tweet/api";
import { formatTweetCreatedAt } from "@plick/domain/format";

/**
 * react-tweet `EmbeddedTweet`을 같은 부품으로 다시 조립하고 작성 시각 줄(`TweetInfo`)만
 * KST 고정 포맷으로 바꾼 것 (KAN-672). 웹 릴스도 첫 장을 서버가 그리게 되면서(KAN-673)
 * 두 앱이 함께 쓴다.
 *
 * 원본 `TweetInfo`는 타임존 없이 날짜를 포맷해 서버(UTC)와 브라우저(KST)의 글자가 달랐다.
 * 릴 첫 장은 서버가 임베드를 그리므로(KAN-422) 하이드레이션이 React #418로 깨졌다.
 * `components`로는 시각 줄을 갈아 끼울 수 없어 조립을 통째로 가져왔다. 순서와 조건은
 * react-tweet 3.3.1 `embedded-tweet.js`와 같다.
 *
 * 시각 줄은 링크와 광고 안내 아이콘을 뺀 글자만 그린다. 임베드는 `pointer-events: none`인
 * 읽기 전용이라(KAN-297) 둘 다 누를 수 없었다. 글자 크기와 줄 높이는 react-tweet 테마
 * 변수를 그대로 써서 모양을 맞춘다. 위 여백만 important다. react-tweet 테마의 레이어 밖
 * 규칙(`:where(.react-tweet-theme) * { margin: 0 }`)이 레이어 안의 Tailwind 유틸을 이긴다.
 *
 *
 * 임베드 안의 모든 `<img>`에 `referrerPolicy="no-referrer"`를 심는다 (KAN-682). X 이미지 CDN이
 * Referer 붙은 핫링크를 351로 막기 시작했다. 본문 사진과 아바타는 `components`로 갈아 끼운
 * `TweetMediaImg`·`TweetAvatarImg`가 속성을 달지만, 인용 트윗의 사진(`QuotedTweet`이
 * `TweetMedia`에 components를 안 넘긴다)과 라벨 아이콘은 react-tweet 기본 `<img>`라 손이 안
 * 닿는다. 마운트 뒤 속성이 없는 img를 찾아 정책을 달고 src를 다시 넣어 요청을 다시 보낸다.
 * 영상(`<video>`)은 HTML에 referrerpolicy 속성이 없어 여기서 못 고친다.
 * @param tweet 트윗 데이터
 * @param components react-tweet 교체 컴포넌트(`MediaImg` 등)
 */
export function KstEmbeddedTweet({
  tweet: raw,
  components,
}: {
  tweet: Tweet;
  components?: TwitterComponents;
}) {
  const tweet = useMemo(() => enrichTweet(raw), [raw]);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const imgs = host.current?.querySelectorAll<HTMLImageElement>(
      "img:not([referrerpolicy])",
    );
    imgs?.forEach((img) => {
      img.referrerPolicy = "no-referrer";
      const { src, srcset } = img;
      img.removeAttribute("src");
      img.removeAttribute("srcset");
      if (srcset) img.srcset = srcset;
      img.src = src;
    });
  }, [tweet]);

  return (
    <div ref={host} className="contents">
      <TweetContainer>
        <TweetHeader tweet={tweet} components={components} />
        {tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
        <TweetBody tweet={tweet} />
        {tweet.mediaDetails?.length ? (
          <TweetMedia tweet={tweet} components={components} />
        ) : null}
        {tweet.quoted_tweet && (
          <QuotedTweet tweet={tweet.quoted_tweet} components={components} />
        )}
        <div className="text-text-3 mt-0.5! flex items-center text-(length:--tweet-info-font-size) leading-(--tweet-info-line-height) whitespace-nowrap">
          <time dateTime={new Date(tweet.created_at).toISOString()}>
            {formatTweetCreatedAt(tweet.created_at)}
          </time>
        </div>
        <TweetActions tweet={tweet} />
        <TweetReplies tweet={tweet} />
      </TweetContainer>
    </div>
  );
}
