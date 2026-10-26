# 0213. 서드파티 JS 지연 로드: GA는 load 뒤로, 애드센스는 승인 뒤로 (KAN-674)

## 출발점

2026-10-23 prod 재측정(`docs/perf/2026-10-23-kan-667/lighthouse-full-prod.tsv`)에서 두 앱 전 화면이
`unused-javascript`(모바일 239~277KiB, 웹 242~251KiB)와 `legacy-javascript`(13KiB)로 실패했다. 10-11 감사 때는
우리 번들이 주범이었는데 이번에는 내역 첫 줄이 애드센스의 `show_ads_impl`이고 그다음이 gtag였다. 우리 코드 몫은
Next 폴리필 13KiB뿐이었다. 그래서 원래 따로 있던 KAN-631(모바일)과 KAN-642(웹)를 KAN-674 하나로 합쳤다.

실측 LCP는 두 앱 모두 0.1~0.7초라 사용자가 느끼는 문제는 아니다. 받는 바이트와 Lighthouse 점수 문제다. 모바일 홈
성능 점수가 75로 가장 낮다.

전제는 처음부터 정해져 있었다. 애드센스는 수익이라 빼지 않는다. GA도 지표라 빼지 않는다. 둘 다 쓰면서 언제
받느냐만 바꾼다.

## 처음 세운 계획과 그게 틀렸던 이유

처음 계획은 이랬다. head의 애드센스 로더 태그는 크롤러가 HTML에서 봐야 해서(ADR 0194 덧) 그대로 두고, 무거운
`show_ads_impl`은 광고 상자를 push할 때 받아지는 것이라 보고, `AdSlot`의 push를 상자가 화면 근처에 왔을 때로
미루려 했다. IntersectionObserver(요소가 화면과 겹치는지 브라우저가 알려 주는 API)로 보다가 가까워지면 push하는
식이다. 화면 아래 광고는 보는 사람이 없으면 수익에도 거의 보탬이 안 되니 손해가 적다고 봤다.

설명까지 해 놓고 착수하기 전에, 그 전제("push를 안 하면 `show_ads_impl`을 안 받는다")를 직접 재 봤다. 추정으로
코드를 쓰면 배포하고 나서야 효과가 없다는 걸 알게 된다.

재는 방법은 이렇다. 스크래치 폴더에 HTML을 몇 개 만들고, Playwright(헤드리스 크롬을 코드로 모는 도구)로 띄우되
`page.route`로 가짜 호스트(`http://adtest.localhost/`) 요청을 가로채 그 HTML을 돌려줬다. 서버를 띄우지 않아도
진짜 http origin에서 페이지가 열린다. 그리고 `requestfinished` 이벤트로 받은 요청과 응답 크기를 다 적었다.

| 페이지                                                               | 받은 애드센스 스크립트                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| prod와 같은 로더 태그만(`adsbygoogle.js?client=ca-pub-…`), push 없음 | 로더 67,669B + `show_ads_impl.js` 192,132B, 그 뒤 doubleclick `ads?` 요청과 sodar(트래픽 품질 검사) 스크립트들 |
| 위와 같고 로더 앞에 `adsbygoogle.pauseAdRequests=1`                  | 로더 67,668B + `show_ads_impl.js` 192,132B, 광고 요청은 없음                                                   |
| 로더 주소에서 `?client=`만 뺌                                        | 로더 67,632B만                                                                                                 |

push가 없어도 로더가 `show_ads_impl`을 스스로 받는다. `pauseAdRequests`(애드센스가 동의 관리용으로 주는 광고
요청 멈춤 스위치, 앱 셸에서 쓰는 중이다)를 켜도 광고 요청만 멈출 뿐 다운로드는 그대로다. 갈리는 건 로더 주소의
`?client=`였다. 이 값이 있으면 로더는 그 게시자의 페이지 단위 설정(자동 광고, 앵커 광고 같은 것)을 처리하려고
렌더러부터 받는다. 없으면 로더만 받고, 렌더러는 `<ins data-ad-client>` 상자가 push될 때 받는다.

그리고 하나 더 알게 됐다. 두 앱 `_constants/ads.ts`의 `AD_UNITS` 슬롯 번호가 전부 빈 문자열이다. `AdSlot`은 live
모드에서 슬롯이 비어 있으면 아무것도 그리지 않는다. 애드센스 심사가 아직 안 끝나서 광고 단위를 못 만든 상태라,
prod에는 광고 상자가 하나도 없다. 10-23 측정의 250KiB는 광고를 띄워서 받은 게 아니라, 심사 때문에 head에 둔
태그 하나가 혼자 받아 온 것이다.

그러니 슬롯별 지연 push는 지금 효과가 0이다. 줄일 수 있는 건 `?client=`를 빼는 쪽뿐인데, 그 태그는 심사 중에
애드센스 크롤러(Mediapartners-Google)가 찾는 "구글이 준 스니펫 그대로"다. ADR 0194 덧에 적었듯 `next/script`로
바꿨다가 크롤러가 "코드 없음"으로 본 적이 있다. 심사 중에 그 스니펫을 바꾸는 건 250KiB와 바꿀 위험이 아니라고
판단했다. 애드센스는 이번에 손대지 않는다.

## GA: afterInteractive에서 lazyOnload로

### 전에는

두 앱 레이아웃이 `@next/third-parties/google`의 `GoogleAnalytics`를 썼다. 이 컴포넌트는 `next/script` 두 개를
낸다. 하나는 `dataLayer`를 만들고 `gtag('js')`·`gtag('config')`를 큐에 넣는 인라인 초기화, 하나는
`googletagmanager.com/gtag/js` 라이브러리다. 둘 다 기본 전략인 `afterInteractive`다.

`next/script`의 전략은 스크립트를 언제 DOM에 꽂느냐다.

- `beforeInteractive`: 서버 HTML에 넣어 하이드레이션 전에 돈다.
- `afterInteractive`: 하이드레이션 직후 클라이언트가 꽂는다. 첫 화면 JS가 아직 바쁘게 돌 때다.
- `lazyOnload`: 브라우저 `load` 이벤트가 끝나고, 그다음 `requestIdleCallback`(메인 스레드가 한가할 때 부르는
  콜백)에서 꽂는다.

`GoogleAnalytics`는 `strategy` prop을 받지 않는다. 그래서 전략을 바꾸려면 직접 실어야 했다.

### 어떻게 바꿨나

초기화와 라이브러리를 갈랐다.

초기화는 `@plick/core/analytics`의 `gaInitScript(id)`가 만드는 짧은 문자열이고, 레이아웃이 그냥 `<script>`로
body 끝에 둔다. 서버 HTML에 들어가니 파싱되는 즉시 돈다. 하는 일은 `window.dataLayer` 배열을 만들고
`gtag('js', new Date())`, `gtag('config', id)`를 그 배열에 넣는 것뿐이라 네트워크도 없고 비용도 없다.

라이브러리는 `gaScriptUrl(id)` 주소를 `<Script strategy="lazyOnload">`로 싣는다.

이렇게 가르는 이유는 gtag의 큐 구조 때문이다. gtag.js는 로드되면 `dataLayer`에 이미 쌓인 명령을 꺼내 차례로
처리한다. 그러니 초기화만 먼저 돌려 두면 `js` 시각은 진입 시점으로 찍히고, 라이브러리가 1초 늦게 와도
page_view는 그때 나간다. 측정 ID는 `JSON.stringify`로 넣어 따옴표가 섞여도 문자열 밖으로 새지 않게 했다.
단위 테스트(`tests/unit/ga-script.test.mjs`)가 `vm`에서 이 문자열을 돌려 큐 내용과 따옴표 처리를 본다.

### 첫 상호작용까지 미루지 않은 이유

티켓에는 "GA를 첫 상호작용 뒤로"라는 선택지도 있었다. 그렇게 하면 Lighthouse 측정 창 안에서 gtag가 아예 안
받아질 테니 `unused-javascript`에서 gtag 줄이 빠진다. 대신 들어와서 읽기만 하고 나가는 방문은 GA 세션에서
통째로 빠진다. 이 서비스는 기사 하나 읽고 나가는 검색 유입이 많아서 그 손실이 크다.

`lazyOnload`는 load 뒤라 그런 손실이 거의 없다. 실측 LCP가 1초 안이고 load도 그 언저리라, load 전에 탭을
닫는 방문만 빠진다. 반대로 Lighthouse의 `unused-javascript`에서 gtag 줄은 그대로 남을 가능성이 크다. Lighthouse는
load 뒤까지 기다려서 재니 lazyOnload로 받은 것도 잡힌다. 이번 변경이 노린 건 그 감사 항목이 아니라, 첫 화면 JS가
도는 동안 gtag가 메인 스레드와 대역폭을 다투지 않게 하는 것이다.

SPA 화면 전환의 page_view는 바뀐 게 없다. 전에도 지금도 GA4 향상된 측정의 "브라우저 기록 이벤트" 감지가
`history.pushState`를 보고 보낸다. 라이브러리가 오기 전 1초 안에 화면을 옮긴 경우만 그 전환이 빠질 수 있다.

### 바꾸고 나서

로컬 standalone이 아닌 `next start`(`mobile-prodbe-alt`, `web-prodbe-alt`)로 두 앱을 prod BE에 붙여 띄우고,
`NEXT_PUBLIC_GA_ID`를 prod 값으로 넣어 빌드한 뒤 같은 Playwright 방식으로 시각을 쟀다(뷰포트 412x823, 모바일).

|                               | gtag/js 요청   | load 이벤트 | page_view    |
| ----------------------------- | -------------- | ----------- | ------------ |
| prod 현행(m.plick.co.kr/faq)  | 78ms           | 854ms       | 468ms에 전송 |
| 변경 후 모바일(localhost/faq) | 151ms, load 뒤 | 133ms       | 전송됨       |
| 변경 후 웹(localhost/faq)     | 145ms, load 뒤 | 124ms       | 532ms에 전송 |

prod와 로컬은 네트워크도 애드센스 유무도 달라 절대 시각을 비교할 수는 없다. 볼 것은 순서다. 현행은 gtag가 load보다
먼저 요청되고, 바꾼 뒤에는 load가 끝나고 나서 요청된다. 그리고 page_view는 그대로 나간다.

여기서 실수를 하나 했다. GA 전송을 막으려고 `page.route`로 `google-analytics.com/g/collect`를 abort했는데,
지금 gtag는 `analytics.google.com/g/collect`로 보낸다. 패턴이 안 맞아 처음 세 번(로컬 모바일 두 번, prod FAQ 한 번)은
실제 GA로 page_view가 갔다. 로컬 두 번은 호스트가 localhost라 GA에서 호스트 이름으로 거를 수 있다. 패턴을
`(google-analytics|analytics\.google)\.com/g/collect`로 고친 뒤의 웹 확인은 `collect(blocked) page_view`로 막힌 것을
봤다. 같은 시각에 `www.google.com/g/collect`로도 요청이 하나 더 나가는데, 이건 광고 연동용 사본이라 GA 보고서
세션에는 들어가지 않는다.

`@next/third-parties` 의존성은 이제 안 쓴다. 지우려면 `pnpm-lock.yaml`이 바뀌는데 락 파일 편집은 가드가 막는 영역이라
이번 PR에서는 남겨 뒀다. 번들에는 import가 없으니 영향은 없다.

## 폴리필 13KiB: 설정으로 안 줄어서 닫는다

`legacy-javascript`가 가리킨 파일은 `/_next/static/chunks/0es4x_xzcwf3s.js`로, 로컬 빌드에서도 같은 이름이 나왔다.
Next 클라이언트 런타임이 든 226,351B짜리 청크다. 안에서 `Array.prototype.at`, `flat`, `flatMap`, `Object.fromEntries`,
`Object.hasOwn`, `Promise.prototype.finally`, `String.prototype.trimStart` 같은 폴리필 흔적을 찾았다.

출처는 `next/dist/build/polyfills/polyfill-module.js`(1,380B)다. `next/dist/client/app-globals.js`가 조건 없이
`require`한다. `browserslist`(어느 브라우저까지 지원할지 적는 설정)를 보고 넣고 빼는 구조가 아니다.

그래도 티켓이 "browserslist로 줄어드는지 확인"이라 직접 해 봤다. `apps/mobile/.browserslistrc`에 chrome·edge·firefox
120 이상, safari 17 이상을 적고 같은 env로 다시 빌드했더니 그 청크가 226,351B로 바이트까지 같았고 해시 이름도
그대로였다. 설정 파일은 지웠다.

Lighthouse가 말한 13KiB는 실제 바이트가 아니라 감지한 폴리필마다 표에서 꺼낸 추정치를 더한 값이다. 실제로는
1.4KB 남짓이고, Next를 고치지 않는 한 뺄 수 없어 그대로 둔다.

## 남은 것

애드센스는 승인 뒤에 KAN-678로 한다. 순서는 이렇다.

1. 승인되면 대시보드에서 광고 단위를 만들고 두 앱 `AD_UNITS`에 슬롯 번호를 채운다. 자동 광고는 끈다(ADR 0194).
2. 같은 PR에서 head 로더 주소의 `?client=`를 뺀다. 그러면 첫 화면에 광고 상자가 없는 페이지는 192KB짜리
   `show_ads_impl`을 받지 않는다. 승인 뒤에는 소유 확인이 ads.txt로 이미 됐고, 수동 단위는 `<ins>`의
   `data-ad-client`로 게시자를 안다.
3. 그때 처음 계획한 `AdSlot` 지연 push를 넣는다. 그러면 화면 아래 광고는 렌더러와 광고 iframe을 다 늦게 받는다.
   모바일은 홈과 기사가 안쪽 스크롤 컨테이너(`ScrollArea`) 안이라, IntersectionObserver의 `root`를 그 컨테이너로
   줘야 `rootMargin`이 먹는다. 기본 root(뷰포트)로 두면 컨테이너가 자른 영역에는 여백이 적용되지 않는다.
4. 위 셋을 넣은 뒤 같은 12개 URL을 3회씩 다시 재고, 애드센스 노출 수를 며칠 지켜본다.

GA는 배포 뒤 실시간 보고서와 다음 며칠의 일별 세션 수를 배포 전 같은 요일과 비교한다.

Best Practices의 `third-party-cookies`(doubleclick 쿠키)와 `inspector-issues`는 광고 태그가 있는 한 남는다. 점수
상한으로 받아들인다.

관련: [ADR 0194](0194-adsense-ads.md)(애드센스 도입과 크롤러 함정), [ADR 0199](0199-no-store-bfcache-problem.md)(레이아웃이 요청을 읽지 않게 한
KAN-632), 측정 원본은 `docs/perf/2026-10-23-kan-667/`.
