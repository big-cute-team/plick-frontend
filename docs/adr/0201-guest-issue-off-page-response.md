# 0201. 캐시해도 되는 응답에서 쿠키 떼어 내기: 게스트 발급을 브라우저로 (KAN-665)

## 어디서 이어지나

[ADR 0199](0199-no-store-bfcache-problem.md)(KAN-632)에서 루트 레이아웃의 쿠키 읽기를 브라우저로 옮겨 홈·FAQ·팀 프로필을 정적·ISR로 돌렸고, [ADR 0200](0200-anonymous-isr-state-overlay.md)(KAN-664)에서 기사·릴스·투표를 익명 ISR + 내 상태 오버레이로 바꿨다. 빌드 표에서 `ƒ`는 MY, 로그인, 라이브 정도만 남았고 서버는 응답마다 `s-maxage`를 단다. 그런데 CloudFront는 여전히 모든 문서를 `Miss`로 원본까지 보낸다. 이 시리즈의 마지막 작업이다.

CDN 구성은 [docs/deploy-v3-cdn.md](../deploy-v3-cdn.md)와 [ADR 0081](0081-cdn-static-split-plan.md), 게스트 설계는 KAN-514, 로그아웃 게스트는 [ADR 0198](0198-guest-logout-switch.md)(KAN-658)에 있다.

## 착수 전에 잰 것

비포 증거는 `_workspace/2026-10-16-kan665/before/`에 있다(저장소 밖).

CloudFront 다섯 배포(모바일·웹 dev/prod, 어드민)의 기본 비헤이비어는 모두 캐시 정책 `Managed-CachingDisabled`, 오리진 요청 정책 `Managed-AllViewer`였다. 원본이 뭐라고 하든 아무것도 저장하지 않는다. ADR 0199에서 일부러 꺼 둔 채 남긴 자리다.

이유는 이 응답에 있었다. develop(0959d5a)을 로컬에서 `next start`로 띄우고 쿠키 없이 아이폰 사파리 UA로 FAQ를 요청했다.

```
GET /faq
Cache-Control: s-maxage=31536000
x-nextjs-cache: HIT
set-cookie: accessToken=eyJhbGci…; Max-Age=3300; HttpOnly
set-cookie: refreshToken=_dI05hY5…; HttpOnly
set-cookie: guestExpiresAt=…
set-cookie: sessionKind=guest
set-cookie: guestNotice=issued
set-cookie: refreshRetry=; Expires=1970
set-cookie: guestFromLogout=; Expires=1970
set-cookie: plick_did=1a171cfc…
set-cookie: plick_path=direct
```

윗줄은 "이 응답은 1년 동안 누구에게 줘도 같다"는 뜻이고, Next도 이미 만들어 둔 HTML을 꺼내 줬다(`HIT`). 그 응답에 방금 이 요청을 위해 발급한 게스트 토큰이 실려 있다. CDN이 이걸 저장하면 다음 방문자가 첫 방문자의 게스트 계정으로 좋아요를 누르게 된다. 홈, 투표, 릴스도 똑같았다.

같은 측정에서 `refreshToken` 앞자리가 다섯 요청 모두 달랐다. 요청 하나에 게스트 계정 하나다. 프록시는 크롤러 UA만 거르므로, 브라우저 UA를 단 요청이면 JS를 돌리든 말든 BE에 사용자 행이 생긴다. prod(main, 앞의 두 작업 배포 전)는 `no-store`에 같은 쿠키 일곱 개, `x-cache: Miss from cloudfront`였다. 첫 방문 TTFB는 게스트 발급 경로가 약 50ms, 발급을 건너뛰는 curl UA가 약 35ms라 발급 비용 자체는 15ms 남짓으로 작았다.

## 방안과 선택

조건은 둘이다. CDN이 저장할 수 있는 응답에는 `Set-Cookie`가 없어야 하고, 들어온 사람은 모두 게스트로 시작해야 한다(KAN-514 요구사항, 이번에 사용자와 다시 확인했다).

- 쿠키를 심는 응답만 `no-store`: 변경은 작지만 쿠키를 심는 요청이 곧 "처음 온 사람"이라 캐시가 가장 필요한 첫 화면이 전부 Miss다.
- CDN 설정으로 거르기: 쿠키를 캐시 키에 넣으면 사람마다 캐시가 따로라 적중률이 0이다. `Set-Cookie` 응답만 거르면 "토큰이 남에게 안 나간다"는 보장을 CDN 동작 하나에 맡긴다.
- CDN 캐시 포기: 원본 ISR은 이미 돈다. 다만 광고로 몰리는 순간 엣지가 받아 주지 못하고 게스트 남발도 그대로다.
- 누를 때만 발급: 깔끔하지만 구경만 하는 사람은 게스트가 아니게 돼 요구사항을 깬다.
- 발급을 브라우저로 옮기기: 페이지 응답은 쿠키 없이 나가고, 화면이 뜬 뒤 브라우저가 한가할 때 게스트를 받아 간다. 그 전에 누르면 발급을 기다렸다가 처리한다.

마지막을 골랐고 첫 번째를 안전핀으로 같이 뒀다. 원칙은 "캐시될 수 있는 응답에는 `Set-Cookie`가 없다, 쿠키를 심는 응답은 캐시되지 않는다"다.

## 게스트를 브라우저가 받아 간다

`POST /api/session/guest` 라우트 핸들러를 새로 만들었다. 지금 프록시가 하던 일(BE `POST /auth/guest`, 토큰 쿠키 다섯 개 심기)을 그대로 옮겼다. POST라 CDN이 저장하지 않고, 토큰은 서버가 받아 HttpOnly 쿠키로 바꿔 심으니 브라우저 JS가 토큰을 들고 있을 일도 없다. BE는 토큰을 JSON 본문으로 주기 때문에 브라우저가 BE를 직접 부르면 JS가 토큰을 쥐어야 한다. 그래서 중간에 우리 서버가 있어야 했다. `/api`는 프록시 matcher가 빼는 경로라 이 라우트가 쿠키를 심어도 프록시의 `Set-Cookie`와 겹치지 않는다.

라우트는 세 가지를 거른다. 크롤러 UA는 403이다. 전에는 프록시가 UA로 걸렀는데, 이제 발급이 JS에 묶이니 JS를 돌리는 구글봇이 부를 수 있다. `Sec-Fetch-Site`가 `same-origin`이 아니면 403이다. 남의 사이트가 폼으로 이 주소를 때려 방문자 브라우저에 게스트를 심는 걸 막는다. 이미 토큰이 있으면 발급하지 않고 `{ issued: false }`다. 다른 탭이 먼저 받아 간 경우다.

부르는 쪽은 `AuthProvider`다. 세션 종류 표식(`sessionKind`, ADR 0199에서 만든 읽을 수 있는 쿠키)이 없으면 `runWhenIdle`로 한가할 때 `ensureSession()`을 부른다. 사파리에는 `requestIdleCallback`이 없어 300ms 타이머로 대신한다. `/login`·`/signup`·`/oauth`와 크롤러 UA에서는 부르지 않는다. 그 판정(`skipsGuestIssue`)은 프록시에 있던 걸 `_utils/guest-issue.ts`로 옮겼다. 발급 요청은 `_apis/guest-session.ts`가 모듈 변수 하나로 묶는다. 한가할 때의 발급과 좋아요 탭이 겹쳐도 요청은 하나다. 게스트는 부를 때마다 계정이 생기니 겹친 호출이 각자 보내면 안 된다.

좋아요(`useLikeToggle`)와 투표(`useDebateVote`)는 "세션 없으면 로그인 팝업"이던 앞단 검사를 지우고, `mutationFn` 맨 앞에서 `ensureSession()`을 기다리게 했다. `onMutate`는 그보다 먼저 돌아서 하트는 누르는 즉시 찬다. 발급이 실패하면 `SESSION_UNAVAILABLE`(BE가 주는 401 `AUTH_REQUIRED`와 같은 모양의 `ApiError`)을 던져 하던 대로 롤백하고 로그인 팝업을 띄운다. 댓글 입력줄은 포커스나 제출 때, 댓글 차단 버튼은 누를 때 같은 식으로 기다린다. 채팅 패널은 세션이 없는 동안 "로그인하세요" 지면을 그리다 곧바로 방으로 바뀌어 깜빡이므로, `isSessionPending` 동안은 아무것도 그리지 않는다.

여기서 한 번 걸렸다. ADR 0200에서 내 기사 상태 캐시는 세션 종류가 바뀌면 지우게 해 뒀다(`syncArticleStateMemoOwner`가 true면 `removeQueries`). 세션 없음에서 게스트로 바뀌는 것도 "바뀜"이라, 발급을 기다리던 좋아요가 낙관적으로 적어 둔 값이 캐시째 날아가고, 켜진 조회가 BE에 묻다 응답 순서에 따라 하트가 다시 빌 수 있었다. 방금 받은 게스트는 누른 기사가 하나도 없으니 물을 이유도 없다. 그래서 `issued`로 끝난 발급은 `adoptFreshGuest`가 처리한다. 값이 아직 없는 상태 캐시만 "안 누름"으로 채우고(`staleTime`이 무한이라 다시 묻지 않는다) 캐시는 비우지 않는다. 실측에서 릴스 첫 화면 발급 직후 `article-states` 요청이 아예 나가지 않았다.

게스트 안내 토스트는 `AuthProvider` 밖에 있어 세션 값을 못 본다. 마운트 때만 표식 쿠키를 읽던 것을, 발급 직후 쏘는 `plick:guest-issued` window 이벤트에도 다시 읽게 했다.

## 분석 쿠키가 더 까다로웠다

토큰을 빼도 페이지 응답에는 `plick_did`(기기 식별자), `plick_path`(유입 경로), `plick_mkt`(마케팅 여섯 칸)가 남는다. 처음 계획은 "`plick_path`는 `direct`면 안 심고, 광고 주소로 들어온 첫 요청은 안전핀으로 `no-store`"였다. 코드를 읽다 이게 틀린 걸 알았다. `resolveRequestMarketing`은 utm 쿼리뿐 아니라 외부 Referer만 있어도 새 유입으로 본다. 인스타 광고나 검색으로 들어온 첫 화면은 거의 다 심을 값이 있다. 그 응답을 `no-store`로 막으면 광고 랜딩 화면이 CDN도 bfcache도 못 탄다. 인앱 브라우저에서 랜딩 → 외부 링크 → 뒤로가기는 ADR 0199가 지키려던 바로 그 장면이다.

그래서 쿠키를 심는 자리를 페이지 응답에서 첫 `/be` 응답으로 옮겼다. 값을 정하는 함수(`readPathParam`, `resolveRequestMarketing`)는 그대로 쓰고 입력만 넘긴다.

- 기기 식별자: `<head>`의 동기 스크립트 `deviceSyncScript`(KAN-610에서 localStorage와 쿠키를 맞추던 것)에 `issue` 옵션을 더했다. 쿠키도 localStorage도 비었으면 `crypto.randomUUID()`로 만들어 둘 다 적는다. 전환 배너가 넘긴 `?did=`가 있으면 그걸 쓰고, 크롤러 UA면 만들지 않는다. `resolveDeviceId`의 규칙과 같다. 첫 `/be` fetch보다 먼저 도는 자리라 `app_entered`부터 기기가 붙는 건 전과 같다. 덤으로 `guest_issued` 이벤트에도 기기가 붙는다. 전에는 첫 방문의 발급이 새 기기를 만든 그 요청 안에서 일어나 헤더에 기기가 없었다(KAN-607 "쿠키에서 온 값만 싣는다").
- 유입과 마케팅: 같은 스크립트의 `landing` 옵션이 주소에 쿼리가 있거나 외부에서 들어왔을 때 `location.search`와 Referer origin을 세션 쿠키 `plick_landing`에 적는다. 프록시는 `/be` 요청에 그 쿠키가 있으면 페이지 요청이었던 것처럼 그 값으로 경로·마케팅을 정해 그 응답에 심고 랜딩 쿠키를 지운다. 페이지 요청은 주소로 정한 값을 이번 렌더 헤더에만 싣고 쿠키는 심지 않는다.

웹은 아직 화면이 전부 `ƒ`라 이번 범위가 아니다(KAN-643). 공용 스크립트는 옵션 없이 부르면 전과 같게 했고 웹 레이아웃은 그대로다.

## Next가 미들웨어 쿠키를 버리고 있었다

로컬에서 랜딩 쿠키를 든 `/be` 요청을 보냈더니 `Set-Cookie`가 하나도 없었다. 경로 쿠키는커녕 랜딩 쿠키를 지우는 줄도, 안전핀의 `Cache-Control`도 없었다. 혹시 해서 refresh 토큰만 든 `/be` 요청을 보내 봤다. 프록시가 재발급해 새 토큰을 응답 쿠키로 심는 갈래다. 이것도 비어 있었다. 이번 변경과 상관없이 원래부터 그랬던 것이다.

Next 16.2 라우터를 읽었다. `next.config.js`의 rewrites는 `/be/:path*`를 `${API_BASE_URL}/:path*`로 보낸다. `router-utils/resolve-routes.js`에서 이 rewrite의 목적지가 프로토콜이 붙은 외부 주소면 `return { parsedUrl, resHeaders: null, finished: true }`로 끝난다. 미들웨어가 돌려준 응답 헤더를 모은 `resHeaders`를 버린다는 뜻이다. 미들웨어가 바꾼 요청 헤더(Bearer)는 그 전에 `req.headers`에 반영돼 BE까지 가지만, 응답 쪽 `Set-Cookie`는 브라우저에 닿지 않는다. `DEBUG=next:router-server:main`으로 띄워 보니 `/be` 요청의 `resHeaders`가 실제로 `null`이었다. 반면 미들웨어가 직접 외부로 rewrite하면(`x-middleware-rewrite`에 프로토콜이 있으면) 같은 파일의 다른 갈래가 `resHeaders`를 실은 채 `proxyRequest`로 넘긴다.

그래서 `forward()`가 쿠키를 심어야 하는 `/be` 요청일 때만(랜딩 쿠키를 풀었거나 재발급했을 때) `NextResponse.rewrite(new URL(\`${API_BASE_URL}${경로}${쿼리}\`))`로 직접 넘기게 했다. 목적지는 config와 같은 문자열 이어 붙이기다. `new URL(path, base)`로 하면 prod의 `https://plick.co.kr/be`에서 `/be`가 떨어진다. 나머지 `/be` 요청은 전처럼 config rewrites를 탄다. `API_BASE_URL`은 배포 때 빌드 시크릿과 런타임 Parameter Store 양쪽에 같은 값으로 들어가고, 프록시의 재발급 호출이 이미 런타임 값을 읽고 있어 새 의존이 아니다.

고친 뒤 랜딩 쿠키(`?utm_source=insta&utm_campaign=fall&fbclid=Ab1` + `l.instagram.com`)를 든 `/be` 응답에 `plick_landing` 삭제, `plick_path=insta`, `plick_mkt=c=fall&r=l.instagram.com&i=Ab1&s=meta`가 실렸고, refresh만 든 `/be` 응답에도 새 토큰 쌍이 실렸다. 후자는 KAN-379 때부터 "재발급한 쌍을 응답 쿠키로 저장시킨다"고 적어 둔 동작이 `/be` 갈래에서는 한 번도 일어나지 않았다는 뜻이다. BE가 회전한 refresh를 브라우저가 못 받으니, `/be` fetch가 먼저 재발급을 타면 브라우저에는 이미 죽은 refresh가 남았을 것이다. 그게 이따금 보이던 원인 모를 로그아웃과 관련 있는지는 따로 확인하지 못했다.

## 프록시에 남은 것과 안전핀

프록시에서 첫 방문 게스트 발급(`startGuestSession`)을 지웠다. 토큰이 하나도 없는 요청은 익명으로 통과한다. 첫 화면은 원래 익명 ISR이라 렌더 결과도 같다. 게스트 마감(14일)으로 재발급이 두 번 401이면 전에는 그 자리에서 새 게스트를 발급했는데, 이제 세션 쿠키 여섯 개를 지워 첫 방문과 같은 상태로 만들고 브라우저가 다시 받아 가게 했다. 발급 자리가 하나로 모였다.

`proxy()` 끝에는 안전핀을 뒀다. 어느 갈래로든 응답에 쿠키를 심거나 지웠으면 `Cache-Control: private, no-store`로 덮는다. 걸리는 건 페이지 요청의 토큰 재발급(55분에 한 번), 진입 화면 일회용 쿠키 소모, 게스트 마감처럼 드문 요청이다. Next가 렌더 결과의 `Cache-Control`로 미들웨어 값을 덮지 않을까 걱정했는데, refresh만 든 FAQ 요청에서 평소 `s-maxage=31536000`이던 응답이 `private, no-store`로 나갔다. `/be` 응답은 BE의 `Cache-Control`이 http-proxy의 `setHeader`로 덮지만 BE(Spring Security)가 원래 `no-cache, no-store`를 준다.

KAN-632 전에 받은 세션도 챙겼다. prod에는 아직 `sessionKind` 표식이 없는 사용자가 많다(main에 KAN-632가 배포 전). 토큰은 있는데 표식이 없으면 브라우저는 세션이 없다고 보고 발급을 부르고, 라우트는 "이미 있음"으로 답할 뿐이라 좋아요가 로그인 팝업으로 떨어질 뻔했다. 라우트가 이 경우 마감 쿠키(프록시가 쓰던 게스트 표식) 유무로 종류를 정해 `sessionKind`만 심어 주게 했다.

## 전후

| 항목                                           | 전 (develop 0959d5a)                     | 후                                                      |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| 쿠키 없는 FAQ·홈·투표·릴스 응답                | `s-maxage` + `Set-Cookie` 9개(토큰 포함) | `s-maxage`만, `Set-Cookie` 0개                          |
| 인스타 광고 랜딩(`?utm_source=insta&fbclid=…`) | 같음                                     | `Set-Cookie` 0개, 유입은 첫 `/be` 응답이 심음           |
| 게스트 발급 자리                               | 쿠키 없는 페이지 요청마다(프록시)        | 화면을 띄운 브라우저가 한 번(`POST /api/session/guest`) |
| curl·링크 미리보기                             | 요청마다 게스트 1개(브라우저 UA면)       | 0개                                                     |
| 첫 방문 발급 시점                              | 첫 바이트 전                             | 화면이 뜬 뒤 약 225~284ms(로컬 측정)                    |
| `/be` 응답에 프록시가 심는 쿠키                | 브라우저에 안 닿음(Next가 버림)          | 닿음                                                    |
| 쿠키를 심는 페이지 응답                        | 캐시 정책은 Next 값 그대로               | `private, no-store`                                     |

빌드 라우트 표는 `/api/session/guest`(ƒ)가 더해진 것 말고 같다.

## 확인한 것과 못 한 것

prod BE를 붙인 로컬 `next start`로 페이지 헤더, 발급 라우트의 거름(curl UA 403, cross-site 403, 재요청 `issued: false`), 안전핀, 랜딩 쿠키, `/be` 재발급 쿠키를 curl로 확인했다. 브라우저 패널에서 `?utm_source=insta`로 첫 방문하면 head 스크립트가 기기를 만들고, 284ms에 발급이 나가고, 랜딩 쿠키가 첫 `/be`에서 소모됐다. 로컬 mock BE(8081)로 릴스 첫 방문 → 발급(225ms) → 안내 토스트 → 좋아요(`aria-pressed=true`, 롤백 없음)까지 봤다.

댓글 등록과 투표는 확인하지 못했다. mock BE에 KAN-663 이후 엔드포인트가 없어 기사 화면이 404로 에러 경계에 떨어졌고, prod BE에 쓰기를 남길 수는 없었다. dev 배포 뒤 E2E로 본다. 발급 전에 누른 좋아요가 발급을 기다리는 갈래도 패널에서는 발급(약 230ms)이 클릭보다 빨라 직접 재현하지 못했다.

## 감수한 것

- 첫 방문의 첫 `/be` 호출(릴 조회 기록 등)은 발급보다 먼저 나가면 익명으로 남는다. 전에는 첫 바이트 전에 게스트가 생겨 조회 기록에 사용자가 붙었다.
- `guest_issued` 이벤트의 유입 경로는 발급이 첫 `/be` 호출보다 빠르면 `direct`로 남는다(랜딩 쿠키가 풀리기 전이라).
- 첫 방문자가 탭 두 개를 거의 동시에 열면 각자 발급해 게스트가 둘 생길 수 있다. 나중 쿠키가 남고 먼저 생긴 계정은 14일 뒤 정리된다.

## 남긴 것

- CloudFront 기본 비헤이비어 캐시 정책 교체(m.plick.co.kr만, 콘솔 작업). TTL 최소 0·기본 0·최대 1년(원본이 말하지 않으면 저장 안 함), 캐시 키는 쿼리스트링 전체 + `rsc` 헤더, 쿠키는 제외, 오리진 요청 정책은 AllViewer 유지. CloudFront는 `Vary`를 캐시 키로 쓰지 않으니 RSC와 HTML이 섞이지 않게 `_rsc` 쿼리와 `rsc` 헤더가 키에 있어야 한다. 배포 뒤 같은 문서 두 번 요청에 `Hit from cloudfront`, 로그인 MY가 저장되지 않음을 확인한다.
- 웹 이식은 KAN-643. 웹 프록시도 `/be` 재발급 쿠키를 같은 이유로 잃고 있다.
