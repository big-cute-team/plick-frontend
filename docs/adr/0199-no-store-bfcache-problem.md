# 0199. 전 라우트 no-store와 뒤로가기 캐시: 문제를 정의하러 갔다가 전제가 틀린 걸 알았다 (KAN-632)

## 어떻게 시작됐나

10월 11일 prod 모바일 전 화면을 Lighthouse로 재고(`docs/audits/2026-10-11-lighthouse-prod-mobile.md`) 티켓 아홉 개를 만들었다. 그중 KAN-624(핫이슈 사진 변형)와 KAN-625(브랜드 자산), KAN-627(색 대비), KAN-629(폰트 체인 검증)를 끝내고 남은 성능 티켓을 줄 세웠을 때 맨 앞에 온 게 KAN-632다. 티켓 제목은 "전 라우트 no-store 때문에 막힌 뒤로가기 캐시(bfcache) 복원 여부를 정하고 정적 가능한 화면부터 푼다"이고, 18개 화면 전부가 `bf-cache` 감사에 실패한 게 출발점이다.

이번 세션도 KAN-624 때처럼 블로그 글을 같이 쓰면서 진행한다. 문제 상황, 해결 방안 고민, 해결, 결과 순으로 글을 쌓고 사진 찍을 자리를 미리 정해 둔다. 이 글은 그 첫 번째, 문제 상황이다. 결론부터 말하면 티켓에 적어 둔 전제 두 개가 재 보니 틀렸고, 문제는 생각했던 자리가 아니라 다른 자리에 있었다.

## Lighthouse가 본 것

bfcache(back/forward cache)는 브라우저가 떠나는 페이지를 메모리에 통째로 얼려 두는 기능이다. DOM, JS 힙, 스크롤 위치, 입력 중이던 폼까지 그대로 둔 채 보관했다가 뒤로가기나 앞으로가기로 돌아오면 네트워크 요청 없이 그 순간으로 되돌린다. 조건이 까다롭다. 응답에 `Cache-Control: no-store`가 있거나, `unload` 리스너가 달려 있거나, 열린 WebSocket이 있으면 들어가지 못한다.

오늘 다시 한 번 홈을 재 봤다. Lighthouse 12.8.2 CLI, 기본 모바일 프로파일, 비로그인, 1회.

| 항목      | 값             |
| --------- | -------------- |
| 성능 점수 | 75             |
| LCP       | 8.1초          |
| bf-cache  | 실패, 사유 3건 |

사유 셋은 전부 `no-store`다. 문서 자체가 `no-store`라는 것, 메인 리소스가 `no-store`라는 것, JS가 받은 네트워크 응답 중에 `no-store`가 있다는 것. 세 번째는 Next의 RSC 페이로드(`?_rsc=`)와 `/be` API 응답이 같은 헤더를 달고 오기 때문이다.

## 왜 전부 no-store인가

curl로 prod 응답 헤더를 받아 보면 화면을 가리지 않고 똑같다. 홈, FAQ, 약관, 릴스, 기사, 투표, 로그인 전부 아래 한 줄이다.

```
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
x-cache: Miss from cloudfront
```

FAQ와 약관은 유저별 데이터가 한 줄도 없는 화면이다. `apps/mobile/app/faq/page.tsx`는 `@plick/ui`의 `FaqBody` 컴포넌트와 JSON-LD를 그리는 게 전부고 `fetch`도 `cookies()`도 없다. 그런데도 "이 응답은 이 사람 전용이니 어디에도 저장하지 말라"는 헤더를 달고 나간다.

빌드 출력을 보면 이유가 보인다. develop을 로컬에서 `next build` 하면 라우트 표가 나오는데, 페이지 라우트는 전부 `ƒ`(Dynamic, 요청마다 서버 렌더)이고 `○`(Static, 빌드 때 미리 렌더)는 `robots.txt`, `manifest.webmanifest`, `icon.png`처럼 파일 라우트뿐이다.

```
Route (app)
┌ ƒ /
├ ○ /ads.txt
├ ƒ /articles/[postId]
├ ƒ /debates
├ ƒ /faq
├ ○ /icon.png
├ ƒ /live
├ ○ /llms.txt
├ ƒ /login
├ ○ /manifest.webmanifest
├ ƒ /me
├ ○ /opengraph-image.png
├ ƒ /privacy
├ ƒ /reels
├ ○ /robots.txt
├ ƒ /signup
├ ƒ /teams/[slug]
└ ƒ /terms

ƒ Proxy (Middleware)
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Next App Router는 빌드 때 라우트마다 "요청 없이도 그릴 수 있나"를 판정한다. 렌더 중에 `cookies()`나 `headers()`, `searchParams`처럼 요청이 있어야 값이 정해지는 API를 부르면 그 라우트는 동적이 된다. 요청마다 Node가 React 트리를 새로 돌려 HTML을 만들고, 그 HTML은 그 요청의 쿠키에 따라 달라질 수 있으니 Next는 `no-store`를 박아 CDN이나 브라우저가 다른 사람에게 돌려주지 못하게 막는다. 헤더 자체는 보호 장치다. 문제는 그게 전 화면에 걸렸다는 것이다.

걸린 자리는 루트 레이아웃이다. `apps/mobile/app/layout.tsx`의 `RootLayout`은 이렇게 시작한다.

```tsx
const loggedIn = await isLoggedIn(); // cookies().has(accessToken)
const guestExpiresAt = await getGuestExpiresAt(); // cookies().get(guestExpiresAt)
const profile = loggedIn ? getProfileSeed() : Promise.resolve(null);
const adsMode = resolveAdsMode(
  ADS_BASE_MODE,
  (await headers()).get(ANALYTICS_HEADERS.browser),
);
```

레이아웃은 모든 페이지의 부모다. 레이아웃이 요청 데이터를 읽으면 그 아래 페이지가 아무리 정적이어도 트리 전체가 동적으로 판정된다. FAQ가 `ƒ`인 이유는 FAQ 때문이 아니라 FAQ를 감싼 레이아웃이 쿠키를 읽기 때문이다. 8월 31일 성능 감사의 #6("루트 `cookies()`가 전 라우트를 동적 렌더로 고정")이 바로 이 지적이었고, 그때는 22개 라우트였던 게 지금 24개일 뿐 그대로다.

레이아웃이 쿠키를 읽는 데는 이유가 있다. access 토큰은 HttpOnly 쿠키라 브라우저 JS가 못 읽는다. 좋아요 버튼이나 댓글 입력창 같은 클라이언트 아일랜드가 "지금 로그인 중인가, 게스트인가"를 알려면 서버가 판단해 내려줘야 하고, 그 값을 화면마다 prop으로 내리지 않으려고 루트에서 한 번 `AuthProvider`에 시드한다(KAN-333, KAN-514). KAN-602에서 BE를 부르는 프로필 조회는 Promise로 넘겨 기다리지 않게 했지만, 쿠키 읽기 자체는 남아 있다. 쿠키를 읽는 순간 동적이다.

## 전제 하나가 틀렸다: 앱 안 뒤로가기는 멀쩡하다

티켓에는 "bfcache가 막히면 기사에서 뒤로가기할 때 홈을 처음부터 다시 그린다. 인스타 인앱 랜딩에서 기사, 홈, 기사로 오가는 흐름이 많아 체감이 큰 자리다"라고 적어 뒀다. 코드를 건드리기 전에 이걸 먼저 재 봤다.

브라우저에서 홈을 열고 핫이슈 카드를 눌러 기사로 간 다음 뒤로가기를 눌렀다. 그리고 내비게이션 타이밍을 읽었다.

```
performance.getEntriesByType('navigation')[0].type → "navigate"
뒤로가기 뒤 새로 나간 요청: 팀 크레스트 webp 3건, /be/api/v1/events POST 1건
홈 RSC 재요청(/?_rsc=): 0건
```

`type`이 `back_forward`가 아니라 `navigate`다. 문서가 한 번도 바뀌지 않았다는 뜻이다. 기사 카드는 Next의 `<Link>`라 클릭하면 브라우저가 새 문서를 받는 게 아니라 클라이언트 라우터가 `pushState`로 주소만 바꾸고 RSC 페이로드를 받아 트리를 갈아 끼운다. 뒤로가기도 `popstate`라 같은 문서 안에서 일어난다. 그리고 Next 라우터는 뒤로가기와 앞으로가기에는 자기 캐시(Router Cache)에 둔 홈 트리를 그대로 되살린다. 서버에 홈을 다시 묻지 않았고 스크롤 위치도 그대로였다.

bfcache는 문서 간 이동(cross-document navigation)에만 관여한다. 앱 안에서 `<Link>`로 오가는 동안은 애초에 bfcache가 끼어들 자리가 없다. 티켓에 적은 "기사에서 홈으로 뒤로가기" 체감은 `no-store`와 무관했다. 이건 ADR 0189에서 다룬 탭 전환 지연과 같은 종류의 문제이고 이미 거기서 풀었다.

## 그러면 bfcache는 언제 쓰이나

문서가 바뀌는 건 사이트 밖으로 나갔다 돌아올 때다. 릴스의 트윗 임베드에서 작성자 이름이나 "Show more"를 누르면 x.com으로, 기사 하단 "원문 보기"도 x.com으로, "PC로 보기"는 plick.co.kr로 간다. 소셜 로그인은 카카오와 구글로 갔다가 돌아온다.

데스크톱 브라우저에서는 이것도 문제가 아니다. 외부 링크가 전부 `target="_blank"`라 새 탭에서 열리고 원래 탭은 그대로다. 뒤로가기가 생기지 않는다.

문제가 생기는 건 탭이 없는 브라우저다. 인스타그램 인앱 브라우저는 탭이 없어서 `_blank`를 같은 뷰에서 연다. 트윗 원문을 보고 상단 뒤로가기 화살표를 누르면 그게 진짜 문서 간 뒤로가기다. 그리고 ALB 액세스 로그로 봤을 때(10월 2일 실측) 모바일 기사 페이지 요청의 대부분이 인스타그램 인앱 브라우저다. 광고 랜딩으로 들어온 사람이 기사를 읽고, 원문을 보고, 돌아온다. 그 자리가 bfcache가 일하는 자리다.

브라우저에서 이 흐름을 문서 간 이동으로 재현했다. 주소를 직접 쳐서 기사를 열고(문서 로드), 다시 주소를 쳐서 FAQ로 간 뒤(문서 로드), 뒤로가기를 눌렀다. 크롬 계열은 `notRestoredReasons`로 bfcache에 못 들어간 이유를 알려준다.

```json
{
  "type": "back_forward",
  "ttfb": 40,
  "load": 181,
  "transferSize": 17214,
  "notRestoredReasons": {
    "url": "https://m.plick.co.kr/articles/7908",
    "reasons": [
      { "reason": "masked" },
      { "reason": "response-cache-control-no-store" },
      { "reason": "response-cache-control-no-store-with-js-network-request" }
    ]
  }
}
```

이번엔 `back_forward`고, `transferSize` 17KiB에 `load` 181ms가 찍혔다. 서버에서 HTML을 다시 받아 처음부터 그렸다는 뜻이다. 이유는 Lighthouse와 같은 `no-store` 둘이다.

## Safari도 다시 받는다, 그런데 티가 안 났다

인스타그램 인앱 브라우저는 iOS에서 WKWebView, 즉 Safari와 같은 WebKit 엔진이다. iOS 시뮬레이터 Safari로 같은 흐름을 돌렸다. 릴스를 열어 세 번째 릴("PSG, 맨시티 상대로 4-1 리드")까지 넘긴 뒤 주소창에 x.com을 쳐서 나갔다가 뒤로가기를 눌렀다.

돌아오자마자 세 번째 릴이 그대로 떠 있었다. 처음엔 Safari가 `no-store`를 무시하고 페이지를 복원한 줄 알았다. 앱의 스크롤 복원 스토어(`useViewState`)는 일부러 persist를 안 붙여서 새로고침이면 첫 릴부터 시작하게 돼 있으니, 같은 릴이 보인다면 복원이 맞아 보였다.

사진만으로는 못 가린다. prod ALB 액세스 로그를 받아 시뮬레이터 UA(`Version/26.5`)의 요청을 시간순으로 늘어놓았다.

```
05:24:58  GET  /reels
05:25:16  POST /be/api/v1/articles/8318/view?rank=1     ← 두 번째 릴로 넘김
05:25:20  POST /be/api/v1/articles/8294/view?rank=2     ← 세 번째 릴로 넘김
          (x.com에 다녀옴)
05:25:38  GET  /reels/8294                              ← 뒤로가기
05:25:38  POST /be/api/v1/articles/8294/view?rank=0     ← 같은 릴 조회수 한 번 더
```

뒤로가기 시각에 `GET /reels/8294` 문서 요청이 새로 찍혔다. 복원이 아니라 새 로드였다. 같은 릴이 보인 이유는 따로 있었다. 릴스 피드는 스와이프할 때마다 주소를 지금 보는 릴의 딥링크(`/reels/{id}`)로 바꿔 둔다. Safari는 그 주소를 서버에서 새로 받았고, 딥링크 페이지는 그 릴부터 그리니 결과만 보면 같은 릴이다. 그 대가로 HTML과 RSC, 트윗 임베드를 전부 다시 받았고, 같은 릴의 조회수 POST가 `rank=0`으로 한 번 더 나갔다. 돌아올 때마다 조회수가 하나씩 부풀고, 세 번째 릴 위로 넘겨 봤던 두 릴은 피드에서 사라진다.

기사도 같다. 기사 중간까지 읽다 원문을 보고 돌아오면 맨 위에서 다시 시작한다. 스크롤 복원 스토어가 메모리라 새 문서에는 없다.

## TTFB는 문제가 아니었다

전 라우트가 동적이면 매 요청이 EC2의 Node를 거친다. 그게 느린가도 재 봤다. 게스트 쿠키를 들고 prod에 20번씩 요청해 첫 바이트까지 시간을 쟀다.

| 경로          | 종류      | p50  | p95   |
| ------------- | --------- | ---- | ----- |
| `/robots.txt` | 정적 파일 | 59ms | 193ms |
| `/faq`        | 동적 렌더 | 60ms | 127ms |
| `/`           | 동적 렌더 | 67ms | 137ms |

정적 파일과 차이가 없다. KAN-602 이후 레이아웃이 BE를 기다리지 않고, FAQ는 데이터가 없으니 렌더는 CPU 몇 ms다. 쿠키 없는 첫 방문은 프록시가 게스트를 발급하느라 BE를 한 번 다녀오는데 그것도 40ms 안팎이었다. 감사 때 FCP가 0.9초와 3.0초 두 묶음으로 갈린 건 1회 측정의 TTFB 편차가 시뮬레이션에 증폭된 것이지 정적화로 풀 문제가 아니다.

그러니 "동적이라 느리다"는 서사는 없다. 동적이라 생기는 비용은 다른 데 있다. 응답을 아무도 저장하지 못한다는 것이다.

## 다시 정의한 문제

처음 티켓은 "뒤로가기가 느리다"였다. 재 보고 나니 이렇게 바뀐다.

1. 인스타그램 인앱 브라우저처럼 탭이 없는 환경에서 원문이나 로그인으로 나갔다 돌아오면 페이지를 통째로 다시 받는다. 크롬 계열은 `notRestoredReasons`로, Safari는 ALB 로그로 확인했다. 릴스는 보던 릴 하나만 남고 조회수가 한 번 더 찍히며, 기사는 읽던 자리를 잃는다. 원인은 전 라우트의 `no-store`다.
2. FAQ, 약관, 개인정보, 로그인, 회원가입처럼 유저별 데이터가 없는 화면까지 유저별 응답으로 취급된다. CloudFront도 브라우저도 저장하지 못하고(`x-cache: Miss`) 매 요청이 EC2 렌더다. 지금 TTFB로는 티가 안 나지만 캐시 0인 구조다.
3. 그 뿌리는 루트 레이아웃이 `cookies()`와 `headers()`를 읽는 것이다. 페이지가 아니라 레이아웃이라서 24개 페이지 라우트가 한 번에 동적이 됐다.
4. Lighthouse `bf-cache` 18/18 실패는 이 구조의 지표다.

앱 안 뒤로가기는 손댈 게 없다. 이미 Next 라우터 캐시가 복원한다.

## 다음 글에서 볼 것

풀 수 있는 길이 둘로 갈린다. 하나는 유저별 데이터가 없는 화면을 레이아웃의 쿠키 읽기에서 떼어 내 정적으로 돌리는 것이다. 그러면 `no-store`가 사라지고 CDN도 탈 수 있다. 다른 하나는 홈이나 기사처럼 유저별 값이 섞인 화면의 `no-store`를 `private, no-cache`로 낮추는 것이다. `private`면 CDN은 저장하지 않고 브라우저만 저장하니 bfcache는 들어가되 남에게 새는 건 없다. 대신 bfcache로 돌아온 화면은 떠날 때 상태 그대로라 좋아요나 조회수 같은 유저별 값은 `pageshow`에서 다시 받아야 한다. 그리고 그 결정을 하기 전에 프록시(`proxy.ts`)가 정적 응답에도 게스트 쿠키를 심을 수 있는지, CloudFront가 문서를 캐시하지 않는지, 릴스 피드의 `restartFeedQuery` 경로가 복원 뒤에도 깨지지 않는지를 봐야 한다.
