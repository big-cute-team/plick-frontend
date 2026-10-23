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

## 구현: 로그인 확인을 서버 렌더에서 브라우저로 옮기다

문제를 다시 정의한 뒤 방안을 다섯으로 놓고 골랐다. 레이아웃 분리(A), 부분 프리렌더(B), 헤더만 완화(C), 증상만 가리기(D), 그리고 원인 제거(E). E는 레이아웃이 쿠키를 읽는 이유 자체를 없앤다. "게스트다/소셜이다"는 비밀이 아니니 프록시가 토큰 옆에 읽을 수 있는 표식 쿠키를 심고, `AuthProvider`가 서버 시드 없이 브라우저에서 그걸 읽어 시작하면 레이아웃은 요청을 읽을 일이 없다. A는 E에 흡수되고, B는 Next 실험 기능에 앱 전체를 걸어야 해서 뺐으며, C는 BE 분리가 끝나면 떼야 할 임시 처방인데 복원 뒤 갱신 코드와 CloudFront 확인이 따라붙어 수지가 안 맞았다. 기사·릴스·투표처럼 페이지가 토큰을 실어 `likedByMe`를 받는 화면은 BE 일괄 조회 API(KAN-663)가 생긴 뒤 KAN-664에서 ISR로 돌리기로 하고, 이번에는 레이아웃과 익명 화면까지로 범위를 잡았다.

### 착수 전에 새로 안 것

레이아웃만 고치면 끝이 아니었다. 서버 `apiFetch`가 분석 헤더(`X-Plick-*`)를 BE에 옮겨 싣느라 `getAnalyticsHeaders()`가 `headers()`를 부른다. 서버에서 데이터를 받는 페이지는 이것 때문에 레이아웃과 무관하게 동적이 된다. 익명 GET은 어차피 데이터 캐시로 모든 사용자가 한 응답을 나눠 쓰니(첫 요청자의 헤더가 캐시에 박힐 뿐) 사람별 헤더를 실을 의미가 없다. 그래서 공유 캐시를 타는 익명 GET에는 제공자를 부르지 않게 했다.

`useAuth`를 쓰는 7곳 중 렌더 시점에 로그인 여부로 모양이 갈리는 건 라이브 채팅 패널 하나였다. 나머지(댓글 작성, 좋아요, 투표, 로그인 유도)는 클릭 시점에만 본다. 그래서 첫 페인트 전에 값을 올리기만 하면 깜빡임 걱정이 없었다.

로그인 화면은 `getMyProfile()`로 세션 유효성을 확인해 소셜 사용자를 홈으로 돌려보내므로 동적으로 남긴다. 티켓에 "로그인·회원가입 ○"라고 썼지만 회원가입만 해당한다.

### 표식 쿠키와 AuthProvider

`sessionKind` 쿠키(값 `guest`|`user`, HttpOnly 아님, 수명은 refresh와 같은 14일)를 토큰을 심는 자리 전부에 같이 심었다. 프록시의 첫 진입 게스트 발급과 access 만료 뒤 재발급, 서버 액션의 소셜 로그인·연동·로그아웃. 지우는 자리도 같다. 발급 실패, 재발급 2회 실패로 로그인 리다이렉트, 로그아웃 초입, 탈퇴. `guestExpiresAt`도 HttpOnly를 풀어 토스트가 브라우저에서 마감 문구를 만든다.

`AuthProvider`는 서버 prop을 전부 버리고 `useState(undefined)`로 "모름"에서 시작한다. 서버 HTML은 쿠키를 모르는 상태로 그려야 하고(서버가 안 읽기로 했으니) 하이드레이션 첫 패스도 같은 "모름"이어야 불일치가 없다. 그 다음 `useLayoutEffect`에서 쿠키를 읽어 state로 올린다. 레이아웃 이펙트는 브라우저가 첫 프레임을 그리기 전에 돌고 그 안의 setState는 동기 재렌더라 사용자는 "모름"을 한 프레임도 보지 않는다. 처음엔 `<head>` 동기 스크립트로 `<html>`에 값을 박아 둘 생각이었는데, 하이드레이션 첫 패스는 어차피 서버 스냅샷으로 그려야 해서 미리 박아 둔 값을 쓸 수 없었다. `useSyncExternalStore`도 봤지만 서버 스냅샷과 다를 때의 교정이 passive effect에서 일어나 페인트 뒤가 될 수 있어 버렸다. pathname이 바뀔 때마다 다시 읽어 서버 액션 로그인·로그아웃의 `redirect` 뒤를 따라가고, bfcache 복원(`pageshow`의 `persisted`)에도 다시 읽는다.

프로필(닉네임·userId)은 `useProfileSeed`가 `/be/api/v1/users/me`를 TanStack Query로 받는다. 토큰은 프록시가 Bearer로 옮겨 싣는다. 쿼리 키에 세션 종류가 들어 있어 로그인·로그아웃 뒤 자동으로 다시 받고, 그 전까지 직전 값을 들고 있어 닉네임이 깜빡이지 않는다.

`readCookie`에 `decodeURIComponent`를 넣었다. Next가 쿠키 값을 인코딩해 적어서 마감 시각의 `:`·`+`가 `%3A`·`%2B`로 읽혔다.

### 광고 모드

레이아웃이 `headers()`로 읽던 앱 셸 여부는 `AdsProvider`가 `navigator.userAgent`로 브라우저에서 정한다. 서버 렌더는 `off`다. 애드센스 로더 `<script>`는 크롤러가 HTML에서 봐야 해서 JS로 늦게 넣을 수 없고, 서버가 UA를 모르니 앱 셸에서만 뺄 수도 없다. 그래서 prod면 항상 넣되 그 앞의 동기 스크립트(`adsPauseScript`)가 앱 셸 UA면 `adsbygoogle.pauseAdRequests = 1`을 세운다. 애드센스가 동의 관리용으로 제공하는 스위치라 자동 광고까지 요청이 안 나간다. 프록시 판정과 같은 정규식을 쓰려고 `PLICK_APP_UA_PATTERN`을 `@plick/core/analytics`에서 export했고 단위 테스트에 앱 셸·사파리·인스타 세 UA를 넣었다.

### 빌드 표가 바뀌는 걸 보기까지

첫 빌드에서 홈이 `○` Revalidate 20s, FAQ·약관·개인정보·회원가입·라이브 채팅이 `○`로 바뀌었다. 20초는 홈 띠의 라이브 경기 fetch revalidate를 따라간 값이다.

빌드 로그에 `/debates`·`/reels`가 "Dynamic server usage: couldn't be rendered statically because it used cookies"를 "초기 로드 실패"로 찍고 있었다. 섹션 catch가 Next의 정적 생성 중단 예외를 삼킨 것이다. 라우트 판정은 맞게 됐지만 로그가 오해를 부르고 Next 문서가 `unstable_rethrow`를 권해서 릴스·투표·홈 섹션 catch에 넣었다.

인물·선수·팀 프로필은 `ƒ`로 남았다. 팀은 slug 6개가 고정이라 `generateStaticParams`를 넣어 `●`(빌드 때 전부 생성, ISR)로 바꿨다. 인물·선수는 수가 많아 빈 배열만 선언했다. Next는 이 함수가 아예 없는 동적 세그먼트를 요청마다 렌더로 다루고, 있으면 목록 밖 값도 첫 요청에 그려 fetch revalidate만큼 캐시한다. 그 뒤 둘 다 `●`가 됐다.

### standalone을 띄우지 않았으면 배포 뒤에 봤을 것

빌드 산출물을 로컬에서 띄워(`node .next/standalone/apps/mobile/server.js`, prod BE) 헤더를 찍었다. 첫 실행 로그에 "Page changed from static to dynamic at runtime /teams/arsenal/profile, reason: headers"가 떴다. 분석 헤더 제공자 건너뛰기 조건을 "기본 60초 캐시를 붙일 대상"(`cacheable`)으로만 잡아서, 라이브 띠(`revalidate: 20`)와 팀·선수 프로필처럼 호출부가 직접 캐시 수명을 준 익명 GET은 여전히 제공자를 불렀고 그 안의 `headers()`가 ISR 재생성 중에 터진 것이다. 빌드 때는 통과하고 런타임 재생성 때만 나는 에러다. 조건을 "익명 GET이고 `no-store`·`revalidate: 0`이 아니면"(`shared`)으로 넓혔다.

CloudFront는 모바일·웹·admin 배포 모두 기본 비헤이비어 캐시 정책이 Managed-CachingDisabled였다. `s-maxage`가 나가도 CDN은 문서를 저장하지 않으니 프록시가 정적 응답에 심는 게스트 토큰이 남에게 나갈 길은 없다. CDN 문서 캐시는 게스트 발급을 페이지 응답에서 뗀 뒤(KAN-665) 연다.

### 조회수 중복과 읽던 자리

둘 다 "이 문서가 뒤로가기로 다시 받아진 것인가"를 알아야 해서 `isBackForwardLanding()` 하나로 가른다. `performance.getEntriesByType("navigation")[0]`의 `type`이 `back_forward`이고 그 항목의 `name`(문서 첫 주소)이 지금 `location.href`와 같을 때다. 이 타이밍 항목은 문서에 하나라 `pushState`·`replaceState`로 주소가 바뀌어도 `type`이 그대로다. 주소까지 대조해야 뒤로가기로 받은 문서 안에서 다른 기사로 옮긴 새 열람을 걸러내지 않는다. 릴스는 스와이프마다 `replaceState`로 주소를 바꾸니 첫 릴만 걸린다.

`useArticleView`는 뒤로가기 착지면 조회 POST를 건너뛴다. `useScrollRestore`는 복원 키가 없는 기사 세부도 `sessionStorage`에 주소별로 위치를 적고, 뒤로가기 착지면 되돌린다. 여기서 두 번 막혔다.

하나는 저장 시점이다. rAF에 맡긴 저장은 사용자가 스크롤 직후 바로 떠나면 아직 안 돌았을 수 있다. 브라우저 패널이 숨겨져 rAF가 멈춘 상태에서 재현됐는데, 실제 사용자에게도 같은 구멍이다. `pagehide`에서 동기로 한 번 더 적는다.

다른 하나는 기사 세부의 `loading.tsx`다. 뼈대도 같은 `ScrollArea`라 뼈대 인스턴스가 저장값을 먼저 가져가 짧은 문서에서 되돌리다 실패하고, 언마운트 정리에서 0을 덮어 써 본문 인스턴스가 받을 값이 없었다. 읽을 때 지우지 않고 "되돌리는 데 성공한 인스턴스"가 끝났다고 표시하게 바꿨고, 한 번도 스크롤되지 않은 인스턴스의 정리는 저장값을 건드리지 않는다.

### 전후

| 항목                           | 전                                                                | 후                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 빌드 표 페이지 라우트          | 24개 전부 ƒ                                                       | ○ 8(홈·FAQ·약관·개인정보·회원가입·라이브 채팅·준비중·404), ● 4(팀 허브·팀 프로필·인물·선수), ƒ 12                      |
| 응답 `Cache-Control`           | 전 화면 `private, no-cache, no-store, max-age=0, must-revalidate` | FAQ·회원가입 `s-maxage=31536000`, 홈·팀 허브 `s-maxage=20`, 팀 프로필 `s-maxage=60`, 기사·릴스·투표·로그인·MY는 그대로 |
| Lighthouse `bf-cache`          | 18/18 실패                                                        | 홈·FAQ·팀 프로필 통과, 기사 실패(동적, KAN-664)                                                                        |
| 뒤로가기 재로드 때 조회수 POST | 한 번 더                                                          | 없음                                                                                                                   |
| 기사에서 원문 보고 돌아올 때   | 맨 위                                                             | 읽던 자리                                                                                                              |
| `layout.tsx`의 요청 읽기       | `cookies()` 2회, `headers()` 1회                                  | 0                                                                                                                      |

로컬 standalone 헤더는 `docs/perf/2026-10-15-kan-632/headers-after-local.txt`, 빌드 표는 `build-after-routes.txt`, Lighthouse는 `lighthouse-after-local.tsv`에 있다. prod 배포 뒤 1편과 같은 방법(라이트하우스 3회 중앙값, 시뮬레이터에서 x.com 다녀온 뒤 ALB 로그)으로 다시 잰다.

2026-10-23에 이 작업이 KAN-664·665와 함께 main에 나간 뒤 prod를 다시 쟀다. `m.plick.co.kr`의 홈·FAQ·기사 상세·릴스·투표·팀 프로필을 Lighthouse 12.8.2로 3회씩 돌렸고 18회 모두 `bf-cache`를 통과했다. 10월 11일 감사에서 18개 라우트가 전부 실패하던 항목이다. 차단 사유는 0건이었다. 위에서 셋으로 꼽힌 사유가 전부 `no-store`였으니 문서가 `s-maxage`로 바뀐 것으로 설명이 끝난다. 같은 날 CloudFront 기본 비헤이비어 캐시 정책도 켜져서, 같은 문서를 두 번 요청하면 두 번째는 `Hit from cloudfront`이고 MY·로그인만 `no-store`로 Miss다. 시뮬레이터에서 x.com에 다녀온 뒤 문서 재요청이 사라졌는지 ALB 로그로 보는 것은 이번에는 하지 않았고, 대신 콘솔 적용 전후 한 시간의 ALB 문서 요청 수를 비교했다. 수치와 과정은 [ADR 0204](0204-web-render-cache-port.md)의 "배포 뒤" 절에 있고 원자료는 `docs/perf/2026-10-23-kan-667/`다.

### 남긴 것

- 홈이 빌드 때 BE를 불러 미리 그려진다. CI 빌드 환경에서 BE에 닿지 않으면 첫 20초(revalidate)까지 빈 섹션이 나간다. dev 배포에서 확인할 몫이다.
- 기사·릴스·투표의 ISR은 KAN-663(BE 일괄 조회)과 KAN-664. 게스트 발급 분리와 CDN 문서 캐시는 KAN-665. 웹 이식은 KAN-643.
- 로컬 http에서 iOS 시뮬레이터 Safari로 FAQ를 열면 "너무 많은 재이동"이 났다. 프록시의 refresh 재시도 리다이렉트 쿠키(`refreshRetry`, `Secure`)를 Safari가 http://127.0.0.1에선 저장하지 않아 같은 URL로 도는 것으로 보인다. prod(https)에는 없는 조건이고 이번 변경과 무관해 범위에서 뺐다.
