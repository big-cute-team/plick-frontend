# 0211. 모바일 릴스 #418의 진짜 원인은 트윗 임베드의 작성 시각이었다 (KAN-672)

## 어디서 시작했나

KAN-630에서 한 번 잡으려 했던 모바일 릴스 콘솔의 `Minified React error #418`이 2026-10-23 prod 재측정(KAN-667)에서도 세 번 모두 남아 있었다. 릴스 Best Practices는 71로 전 화면 중 가장 낮았고, 같은 화면의 웹 릴스는 통과했다.

#418은 하이드레이션 중 텍스트가 어긋났다는 에러다. 하이드레이션(hydration)은 서버가 미리 그려 보낸 HTML 위에 브라우저의 React가 같은 트리를 다시 계산해 이벤트를 붙이는 과정이다. 이때 React는 서버가 그린 DOM과 자기가 계산한 결과가 같다고 가정한다. 글자 하나라도 다르면 그 경계 아래를 버리고 클라이언트에서 다시 그리며, 프로덕션 빌드에서는 긴 설명 대신 번호만 찍는다. 그래서 prod 콘솔만 봐서는 어느 노드의 어떤 글자인지 알 수 없다.

티켓을 쓸 때 전제가 하나 바뀌어 있었다. 릴스 피드는 ADR 0200에서 익명 ISR로 바뀌어 `likedByMe`처럼 사람마다 다른 값이 HTML에서 빠졌고, 릴 하단의 상대 시간("3시간 전")에는 이미 `suppressHydrationWarning`이 붙어 있었다. 그런데도 남는다면 용의자는 세 갈래였다. react-tweet 임베드의 날짜 포맷, ISR로 굳은 HTML 속 다른 시각 의존 텍스트, 서버 씨앗과 브라우저 쿼리 데이터의 불일치(ADR 0048의 피드 씨앗 함정).

## 로컬 dev에서는 재현되지 않았다

티켓에 적어 둔 대로 prod BE를 보는 `mobile-prodbe` dev 서버를 띄웠다. dev 빌드는 하이드레이션 에러를 전체 문장과 diff로 보여 주니 바로 잡힐 거라 기대했는데, 콘솔에는 401 두 줄과 HMR 로그뿐이었다.

여기서 가설을 늘어놓기 전에 react-tweet이 날짜를 어떻게 만드는지부터 봤다. `react-tweet/dist/date-utils.js`가 이렇다.

```js
const formatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
```

`timeZone`이 없다. `Intl.DateTimeFormat`은 타임존을 안 주면 실행 환경의 기본 시간대를 쓴다. Node 서버라면 프로세스의 `TZ`(없으면 OS 설정)이고, 브라우저라면 사용자 기기 설정이다. 내 맥은 서버도 브라우저도 Asia/Seoul이라 같은 글자가 나왔고, prod EC2는 UTC라 서버가 UTC로 그린 글자를 KST 브라우저가 다른 글자로 다시 계산한다. 로컬 dev에서 재현이 안 된 이유가 이것으로 설명됐다.

웹 릴스가 통과하는 이유도 같이 풀렸다. 모바일은 첫 릴이 트윗 임베드면 서버가 트윗 데이터를 미리 받아 임베드를 HTML에 그린다(KAN-422, LCP 이미지를 초기 HTML에 싣기 위해서다). 웹은 임베드를 브라우저에서 fetch한 뒤에만 그려서 하이드레이션할 임베드가 애초에 없다.

## 재현

가설을 확인하려고 dev 서버만 `TZ=UTC`로 띄웠다. launch.json에 임시 항목을 하나 넣고, 브라우저 패널 콘솔은 하이드레이션 에러를 잘 못 잡아서 Playwright 헤드리스 Chromium에 `timezoneId: "Asia/Seoul"`을 주고 `pageerror`를 모았다.

```
+  aria-label="8:48 AM · Oct 26, 2026"
-  aria-label="11:48 PM · Oct 25, 2026"
   <time dateTime="2026-10-25T23:48:28.000Z">
+    8:48 AM · Oct 26, 2026
-    11:48 PM · Oct 25, 2026
```

`+`가 브라우저, `-`가 서버다. 트리 경로는 `ReelItem > TweetEmbed > EmbeddedTweet > … > TweetInfoCreatedAt`이었다. 대조군으로 브라우저도 UTC로 두면 에러가 0건이었다. 원인은 이 하나로 확정했다. ISR 캐시 시각이나 씨앗 불일치 쪽은 볼 필요가 없었다.

## 어떻게 고쳤나

### 선택지

1. prod 서버 프로세스에 `TZ=Asia/Seoul`을 준다. 코드는 안 바뀌지만 배포 설정을 건드리고, 해외 시간대 브라우저나 미국 리전에서 도는 PageSpeed Insights에서는 여전히 어긋난다.
2. 작성 시각 줄을 클라이언트에서만 그린다. 서버 HTML에 그 줄이 없다가 마운트 후 생기면 임베드 높이가 한 줄 늘어난다. 릴 임베드는 영역 안에서 세로 가운데 정렬이라 카드 전체가 움직이고, 그대로 CLS가 된다.
3. 시간대를 KST로 고정해 포맷한다. 서버든 브라우저든 같은 입력에서 같은 글자가 나온다. 이 코드베이스는 이미 `formatChangeableAt`, `formatDateKo` 같은 날짜 포맷을 전부 `timeZone: "Asia/Seoul"`로 고정해 쓰고 있다. 한국어 서비스라 사용자에게도 KST가 맞다.

3번으로 갔다.

### react-tweet에서 시각 줄만 갈아 끼울 수 없었다

`EmbeddedTweet`은 `components` prop으로 일부 부품을 바꿀 수 있지만 허용 목록이 `TweetNotFound`, `AvatarImg`, `MediaImg` 셋뿐이다. 시각 줄(`TweetInfo`)은 없다. 대신 react-tweet은 `TweetContainer`, `TweetHeader`, `TweetBody`, `TweetMedia`, `QuotedTweet`, `TweetActions`, `TweetReplies`, `enrichTweet`을 전부 export한다. 그래서 `EmbeddedTweet`(3.3.1의 `embedded-tweet.js`, 40줄 남짓)을 같은 순서와 조건으로 다시 조립하고 `TweetInfo` 자리만 우리 줄로 바꾼 `KstEmbeddedTweet`을 만들었다. 날짜 문자열은 `@plick/domain/format`의 `formatTweetCreatedAt`이 react-tweet `formatDate`와 같은 모양("8:48 AM · Oct 26, 2026")으로, 타임존만 고정해 만든다.

원래 시각 줄에는 트윗으로 가는 링크와 오른쪽 "광고 정보" ⓘ 아이콘 링크가 있었다. 임베드는 KAN-297부터 `pointer-events: none`이라 둘 다 누를 수 없었고, KAN-670에서도 누를 수 없는 "Follow" 링크를 같은 이유로 숨겼다. 그래서 새 줄은 `<time>` 글자만 그린다. 화면에서 보이는 차이는 ⓘ 아이콘이 없어진 것 하나다.

### 위 여백이 안 먹었다

처음 조립하고 계산된 스타일을 찍어 보니 글자 크기(16.5px)와 색은 원본과 같은데 `margin-top`이 0이었다. 원본 `.info`의 `margin-top: 0.125rem`을 Tailwind `mt-0.5`로 옮겼는데 적용되지 않은 것이다.

react-tweet `theme.css`에 `:where(.react-tweet-theme) * { margin: 0 }`이 있었다. `:where()`는 특이도가 0이라 평소라면 어떤 클래스 규칙에도 진다. 그런데 Tailwind v4 유틸은 `@layer utilities` 안에 있고, CSS 캐스케이드에서는 레이어에 속한 규칙이 특이도와 관계없이 레이어 밖 규칙에 진다. react-tweet CSS는 레이어 밖이라 특이도 0인 리셋이 `mt-0.5`를 이겼다. 원본 `.info`는 react-tweet 자신의 CSS 모듈(레이어 밖)이라 특이도 싸움에서 이기고 있었던 것이다. ADR 0171에서 `theme.css` 레이어 밖 규칙으로 한 번 겪은 함정과 같은 모양이다. `mt-0.5!`(Tailwind v4의 important 표기)로 레이어 순서를 넘게 했고, 고친 뒤에는 2.2px(0.125rem × 루트 17.6px)로 원본과 같아졌다.

### 아바타 `image-size-responsive`

티켓에 함께 보라고 적혀 있던 감사다. 고치기 전 prod 측정 세 번 모두 같은 이미지가 걸렸다. `…/qwJraMmT_normal.jpg`이고 표시 크기 37×37, 실제 크기 48×48이었다. 릴 임베드는 KAN-297에서 아바타를 2.125rem(약 37 CSS px)으로 줄였는데, Lighthouse 모바일 에뮬레이션은 기기 배율 1.75라 그 크기를 선명하게 그리려면 65px 남짓이 필요하다. 48px 원본으로는 모자랐다.

트위터 프로필 이미지는 파일 이름 끝의 접미사로 크기를 고른다. `_normal` 48, `_bigger` 73, `_200x200`, `_400x400`. 아바타는 `components.AvatarImg`로 바꿀 수 있는 부품이라 `TweetAvatarImg`를 만들어 꽂고, 주소 변환은 `@plick/domain/tweet-photo`의 `tweetAvatarUrl`이 `pbs.twimg.com/profile_images/…_normal.확장자`일 때만 `_bigger`로 바꾼다. 기본 아바타(`abs.twimg.com/sticky/default_profile_images`)처럼 다른 주소는 그대로 둔다. `_200x200`은 배율 3 기기까지 선명하지만, 37px 자리에 쓰기에는 커서 배율 2까지 1:1을 넘는 `_bigger`에서 멈췄다.

이 두 부품은 모바일 `_components/`에 뒀다. 웹 임베드는 서버에서 그리지 않아 시각 문제가 없고 아바타도 48px 그대로라, ADR 0011 기준으로 아직 공용으로 뺄 이유가 없다.

## 확인

단위 테스트는 `tests/unit/tweet-created-at.test.mjs`(UTC 23시가 KST 다음 날 아침이 되는지, 오후와 한 자리 시 모양, 프로세스 `TZ`를 바꿔도 결과가 같은지)와 `tweet-photo.test.mjs`의 아바타 변환 두 건을 붙였다. 129건 전부 통과했다.

하이드레이션은 prod를 흉내 내려고 prod BE를 보는 프로덕션 빌드를 `TZ=UTC next start`로 띄우고 Playwright로 브라우저 시간대를 바꿔 가며 봤다.

| 대상                                       | 브라우저 Asia/Seoul | 브라우저 America/New_York |
| ------------------------------------------ | ------------------- | ------------------------- |
| 고치기 전 dev 서버(UTC), `/reels`          | #418 1건            | 확인 안 함                |
| 고친 뒤 프로덕션 빌드(UTC), `/reels`       | 0건                 | 0건                       |
| 고친 뒤 프로덕션 빌드(UTC), `/reels/10211` | 0건                 | 0건                       |

Lighthouse 12 모바일 기본 설정으로 세 번씩 쟀다.

| 대상                                 | Best Practices | errors-in-console | image-size-responsive   |
| ------------------------------------ | -------------- | ----------------- | ----------------------- |
| 고치기 전 prod `m.plick.co.kr/reels` | 75 / 71 / 71   | 2/3회 #418        | 3/3회 실패(아바타 48px) |
| 고친 뒤 로컬 빌드 `/reels`           | 96 / 96 / 96   | #418 없음         | 3/3회 통과              |
| 고친 뒤 로컬 빌드 `/reels/10211`     | 96 / 96 / 96   | #418 없음         | 3/3회 통과              |

로컬 측정에서 `errors-in-console`은 여전히 실패로 나왔다. 남은 항목은 조회 기록 `POST /api/v1/articles/{id}/view`의 403 하나였는데, localhost에서 prod BE로 쓰기 요청을 보내 거절당한 로컬 환경의 산물이라 prod에서는 나지 않는다. 고치기 전 prod 1회차가 75로 조금 높았던 것도 그 회차에 #418이 안 찍혔기 때문이다. 하이드레이션 순서와 측정 타이밍에 따라 에러 로그가 감사 수집 전에 남느냐가 갈린 것으로 보인다. 그래서 "3회 중 2회"였다.

완료 조건 중 "prod 콘솔에 #418 없음"과 "Best Practices가 다른 화면 수준"은 배포 뒤 prod에서 다시 재야 닫을 수 있다.

## 남은 것

- 배포 뒤 prod 모바일 릴스·릴 세부 Lighthouse 3회 재측정.
- 이번 일로 dev 서버와 prod 서버의 시간대가 다르다는 점이 재현을 가렸다. 로컬 재현이 안 되는 하이드레이션 에러를 만나면 먼저 서버를 `TZ=UTC`로 띄워 볼 것.
