# 0212. Next 16 라우트 핸들러 응답이 압축되지 않던 이유와 웹 릴스 첫 트윗 선로드 (KAN-673)

## 어디서 시작했나

KAN-636에 묶었던 세 가지가 2026-10-23 prod 재측정(KAN-667, `docs/perf/2026-10-23-kan-667/lighthouse-full-prod.tsv`)에도 남아 있어 티켓을 다시 썼다.

- 릴스에서 `/api/tweet/*` JSON이 압축 없이 나간다. Lighthouse `uses-text-compression`이 모바일 9KiB, 웹 40KiB 절감을 추정했다.
- 웹 릴스의 LCP가 첫 트윗 본문인데, 그 본문이 하이드레이션 뒤 클라이언트 fetch를 거쳐야 그려진다. 모바일은 KAN-422(ADR 0113)에서 이미 서버 선로드를 했는데 웹에는 없었다.
- 원문이 지워진 트윗을 프록시가 404로 줘서, 데이터에 따라 콘솔 에러가 잡힌다.

세 개 모두 같은 `/api/tweet/[id]` 라우트와 `TweetEmbed` 주변이라 한 브랜치로 했다.

## 압축: CloudFront를 의심했는데 오리진이었다

처음 가설은 앞단이었다. 우리 문서 요청은 CloudFront → ALB → EC2(Next standalone)로 가고, 문서 HTML은 이미 gzip으로 나간다. 그렇다면 `/api/*`만 다른 비헤이비어(경로별 캐시 설정)를 타고 있거나, 그 비헤이비어의 캐시 정책이 `Accept-Encoding`을 오리진에 넘기지 않는 게 아닐까 싶었다. CloudFront 캐시 정책에서 gzip/brotli를 켜지 않으면 CloudFront는 요청의 `Accept-Encoding`을 지우고 오리진에 보낸다. 오리진은 압축을 원하는 클라이언트가 없다고 보고 날것으로 준다.

prod에 직접 물어봤다.

```
GET https://m.plick.co.kr/api/tweet/2113562985360773451  (Accept-Encoding: gzip, br)
content-type: application/json
cache-control: public, max-age=86400
vary: rsc
x-cache: Miss from cloudfront

GET https://m.plick.co.kr/reels
content-encoding: gzip
vary: rsc,Accept-Encoding
```

`aws cloudfront get-distribution-config`로 본 설정은 가설과 달랐다. `/api/tweet`은 문서와 같은 기본 비헤이비어(`plick-documents` 캐시 정책)를 타고, 그 정책은 gzip과 brotli가 둘 다 켜져 있고, 비헤이비어의 `Compress`(엣지 자동 압축)도 true였다. 앞단 설정은 문서와 똑같다.

단서는 `vary` 헤더였다. 문서 응답에는 `Accept-Encoding`이 붙어 있고 트윗 응답에는 없다. Next가 쓰는 압축 미들웨어(express의 `compression` 패키지를 Next가 번들한 것)는 압축 여부를 판단하는 순간 `Vary: Accept-Encoding`부터 단다. 같은 URL이 요청의 인코딩에 따라 다른 바이트를 줄 수 있다고 캐시에 알리는 헤더다. 이게 없다는 건 오리진이 압축 판단 단계에 들어가지도 않았다는 뜻이다.

로컬에서 `next start`로 같은 걸 재현했다. 문서는 `Content-Encoding: gzip`, 라우트 핸들러는 압축도 `Vary`도 없이 `Transfer-Encoding: chunked`였다. CloudFront는 무관하고 Next가 라우트 핸들러 응답을 압축하지 않는 것이다.

### Next 소스를 따라가 본 메커니즘

`next/dist/server/lib/router-server.js`를 보면 `compress` 설정이 false가 아니면 모든 요청에 `compression()` 미들웨어를 건다. 라우트 핸들러라고 빠지는 분기는 없다. 그래서 미들웨어 자체가 아니라 라우트 핸들러 응답을 쓰는 경로가 다른 거라고 보고, 실제 Next 모듈을 불러 작은 재현 스크립트를 짰다(스크래치패드, 저장소 밖).

1. Node `http` 서버에 Next의 `compression`만 걸고 `res.setHeader("content-type", "application/json")` 후 쓰기: gzip으로 나간다.
2. 같은 조건에서 `res.appendHeader`, `flushHeaders`, Next의 `pipeToNodeResponse`(Web `ReadableStream`을 Node 응답으로 흘리는 함수)로 쓰기: 전부 gzip으로 나간다.
3. Next의 `sendResponse(new NodeNextRequest(req), new NodeNextResponse(res), Response.json(...))`: 압축이 안 되고 `vary`도 없다. prod와 같다.

3번에서 `writeHead` 순간의 헤더를 찍어 봤다.

```
content-type: ["application/json"]
```

문자열이 아니라 배열이었다. 라우트 핸들러가 돌려준 Web `Response`의 헤더를 Node 응답으로 옮길 때 `sendResponse`는 Node의 `res.appendHeader`가 아니라 Next 자체 래퍼 `BaseNextResponse.appendHeader`를 부른다. 이 래퍼는 기존 값을 배열로 모아 `setHeader(name, [...기존, 새값])`으로 넣어서, 값이 하나뿐이어도 배열로 저장한다. 같은 Node `appendHeader`를 직접 부르면 문자열로 남는 것과 대조된다.

`compression`의 압축 가능 판정은 `compressible(res.getHeader("Content-Type"))`이고, `compressible`은 인자가 문자열이 아니면 바로 false를 준다. 판정에서 떨어지면 `nocompress("filtered")`로 빠지는데 이 분기는 `Vary`를 달기 전이다. 문서는 렌더 경로가 `content-type`을 문자열로 넣어서 이 문제를 안 겪는다. 정리하면 Next 16.2.0에서 앱 라우터 라우트 핸들러 응답은 내장 압축을 사실상 받지 못한다.

여기에 CloudFront 엣지 압축도 겹쳐 실패했다. CloudFront는 오리진 응답에 `Content-Length`가 있어야 크기(1,000B~10MB)를 확인하고 압축한다. 라우트 핸들러 응답은 스트림으로 흘러 `chunked`라 길이가 없다. 오리진도, 엣지도 압축하지 않은 이유가 여기서 둘 다 설명됐다.

### 어떻게 고칠지

세 가지를 놓고 봤다.

- 응답에 `Content-Length`만 달아 CloudFront 엣지가 압축하게 한다. 코드는 한 줄이지만 CloudFront 뒤에서만 효과가 있다. 로컬이나 다른 앞단에서는 날것이고, 압축이 인프라 설정(비헤이비어 `Compress`, 캐시 정책 gzip/br)에 조용히 기대게 된다.
- Next 설정으로 푼다. `compress`는 켜고 끄는 것뿐이라 이 판정을 바꿀 방법이 없다.
- 라우트에서 직접 압축한다. 어느 앞단이든 같은 결과가 나오고 단위 테스트로 고정할 수 있다.

세 번째로 했다. 티켓에도 "라우트에서 직접 gzip을 걸어야 하면 두 앱 공통 코드로"라고 적어 둔 터라 `@plick/core/tweet-proxy`에 `tweetProxyResponse(request, id)`를 만들고 두 앱 라우트는 그걸 부르는 세 줄이 됐다.

압축은 `node:zlib` 동기 함수로 한다. `Accept-Encoding`을 파싱해 br을 gzip보다 먼저 고르고, `q=0`(그 인코딩을 거부한다는 표기)은 고르지 않는다. 1KB 미만은 압축하지 않는다. 없는 트윗의 `{"data":null}`(13바이트)은 gzip 헤더만으로 더 커진다. 브로틀리 품질은 기본 11 대신 5로 뒀다. 11은 수십 KB에도 몇 ms를 쓰는데, 응답이 CDN과 브라우저에 하루 캐시되긴 해도 캐시 미스마다 이벤트 루프를 막는 동기 작업이라 gzip과 비슷한 속도에서 더 작은 쪽을 골랐다. 본문을 미리 다 만들고 보내므로 `Content-Length`도 단다.

헤더에는 `Content-Encoding`과 함께 `Vary: Accept-Encoding`을 직접 단다. Next의 `sendResponse`는 `vary`를 여러 값 허용 헤더로 다뤄 자기 값(`rsc, next-router-...`) 뒤에 줄을 하나 더 붙인다. 이제 Next의 압축 미들웨어와 두 번 압축되지 않을까도 따져 봤다. 지금은 위 판정에서 걸러지고, Next가 나중에 이 버그를 고쳐 판정을 통과하더라도 미들웨어는 `Content-Encoding`이 `identity`가 아니면 "already encoded"로 손을 뗀다. CloudFront 쪽은 캐시 정책이 정규화된 `Accept-Encoding`(`br,gzip` 또는 `gzip`)을 캐시 키에 넣으므로 br 판과 gzip 판이 따로 캐시되고, 이미 인코딩된 응답은 엣지가 다시 압축하지 않는다.

같은 트윗(7,279바이트)이 br 1,443바이트, gzip 1,564바이트로 나갔다(80% 감소). 헤더 전후는 `docs/perf/2026-10-26-kan-673/tweet-api-headers.txt`에 남겼다.

## 지워진 트윗: 404를 200 `{ data: null }`로

프록시는 신디케이션 API가 트윗을 못 찾으면(원문 삭제, 비공개 전환) 404를 줬다. 클라이언트 `TweetEmbed`는 react-tweet의 `useTweet`(SWR 래퍼)이 404를 에러로 확정하면 "원문이 삭제됐거나 불러오지 못했어요"를 세워서 화면상으로는 문제가 없었다. 문제는 콘솔이다. 브라우저는 4xx·5xx 응답을 받으면 자바스크립트가 그걸 어떻게 처리하든 `Failed to load resource: ... 404` 줄을 콘솔에 남긴다. 페이지 코드로는 지울 수 없어서 Lighthouse `errors-in-console`에 걸린다.

그래서 서버 쪽 계약을 바꿨다. 없는 트윗은 200에 `{ "data": null }`이다. react-tweet의 fetcher는 `res.ok`면 `json.data || null`을 돌려주고, `TweetEmbed`는 이미 `data === null`을 실패와 같게 보고 같은 안내 문구를 세운다. 클라이언트 코드는 주석만 바꿨다. 캐시는 성공(하루)보다 짧게 한 시간으로 뒀다. 지운 트윗이 되살아나지는 않지만 신디케이션이 잠깐 못 찾는 경우까지 하루 동안 굳히지 않으려는 것이다. 숫자가 아닌 id(400)와 신디케이션 장애(502)는 진짜 오류라 상태 코드를 유지하고 캐시도 하지 않는다.

## 웹 릴스 첫 트윗 선로드

웹 릴스는 KAN-667에서 익명 ISR(빌드나 재생성 때 HTML을 만들어 CDN에 두고 60초마다 갱신)이 돼서 HTML 자체는 CDN에서 바로 온다. 그런데 첫 릴이 트윗 임베드라 LCP 요소가 트윗 본문 `<p>`이고, 그 본문은 이 순서로만 생겼다. HTML 도착 → JS 다운로드·실행 → 하이드레이션 → `TweetEmbed`가 `/api/tweet/{id}` 요청 → 응답 → 렌더. HTML이 빨라도 LCP는 이 체인 끝을 기다린다.

모바일은 KAN-422에서 이 체인을 끊었다. 서버 컴포넌트(`ReelsFeedSection`)가 첫 릴의 트윗을 `unstable_cache`(Next Data Cache, 하루)로 받아 `seedTweet`으로 내려주고, `TweetEmbed`는 씨앗이 있으면 fetch를 건너뛰고 서버 렌더 때 바로 그린다. 첫 미디어 사진이 있으면 `<link rel="preload" as="image">`도 렌더한다. 웹도 같은 구조로 옮겼다. `ReelsFeedSection`과 딥링크 `/reels/[postId]` 페이지가 씨앗을 받고, `ReelsWorkspace` → `ReelViewer` → `ReelItem` → `TweetEmbed`로 내린다. 피드가 refetch로 바뀌면 첫 릴이 달라질 수 있어서, 씨앗은 `reelId`가 일치하는 릴에만 붙인다(모바일과 같은 규칙).

여기서 걸리는 게 하나 있었다. 바로 앞 ADR 0211(KAN-672)에서 모바일 릴스 #418의 원인이 react-tweet `EmbeddedTweet`의 작성 시각이었다. 타임존 없이 포맷해 서버(EC2, UTC)와 브라우저(KST)의 글자가 다르다. 웹은 지금까지 임베드를 클라이언트에서만 그려서 이 문제를 비켜 갔는데, 서버 렌더를 시작하면 똑같이 깨진다. 그래서 모바일이 만든 `KstEmbeddedTweet`(같은 부품으로 다시 조립하고 시각 줄만 KST 고정 포맷)와 아바타 교체 `TweetAvatarImg`를 웹도 써야 했다.

웹 `CLAUDE.md`는 모바일에 있고 앱 중립적이면 `@plick/ui`로 승격하라고 한다. 두 컴포넌트는 앱 모듈을 참조하지 않아 ADR 0011의 게이트를 넘는다. 걸린 건 의존성이었다. `KstEmbeddedTweet`은 `react-tweet`을 import하는데 `@plick/ui`의 `package.json`에는 그게 없다. pnpm은 패키지마다 자기 `node_modules`만 보이는 엄격한 구조라, 앱이 `react-tweet`을 갖고 있어도 `packages/ui/src/...` 파일에서 하는 import는 `packages/ui/node_modules`에서 찾는다. 선언 없이는 해석이 안 된다. `pnpm add react-tweet@^3.3.1 --filter @plick/ui`로 선언했고, lockfile은 pnpm이 고쳤다(직접 편집은 가드 훅이 막는다).

옮기고 나니 `@plick/ui` 린트가 하나 걸렸다. `TweetAvatarImg`의 `// eslint-disable-next-line @next/next/no-img-element`가 ui 패키지에서는 "정의되지 않은 규칙" 경고가 된다. ui 린트 설정에는 Next 플러그인이 없어서다. 같은 패키지의 `TweetMediaImg`도 주석 없이 `<img>`를 쓰고 있어 그 줄을 지웠다.

## 공용으로 올린 것과 앱에 남긴 것

트윗 링크 파싱(`tweetIdFromUrl`)은 두 앱 `_utils/tweet.ts`에 같은 코드로 있었고, 웹이 preload를 하면서 `tweetImageUrl`·`tweetImageSrcSet`까지 두 벌이 될 참이었다. 셋과 `ReelSeedTweet` 타입을 `@plick/core/tweet`으로 올리고 두 앱의 `_utils/tweet.ts`를 지웠다. `@plick/core`는 이미 `react-tweet`을 의존하고 있어(핫이슈 사진용 `tweet-media.ts`) 추가 의존이 없다.

씨앗을 받는 서버 함수 `getReelSeedTweet`은 앱마다 `_services/tweet.ts`로 남겼다. `unstable_cache`가 `next/cache`인데 `@plick/core`는 `next`를 의존하지 않는다. 의존을 늘리거나 캐시 함수를 주입받게 만드는 대신, 스무 줄짜리 서버 fetcher를 두 벌 두는 쪽을 택했다. 핵심 규칙(어느 릴에 붙이나, preload 주소)은 이미 core에 있다.

## 검증

단위 테스트 `tests/unit/tweet-proxy.test.mjs`를 붙였다. `Accept-Encoding` 협상(br 우선, `q=0` 거부, `*`), gzip·br 본문이 원래 JSON으로 풀리는지, 1KB 미만과 압축 미요청은 그대로 가는지, `Content-Length`와 `Vary`, 링크 파싱을 본다.

두 앱을 prod BE로 빌드해 `next start`로 띄우고 curl과 브라우저, Lighthouse로 봤다.

- 두 앱 `/api/tweet/{id}`: br·gzip 모두 `content-encoding`, `content-length`, `vary: Accept-Encoding`. 없는 트윗(`/api/tweet/1`)은 200 `{"data":null}`, `max-age=3600`.
- 웹 `/reels`·`/reels/[postId]` HTML에 첫 트윗 임베드가 들어 있고, 작성 시각이 서버에서 이미 KST(`8:48 AM · Oct 26, 2026`, `dateTime=2026-10-25T23:48:28Z`)다. 사진 있는 릴(`/reels/10141`)은 preload `href`와 렌더된 `<img src>`가 글자까지 같다.
- 브라우저에서 첫 릴 트윗은 `/api/tweet` 요청이 나가지 않고, 하이드레이션 뒤 #418이 없다.

웹 릴스 Lighthouse(데스크톱 프리셋)는 develop을 같은 조건으로 워크트리에 빌드해 번갈아 세 번씩 돌렸다(`docs/perf/2026-10-26-kan-673/lighthouse-web-reels-local.tsv`).

|              | LCP 실측  | FCP 실측 | LCP 시뮬  | uses-text-compression |
| ------------ | --------- | -------- | --------- | --------------------- |
| 전 (develop) | 748~812ms | 62~85ms  | 945~988ms | 실패, 28KiB 절감 추정 |
| 후           | 75~94ms   | 75~94ms  | 906~908ms | 통과                  |

LCP 요소는 전후 모두 트윗 본문 `<p>`인데, 후에는 LCP가 FCP와 같은 순간에 찍힌다. 첫 페인트에 이미 본문이 있다는 뜻이다. 시뮬 LCP가 조금만 줄어든 건 Lighthouse 시뮬레이션이 느린 네트워크를 가정해 폰트·JS 비용을 크게 잡기 때문이고(모바일 메모의 텍스트 LCP 시뮬 아티팩트와 같은 성질), 실측 차이가 체인이 끊겼는지를 직접 보여 준다. 모바일 릴스도 같은 Lighthouse에서 `uses-text-compression`이 통과했다. 콘솔 에러는 두 앱 모두 조회 기록 403뿐인데, 로컬 origin에서 prod BE를 부를 때 생기는 환경 차이라 이번 범위 밖이다.

### 로컬 ISR 캐시에 속을 뻔한 일

웹 딥링크를 처음 확인할 때 임베드가 0개였다. 처음 띄운 `web-prod` 설정은 런타임 `API_BASE_URL`이 없어 BE를 `localhost:8080`으로 불렀고, `/reels/[postId]`는 빌드 때가 아니라 첫 요청 때 그려 캐시하는 라우트(빈 `generateStaticParams`, KAN-632·KAN-667)라 그 실패한 렌더가 `.next`의 ISR 캐시에 기록됐다. prod BE를 보는 `web-prodbe-alt`로 다시 띄워도 첫 요청은 그 캐시를 stale로 내주고 뒤에서 재생성했다. 두 번째 요청(`x-nextjs-cache: HIT`)부터 임베드가 나왔다. 코드 문제가 아니라 디스크 ISR 캐시가 서버를 갈아 끼워도 남는다는 점이다.

## 남은 것

- prod 배포 뒤 완료 조건 재확인: `curl -H 'Accept-Encoding: gzip' https://{m.,}plick.co.kr/api/tweet/{id}`의 `content-encoding`, 웹 릴스 Lighthouse.
- CloudFront는 지금 `/api/tweet/*`의 비압축 응답을 오리진 `max-age=86400`에 따라 최대 하루 들고 있다. 배포 직후 바로 보려면 `/api/tweet/*` 무효화가 필요하고, 그냥 두면 하루 안에 바뀐다.
- 검증 중 웹 홈 첫 로드에서 #418이 한 번 보였다. 웹 홈은 `TweetEmbed`를 쓰지 않아 이번 변경과 무관하고, 따로 보지 않았다.
