# 0181. AX 지표를 틀어 놓은 다섯 군데: 크롤러, prefetch, 진입 화면

KAN-584. 2026-10-03.

## 무슨 일이었나

KAN-542([ADR 0161](0161-analytics-headers-proxy.md))와 KAN-543([ADR 0162](0162-client-behavior-events.md))이
prod에 올라가고 이틀치 `events`가 쌓였는데, 그 숫자가 이상했다. 기기 793대 중 742대가 `screen_viewed`
한 건뿐이고 데스크톱은 `app_entered` 59건이 `screen_viewed` 59건과 정확히 같았다. 기사 상세 API
(`article_opened`, `source=detail_api`)는 조회 기록 호출(`view_api`)보다 5~7배 많고 같은 기기가 1초 안에
기사 7~11개를 열었다. 상세 호출의 상당수에 기기 식별자가 없었고 `X-Plick-Entry`는 1%만 값이 있었다.
데스크톱은 게스트 발급 325건에 `app_entered`가 59건이었다.

티켓은 이걸 다섯 항목으로 적고 추정을 하나씩 달았다. 화면 전환 때 `screen_viewed`를 안 보낸다,
`Link` prefetch가 상세를 미리 부른다, 서버 측 fetch에 분석 헤더가 빠졌다, 진입 화면을 안 싣는다,
데스크톱 진입이 누락된다. 셋은 맞았고 둘은 다른 데 원인이 있었다.

## 가설보다 재현부터

제일 중요하다고 적힌 1번부터 코드를 읽었는데 `AnalyticsTracker`는 `usePathname`으로 라우트 전환을 듣고
있었고 ADR 0162가 로컬에서 그 동작을 검증한 기록도 있었다. 코드를 더 읽어 봐야 "맞게 보인다"밖에 안
나올 것 같아 prod를 그대로 열었다. 브라우저 패널에서 `window.fetch`를 감싸 `/be` 요청 본문을 모아 두고
홈에서 피드 기사를 누르니 `screen_viewed article_detail ref=6278`이 나갔고, 뒤로 가니
`screen_viewed home`과 `read_finished`가 이어 나갔다. 한 방문에 화면 둘이 prod에서 그대로 남는다.
라우트 전환 이벤트는 살아 있었다.

그럼 742대는 누구인가. 이벤트 테이블에는 UA가 없어 어드민 쪽에서도 못 가른다. 대신 prod 공용 ALB에
액세스 로그가 켜져 있었다(`plick-alb-logs-815090125359`). 10월 2일 하루치 577개 파일을 받아 UA
계열별로 페이지 요청, RSC 요청, 이벤트 POST, 조회 기록 POST를 셌다.

모바일(`m.plick.co.kr`)은 이랬다.

| UA 계열                      | 기사 페이지 | 그 외 페이지 |    RSC | 이벤트 POST | 조회 POST |
| ---------------------------- | ----------: | -----------: | -----: | ----------: | --------: |
| Instagram 인앱 브라우저      |         673 |          106 | 13,086 |       1,212 |       602 |
| facebookexternalhit          |         591 |           83 |      0 |           0 |         0 |
| meta-externalagent           |         132 |           20 |  2,378 |         233 |       113 |
| Googlebot                    |          59 |           63 |      0 |          64 |        85 |
| iPhone·Android 일반 브라우저 |          38 |           79 |  1,401 |         132 |        88 |
| Yeti(네이버)                 |           6 |            0 |      0 |           6 |         6 |

데스크톱(`plick.co.kr`)은 `meta-externalagent` 273, Googlebot 119, SemrushBot 185, Yeti 79(이벤트 49,
조회 43), PerplexityBot 81이 기사 페이지를 긁었고 Windows·Mac 일반 브라우저는 합쳐 86건에 이벤트 11건이었다.

읽히는 그림은 이렇다.

- 모바일 방문의 대부분은 인스타그램 광고(`path=insta`)로 기사 하나에 내려앉는 사람이다. 하루 673건이
  기사에 들어와 이벤트와 조회 기록을 남기고 나간다. 기기당 `screen_viewed` 한 건은 전환이 빠진 게
  아니라 광고 랜딩의 실제 이탈이다.
- `meta-externalagent`(메타 AI 크롤러)와 Yeti는 UA에 bot이 없어 `CRAWLER_UA_PATTERN`에 안 걸린다.
  게스트와 기기 식별자를 받고 JS까지 돌려 `app_entered`와 `screen_viewed`, 조회 기록을 남긴다. 쿠키를
  안 들고 다니니 페이지마다 새 기기다. 데스크톱 `app_entered` 59건은 Yeti 49건에 사람 열 명 남짓이고,
  게스트 325건과의 차이는 `meta-externalagent`가 받아 간 게스트다. 크롤러가 쿠키를 돌려주지 않으면
  이벤트 POST는 토큰이 없어 401로 떨어지고 게스트만 남는다.
- Googlebot은 패턴에 걸려 게스트도 기기도 없는데 JS를 돌려 조회 기록을 보낸다. 조회 기록은
  비로그인 허용이라 `article_opened`가 기기 없이 남는다. 모바일에서 구글봇 조회 85건은 사람 모바일
  브라우저 전체(88건)와 맞먹는다. 티켓의 "기기 식별자 없는 상세 호출"은 이 크롤러 몫이다. 서버 측
  fetch의 헤더가 빠진 게 아니다. 인스타그램 브라우저 RSC 13,086건은 아래 prefetch다.

curl로도 확인했다. prod에 Yeti UA와 `python-requests` UA로 홈을 치면 `accessToken`과 `plick_did`가
심겨 왔다.

## prefetch는 정말 상세를 부른다

홈을 열고 네트워크를 보니 뷰포트에 든 기사 링크 넷이 `/articles/{id}?_rsc=`로 미리 불렸다. Next 16의
`Link` 기본 prefetch는 동적 라우트를 `loading.tsx` 경계까지 서버에서 그린다. 기사 세그먼트에
`loading.tsx`가 있어 `walkTreeWithFlightRouterState`의 "loading이 없으면 컴포넌트 트리를 건너뛴다"
갈래를 안 타고, 페이지가 그려지면서 `getArticle`이 나간다. 브라우저가 우선순위를 바꾸며 prefetch를
중단(`ERR_ABORTED`)해도 서버는 이미 요청을 받았다. 기사 화면의 관련 기사 다섯 개도 같은 링크라 기사
하나를 열 때마다 상세 다섯 개가 더 불렸다. 1초 안에 7~11개가 여기서 나온다.

`ArticleLink`에 `prefetch={false}`를 박았다. 끄면 누른 뒤에 받지만 `loading.tsx`의 뼈대가 첫 청크로
스트리밍돼 체감은 같다. `loading.tsx`를 지우는 쪽도 생각했는데, 그러면 prefetch는 레이아웃만 받아
싸지만 누른 뒤 뼈대 없이 기다린다. 기사로 가는 링크가 `ArticleLink` 말고도 여섯 군데(토론 목록, 토론
배너, 내 댓글, 좋아요 목록, 웹 관련 기사)에 맨 `Link`로 있어 전부 `ArticleLink`로 모았다. prefetch
정책을 한 곳에 두려는 것이다.

상세가 한 번 더 나가던 자리가 하나 더 있었다. `generateMetadata`와 페이지 본문이 같은 기사를 각각
불렀다. 메타데이터는 토큰 없이(익명 60초 캐시) 본문은 토큰을 실어(`no-store`) 부르니 사람 한 명의
열람에 상세가 두 번 나가고 서버는 둘 다 센다. 익명 fetch끼리는 Next가 중복 제거하지만 헤더가 다른
두 호출은 별개다. React `cache`로 묶어 같은 인자면 한 번만 부르게 했다. 크롤러는 토큰이 없어 전처럼
익명 캐시를 탄다.

## 진입 화면은 셋이 나눠 싣는다

`X-Plick-Entry`가 1%였던 건 프록시가 페이지 요청은 그 경로, `/be` fetch는 Referer 경로로만 정했기
때문이다. 기사 경로는 값이 없고 기사 화면에서 나가는 fetch의 Referer도 기사 경로다. 열람 이벤트가
나가는 자리 둘(서버 렌더의 상세 호출, 브라우저의 조회 기록)이 전부 비었다.

다섯 값(`home_feed`, `reels`, `reels_deeplink`, `hot`, `share_link`)은 전부 "기사를 연 쪽 화면"이다.
그래서 값을 정하는 자리를 링크를 누르는 순간으로 옮겼다. `ArticleLink`가 `entry`를 받아
`rememberArticleOrigin`에 순위와 같이 적고, 기사 화면의 `useArticleView`가 꺼내 조회 기록에
`X-Plick-Entry`로 싣는다. 프록시는 브라우저가 실은 이 헤더를 원래 덮지 않는다(ADR 0161).

서버 렌더까지 닿게 하는 게 문제였다. 라우터의 RSC 요청에는 헤더를 못 싣는다. 세 길을 두고 프록시의
`resolveEntry`가 앞선 것부터 쓴다.

1. 일회용 쿠키 `plick_entry`. `rememberArticleOrigin`이 심고(30초, HttpOnly 아님) 페이지 요청의
   프록시가 읽어 헤더로 옮긴 뒤 응답에서 지운다. 핫이슈(`hot`)는 홈 안의 구획이라 이 길뿐이다.
2. 요청 주소. 홈은 `home_feed`, `/reels`는 `reels`, `/reels/{id}`는 `reels_deeplink`, 쿼리에
   `?path=share`가 있으면 `share_link`. 공유 표식이 경로보다 앞선다. 공유 받은 릴 링크는 딥링크이기도
   하지만 그 사람을 데려온 건 공유다. ADR 0178이 남겨 둔 자리다.
3. 소프트 내비게이션(`RSC` 헤더)이면 떠나온 화면의 Referer. 홈에서 기사를 열면 기사 경로로는 값이
   없지만 Referer `/`가 `home_feed`다.

쿠키를 페이지 요청이 소거하는 이유는 30초 안에 들어오는 다른 페이지 요청에 묻으면 안 되기 때문이다.
`/be` fetch는 쿠키를 안 읽는다. 조회 기록은 헤더로 직접 싣고 나머지 fetch는 Referer면 충분하다.
prefetch가 쿠키를 먼저 먹는 경우는 prefetch를 꺼서 없다.

릴스는 주소로 정하면 틀린다. 릴을 넘기면 `useReelUrlSync`가 `/reels/{id}`로 바꿔 탭 피드도
딥링크처럼 보인다. 피드 컴포넌트가 `anchorId` 유무로 `reels`·`reels_deeplink`를 고정해 `useArticleView`에
넘긴다. 이벤트 배치 POST의 Referer는 여전히 바뀐 주소라 그 요청의 entry는 `reels_deeplink`로 나갈 수
있는데, 열람이 아니라 화면 이벤트라 두었다.

## 크롤러를 더 거르고 쓰기는 끊는다

`CRAWLER_UA_PATTERN`에 `yeti`, `meta-externalagent`, `daum/`, `chatgpt-user`, `perplexity`,
`bingpreview`, 크롬의 `prefetch proxy`, HTTP 라이브러리(`python`, `curl`, `wget`, `go-http-client`,
`okhttp`, `java/`, `axios`, `node-fetch`, `scrapy`)와 헤드리스 도구를 더했다. `naver`와 `kakao`는 넣지
않았다. 네이버 앱과 카카오톡의 인앱 브라우저 UA(`NAVER(inapp`, `KAKAOTALK`)가 사람이다. 카카오 스크랩은
`facebookexternalhit`를 달고 와 이미 걸린다. 이 경계를 단위 테스트로 고정했다. ALB 로그에서 본 UA 문자열
그대로다.

그리고 크롤러의 `/be` 쓰기 요청은 프록시가 204로 끊고 BE로 보내지 않는다. 구글봇과 애플봇처럼 패턴에
걸려도 JS를 돌리는 크롤러가 조회 기록을 보내 `article_opened`를 남기는 걸 막는다. 크롤러가 정당하게
쓰는 요청은 없고 읽기는 전처럼 익명으로 통과한다.

패턴을 넓히면 Yeti와 메타 크롤러의 서버 렌더 상세 호출에는 기기 식별자가 안 실린다. 식별자 없는
이벤트는 unique 집계에서 빠지고 커버리지에만 잡히는 게 설계라(Confluence 65798148, 2절) 그게 맞는
자리다. "기기 없는 호출" 비율은 오히려 오르고, 그 몫은 크롤러다.

## 화면 표

`/live/teams/{id}`와 `/live/chat`이 `screens.ts`에 없어 그 전환은 조용히 빠지고 있었다. 라이브 화면의
팀 필터와 채팅이라 `live`에 ref로 붙였다.

## 검증

로컬 BE(8081, mock 프로필) 앞에 요청 헤더와 이벤트 본문을 파일로 적는 중계 서버(8097)를 두고
`API_BASE_URL`을 거기로 돌려 모바일을 프로덕션 빌드했다. 3001은 다른 세션의 dev 서버가 쥐고 있어
3000으로 띄웠다. BE CORS 허용 목록이 3000·3001뿐이라 그 둘 밖은 안 된다. Playwright로 새 컨텍스트
(iPhone UA)를 열어 시나리오를 돌렸다.

- 홈 로드 뒤 `Next-Router-Prefetch` 헤더를 단 `/articles/{id}` 요청이 없다. 탭바의 `/reels`·`/live`
  prefetch는 그대로 나가는데 그쪽은 `loading.tsx`가 없어 레이아웃만 받는다.
- 핫이슈 카드를 누르니 서버 상세 호출 한 번에 `X-Plick-Entry: hot`과 기기 식별자가 실렸고, 조회 기록이
  `?rank=0`과 `hot`으로, 이벤트가 `screen_viewed article_detail`로 나갔다. 페이지 응답 뒤 `plick_entry`
  쿠키는 없었다.
- 뒤로 가니 `screen_viewed home`. 피드 행을 누르니 상세 한 번에 `home_feed`, 조회 기록도 `home_feed`.
- `/articles/{id}?path=share`를 바로 열면 상세와 조회 기록 모두 `share_link`.
- `/reels`는 서버 피드 호출과 조회 기록이 `reels`, `/reels/{id}`는 `reels_deeplink`.
- Yeti UA로 홈을 열면 `accessToken`·`plick_did`가 안 심기고, `/be` POST는 204로 끊겨 중계 서버에 안
  닿았으며, `/be` GET은 200으로 통과했다.

처음 돌린 판정 하나가 틀렸다. 기사 화면에서 `/articles/{id}?_rsc=` 요청이 있다고 FAIL이 났는데,
`_rsc=` 쿼리는 prefetch뿐 아니라 클릭으로 일어난 내비게이션 RSC 요청에도 붙는다. 헤더
(`Next-Router-Prefetch`)로 다시 세니 홈·기사 화면·뒤로가기 어디에도 없었다. 네트워크 목록에서 prefetch를
셀 때는 쿼리가 아니라 헤더를 봐야 한다.

웹은 프록시와 링크, 훅이 모바일과 같은 코드라 단위 테스트와 타입 검사, 빌드로 갈음했다. `pnpm
format:check`, `test:hooks`, `test:unit`, `lint`, `check-types`, `build` 통과.

## 리뷰 게이트가 짚은 것

push 전 헤드리스 리뷰(`scripts/review/pr-review.sh`)는 두 번 실패하고 세 번째에 돌았다. diff가 80KB라
기본 예산 1달러에서 `error_max_budget_usd`로 끊겼고, 예산을 올리니 이번엔 기본 벽시계 300초에서
`perl alarm`에 죽었다. 예산 5달러, 40턴, 1500초로 돌려 20턴 1.28달러에 끝났다. ADR이 diff에 같이 들어가는
구조라 ADR이 길면 리뷰 비용도 같이 는다.

CRITICAL은 없었고 WARN 둘이 맞는 말이라 고쳤다.

첫째, 크롤러 패턴을 넓히면서 같은 판정에 "쓰기 전부 차단"을 묶어 오탐 비용이 커졌다는 지적이다.
전에는 사람을 크롤러로 잘못 봐도 게스트를 못 받는 정도였는데, 이번 변경으로 그 사람의 좋아요·댓글·투표가
조용히 204로 사라질 수 있었다. 차단을 분석 쓰기 둘(`POST /api/v1/events`, `POST …/view`)로 좁혔다
(`isAnalyticsWrite`). 오탐의 대가가 분석값 누락으로 돌아간다. `perplexity`도 `perplexity-user`로 좁혔다.
`PerplexityBot`은 `bot`으로 이미 걸리고, 퍼플렉시티가 브라우저를 내면 그 UA가 토큰을 품을 수 있어서다.

둘째, 진입 화면 우선순위와 크롤러 차단이 `NextRequest`에 묶여 있어 단위 테스트가 없고 Playwright
한 번에만 기대고 있었다는 지적이다. KAN-577이 `resolveRequestMarketing`을 코어로 뺀 것과 같은 방법으로
`resolveRequestEntry`와 `isAnalyticsWrite`를 `@plick/core/analytics`에 두고 두 프록시가 호출 한 번으로
쓴다. 프록시는 `NextRequest`에서 여섯 값(경로, 쿼리, Referer, 쿠키, `/be` 여부, `RSC` 여부)만 뽑아 넘기고
읽은 쿠키를 지울지는 결과(`consumed`)로 받는다. 우선순위 조합 열 가지와 차단 경계 일곱 가지를
`tests/unit/entry-point.test.mjs`에 더했다. 두 프록시 파일은 머리 주석 한 줄만 다른 상태로 돌아왔다.

INFO 하나는 `utm_source=share`로 들어와도 `share_link`가 된다는 것인데, `plick_path`를 읽는
`readPathParam`이 원래 `utm_source`를 폴백으로 보는 규칙이라 유입 경로 쿠키도 같은 요청에서 `share`가
된다. 둘이 같은 함수를 쓰니 어긋나지 않는 쪽이 맞아 그대로 뒀다.

## 남은 것

- 배포 뒤 prod `events`에서 다시 본다. 기대는 이렇다. `entry_point` 커버리지가 열람 이벤트에서 90%
  넘게 오르고, `detail_api`가 `view_api`에 가까워지고, 데스크톱 `app_entered`가 열 명대로 떨어진다. 마지막
  건 떨어지는 게 맞는 값이다.
- UA로 거르는 크롤러는 끝이 없다. `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`처럼
  크롬 토큰이 없는 맨 UA가 하루 109건 페이지를 긁었는데 패턴으로 잡기엔 사람과 겹친다. BE가 `is_bot`을
  계정이 아니라 UA로도 세우려면 서버 측 fetch에 원 요청의 UA를 넘겨야 하는데 계약에 없다. 어드민이
  "기기 없는 이벤트"를 봇 버킷으로 다루는 쪽이 지금은 현실적이다.
- 이벤트 배치 POST의 `X-Plick-Entry`는 Referer 기준 그대로다. 릴을 넘긴 뒤 보낸 배치는 `reels_deeplink`로
  찍힌다. 화면 이벤트의 entry를 쓰게 되면 그때 클라이언트가 직접 싣는다.
- ALB 로그 집계 스크립트는 스크래치에만 있었다. 같은 질문이 또 오면 `aws s3 sync`로 하루치를 받아 UA
  계열별로 세는 20줄이면 된다.
