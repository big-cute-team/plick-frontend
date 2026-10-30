# 0221. X 이미지 CDN이 핫링크를 막기 시작해 핫이슈·릴·임베드 사진이 사라졌다: no-referrer 핫픽스

2026-10-30. KAN-652(ADR 0220) prod 배포 직후 사용자가 "핫이슈에 사진이 안 뜬다"고 알려 왔다. 티켓은
KAN-682다. Jira 생성 MCP가 두 번은 분류기에 막혔다가 세 번째에 통과했다.

## 배포 탓인지부터 갈랐다

막 배포한 직후라 당연히 내 변경을 의심했다. 그런데 KAN-652는 메타데이터와 정적 페이지, 광고 자리만 건드렸고
핫이슈 카드의 이미지 태그는 손대지 않았다. 그래서 prod HTML을 받아 봤다. `m.plick.co.kr` 홈의 핫이슈 카드에는
`https://pbs.twimg.com/media/HVwSEV3WwAAnPa7?format=webp&name=small` 같은 주소가 그대로 박혀 있었다. 주소가
있는데 안 뜬다면 이미지 요청 쪽이다.

브라우저 패널에서 그 `<img>`를 보니 `complete: true`인데 `naturalWidth: 0`이었다. 로드는 끝났는데 이미지가
아닌 응답이 왔다는 뜻이다.

## curl로 조건을 하나씩 바꿔 봤다

같은 주소를 curl로 받으면 200에 `image/webp`였다. 브라우저와 뭐가 다른가. UA를 iPhone Safari로 바꿔도 200.
`Referer: https://m.plick.co.kr/`를 붙이자 351에 `text/html`이 왔다.

```
HTTP/2 351
retry-after: 0
x-cache: HIT
x-tw-cdn: FT
<title>351 Forbidden</title> ... Error 54113 ... Varnish cache server
```

351은 표준 HTTP 상태 코드가 아니다. X의 CDN(Varnish)이 쓰는 자체 코드다. 조건을 더 갈라 봤다.

| 요청                                                   | 응답           |
| ------------------------------------------------------ | -------------- |
| Referer 없음                                           | 200 image/webp |
| Referer plick.co.kr, m.plick.co.kr, dev-m.plick.co.kr  | 351            |
| Referer google.com, naver.com                          | 351            |
| Referer x.com                                          | 200            |
| Sec-Fetch-Dest: image 등 브라우저 헤더만, Referer 없음 | 200            |

Referer 하나로 갈린다. 그리고 우리 도메인만이 아니라 구글과 네이버 Referer도 막힌다. X가 자기 도메인 밖에서
오는 핫링크를 전부 차단하도록 바꾼 것이다. 언제부터인지는 모른다. 이 세션 앞쪽(같은 날 오전)에 로컬 prod BE
빌드 스크린샷을 찍었을 때도 핫이슈 칸이 비어 있었는데 그때는 로컬이라 그러려니 하고 넘겼다. 지금 보니 그때
이미 막혀 있었다.

브라우저가 Referer를 보내는 이유는 기본 referrer policy(`strict-origin-when-cross-origin`)가 크로스 오리진
요청에도 origin까지는 싣기 때문이다. 우리 `<img>`에는 `referrerPolicy`가 없었다. 그러니 X가 정책을 바꾸는 순간
사진이 전부 빠진 것이고, 코드는 아무것도 안 바뀌었는데 화면이 바뀐 사례다.

## 고친 것

pbs 이미지를 그리는 `<img>` 여덟 곳과 릴 첫 이미지의 `<link rel="preload" as="image">` 네 곳에
`referrerPolicy="no-referrer"`를 붙였다.

- 핫이슈 카드: 모바일 `HotHeroCard`, 웹 `HotCard`
- 기사 상세 대표 이미지: 모바일 `ArticleBody`, 웹 `ArticleMain`
- 릴: 두 앱 `ReelItem`
- 트윗 임베드: `@plick/ui`의 `TweetMediaImg`(사진), `TweetAvatarImg`(프로필). react-tweet이 그리는 `<img>`를
  이 둘로 교체해 쓰고 있어서(KAN-624) 여기만 고치면 임베드 전체가 따라온다
- preload: 두 앱 `ReelsFeedSection`과 `reels/[postId]/page.tsx`. preload 링크의 referrer policy가 실제 이미지
  요청과 다르면 브라우저가 preload를 재사용하지 않고 두 번 받는다. 그래서 같이 맞춰야 한다

전역 `<meta name="referrer" content="no-referrer">` 한 줄이면 더 짧지만 그렇게 하지 않았다. 애드센스와
애드핏이 광고 요청의 Referer로 매체 도메인을 확인한다. 전역으로 끄면 광고 쪽이 깨진다. GA는 들어오는 방문의
`document.referrer`를 쓰므로 나가는 요청의 정책과 무관하지만, 광고망 하나만으로도 전역은 안 된다.

주석은 `<img` 여는 태그 안에 `//`로 달았다. JSX 여는 태그 안은 `{/* */}`를 못 쓰는 자리이고 TypeScript와
Prettier가 `//`를 받는다. `apps/CLAUDE.md`의 "JSDoc이 불가능한 자리의 제약 설명만 인라인 `//` 허용"에
해당한다.

## 검증

`format:check`, `lint`, `check-types`, `test:unit`(204개)이 통과했다. 빌드와 화면 확인은 아래에 이어 적는다.

## 릴스 임베드도 같은 원인이었고, 인용 트윗과 영상이 남았다

사용자가 릴스 임베드 안 사진도 안 보인다고 했다. 임베드 본문 사진과 아바타는 `TweetMediaImg`·
`TweetAvatarImg`로 이미 잡히는데, react-tweet 소스를 보니 손이 안 닿는 `<img>`가 더 있었다. `QuotedTweet`은
`TweetMedia`에 `components`를 넘기지 않아 인용 트윗의 사진은 react-tweet 기본 `MediaImg`로 그려지고,
라벨 아이콘(`highlighted-label.js`)도 기본 `<img>`다. 그래서 `KstEmbeddedTweet`에 effect를 하나 뒀다.
마운트 뒤 임베드 안에서 `referrerpolicy` 속성이 없는 `<img>`를 찾아 `no-referrer`를 달고 `src`·`srcset`을
뗐다 다시 넣어 요청을 다시 보낸다. 서버 렌더된 인용 사진은 첫 요청이 한 번 실패하고 두 번째에 뜬다.
래퍼는 `display: contents`라 레이아웃에는 안 끼어든다.

영상은 못 고쳤다. `tweet-media-video.js`는 `<video poster>`를 쓰는데 HTML에 `referrerpolicy` 속성이 있는
요소는 a, area, img, iframe, link, script뿐이고 video는 없다. 포스터(`pbs.twimg.com/ext_tw_video_thumb`)도
351이고 mp4(`video.twimg.com`)도 Referer가 붙으면 403이다. 남은 길은 문서 전체 `<meta name="referrer">`
아니면 영상 프록시인데, 전역 meta는 애드핏이 켜지면 광고 요청의 Referer까지 지워서 지금은 미루고 후속으로
뒀다. 애드센스가 미승인이고 애드핏 ID도 비어 있어 당장은 전역 meta가 광고에 영향이 없긴 하다.

## 검증

빌드(`API_BASE_URL=https://plick.co.kr/be pnpm build`)가 통과했다. 브라우저 패널(크로미움)로
`localhost:3061/reels`를 열고 두 번째 릴까지 스크롤한 뒤 DOM을 읽으니 아바타와 사진 전부
`referrerpolicy="no-referrer"`에 `naturalWidth`가 73·544로 실제 로드됐다. 패널은 pbs 요청을 네트워크
목록에 안 보여 줘서 DOM 쪽 값으로 봤다.

iOS 시뮬레이터 Safari로도 봤다. 홈 핫이슈 두 장이 떴고, 릴스 첫 장(사진 없는 트윗)의 아바타, 두 번째 릴
(디 애슬레틱)의 사진이 떴다. 두 번째 릴의 아바타는 처음 한 번 깨진 아이콘으로 나왔다가, 같은 트윗의
딥링크(`/reels/10835`, 서버 렌더)에서는 떴고 그 뒤 피드에서 다시 넘겨 보니 떴다. 크로미움에서는 같은
클라 렌더 경로가 처음부터 로드됐다. Safari 쪽 첫 실패가 캐시인지 클라 렌더 순서 문제인지는 못 갈랐고,
배포 뒤 실기기에서 한 번 더 본다.
