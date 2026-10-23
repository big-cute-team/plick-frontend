# 0204. 웹에도 같은 걸: 모바일의 렌더링·캐싱 개편 세 건을 데스크톱 웹에 이식하다 (KAN-667)

## 어디서 이어지나

모바일 앱(apps/mobile)은 10월 중순에 세 작업으로 "사람마다 다른 페이지"였던 구조를 걷어냈다. [ADR 0199](0199-no-store-bfcache-problem.md)(KAN-632)에서 루트 레이아웃의 `cookies()`·`headers()` 읽기를 브라우저로 옮겨 FAQ·홈·프로필류를 정적·ISR로 돌렸고, [ADR 0200](0200-anonymous-isr-state-overlay.md)(KAN-664)에서 기사·릴스·투표를 익명으로 받아 캐시하고 내 좋아요·투표만 BE 일괄 조회로 얹었으며, [ADR 0201](0201-guest-issue-off-page-response.md)(KAN-665)에서 게스트 발급을 페이지 응답에서 떼어 CloudFront가 문서를 저장할 수 있게 했다.

데스크톱 웹(apps/web)은 그 셋 모두 적용 전이었다. KAN-667은 그 세 작업을 웹에 그대로 옮기는 티켓이다. KAN-643이 1단계(KAN-632 이식)만 따로 잡아 둔 티켓으로 열려 있었는데, 셋이 같은 구조를 순서대로 바꾸는 일이라 한 브랜치에서 세 커밋으로 간다.

## 착수 전에 잰 것

`feature/KAN-667-web-render-cache-port`를 `develop`(KAN-666 머지 직후)에서 따고, 손대기 전에 웹을 standalone으로 빌드해 빌드 표와 응답 헤더를 적어 뒀다(`docs/perf/2026-10-23-kan-667/`).

빌드 표는 페이지 라우트 31개가 전부 `ƒ`(요청마다 렌더)였고 `○`는 `ads.txt`·아이콘·`robots.txt`처럼 파일 라우트 7개뿐이었다. 모바일 착수 전(24개 전부 ƒ)과 같은 모양이다. 로컬 standalone(prod BE)에 브라우저 UA로 16개 화면을 요청했더니 전부 `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`였고, 로그인·회원가입을 뺀 모든 응답에 게스트 토큰 `Set-Cookie` 여덟 줄이 실려 있었다. prod(`plick.co.kr`)도 `x-cache: Miss from cloudfront`에 같은 `no-store`다.

측정 자체가 부작용을 냈다. 브라우저 UA로 찍은 요청 14개가 prod BE에 게스트 계정 14개를 만들었다. ADR 0201에서 모바일 측정 때 본 것과 같은 현상이고, 3단계(KAN-665 이식)가 끝나면 웹에서도 사라진다.

## 1단계: 레이아웃이 요청을 읽지 않게 (KAN-632 이식)

모바일 커밋을 파일 단위로 대조해 보니 `@plick/core`에 올라간 부분은 이미 웹도 쓰고 있었다. 익명 GET에 기본 60초 캐시를 붙이고 그때 분석 헤더 제공자를 건너뛰는 `client.ts`·`fetch-cache.ts`, 앱 셸 UA면 광고 요청을 멈추는 `adsPauseScript`, 세션 종류와 무관한 기기 식별자 스크립트 `deviceSyncScript`가 그것이다. 그래서 웹 쪽 일은 앱 레이어의 "레이아웃이 서버에서 읽어 내려주던 값"을 "브라우저가 스스로 읽는 값"으로 바꾸는 것뿐이었다.

옮긴 것은 모바일과 같다.

- 프록시와 서버 액션이 토큰을 심는 자리(게스트 발급, 재발급, 로그인, 연동, 로그아웃)에 HttpOnly가 아닌 `sessionKind=guest|user` 쿠키를 같이 심고, 토큰을 지우는 자리(로그아웃, 탈퇴, 재발급 실패 정리)에서 같이 지운다. 게스트 마감 쿠키 `guestExpiresAt`은 HttpOnly를 풀었다. 이름과 값은 모바일과 같아서, 같은 도메인 아래 두 앱이 쿠키를 공유하더라도 뜻이 어긋나지 않는다.
- `AuthProvider`는 서버 시드 prop을 받지 않는다. 서버 렌더와 하이드레이션 첫 패스는 세션을 "모름"으로 그리고, `useLayoutEffect`에서 표식 쿠키를 읽어 올린다. 프로필(userId, 닉네임)은 `useProfileSeed` 쿼리가 `/be` 프록시를 거쳐 받는다. 레이아웃이 넘기던 Promise와 Suspense 리더는 지웠다.
- `AdsProvider`는 `mode` prop 대신 브라우저에서 `navigator.userAgent`로 앱 셸 여부를 가른다. 애드센스 로더 태그는 prod 빌드면 항상 head에 두고, 그 앞의 동기 스크립트가 앱 셸이면 광고 요청을 멈춘다.
- `GuestNoticeToast`는 마감 시각을 prop이 아니라 쿠키에서 읽는다. 쿠키 값은 Next가 `encodeURIComponent`로 적어서 `readCookie`가 디코드하게 고쳤다. 모바일에서 `%3A`가 섞여 나온 걸 보고 고친 자리다.
- `layout.tsx`에서 `isLoggedIn()`·`getGuestExpiresAt()`·`headers()` 호출을 전부 뺐다. `isLoggedIn()`은 호출처가 사라져 `_services/session.ts`에서 지웠고, `getGuestExpiresAt()`과 `isGuestFromLogout()`은 로그인 화면이 아직 서버에서 읽으므로 남겼다.
- 홈·투표·릴스 섹션의 catch에 `unstable_rethrow`를 넣었다. 정적 생성 중 Next가 제어 흐름으로 던지는 예외를 삼키면 빌드 로그에 "로드 실패"로 찍히고 라우트 판정을 가로챌 수 있다. 팀 허브·팀 프로필은 slug 6개를 `generateStaticParams`로 빌드 때 그리고, 인물·선수·이슈는 빈 배열만 선언해 첫 요청에 그려 캐시되게 했다. 이슈(`stories/[storyId]`)는 모바일에 없는 웹 전용 화면이라 인물·선수와 같은 판단을 새로 했다.
- 조회수 중복 방지. 뒤로가기로 다시 받아진 문서(`performance` navigation 항목의 `type === "back_forward"`)면 조회 POST를 보내지 않는다. `isBackForwardLanding`을 모바일에서 그대로 가져왔다.

웹에서 다르게 둔 것이 둘 있다. 하나는 스크롤 복원이다. 모바일은 화면 안 `ScrollArea`가 스크롤러라 뒤로가기 재로드 때 위치를 `sessionStorage`에 적어 되돌렸는데, 웹은 문서 자체가 스크롤러라 브라우저가 `history.scrollRestoration`으로 알아서 되돌린다. 피드 화면의 `useScrollRestore`는 push 내비게이션용이고 마운트 동안만 `manual`로 바꾸니 뒤로가기 재로드와는 무관하다. 그래서 그 부분은 옮기지 않았다. 다른 하나는 로그인 화면이다. 모바일도 로그인 화면은 서버에서 `getMyProfile()`로 유효한 소셜 세션인지 확인해 홈으로 돌려보내는 구조를 그대로 두어 `ƒ`로 남겼다. 웹도 같다. 로그인·회원가입 중 회원가입만 정적이 된다.

### 1단계 전후

타입·린트·단위 테스트(120개)·훅 테스트를 돌린 뒤 같은 조건으로 다시 빌드해 standalone을 띄웠다. 두 번째 측정에서 한 번 헛돌았다. 착수 전 서버를 `pkill`로 내렸다고 생각했는데 리스너가 남아 있어서 "변경 후" 헤더가 전부 `no-store`로 찍혔다. 브라우저 UA 응답에 `sessionKind` 쿠키가 없는 걸 보고 옛 서버라는 걸 알았고, PID로 내린 뒤 다시 찍었다. 전후 비교는 서버가 어느 빌드인지 먼저 확인하고 읽어야 한다.

| 항목                            | 전                                                                | 1단계 뒤                                                                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 빌드 표 페이지 라우트           | 31개 전부 ƒ                                                       | ○ 7(홈·FAQ·약관·개인정보·회원가입·준비중·404), ● 5(팀 허브·팀 프로필·인물·선수·이슈), ƒ 19                                                                 |
| 응답 `Cache-Control`            | 전 화면 `private, no-cache, no-store, max-age=0, must-revalidate` | FAQ·약관·개인정보·회원가입 `s-maxage=31536000`, 홈·팀 허브·이슈 `s-maxage=20`, 팀 프로필·인물·선수 `s-maxage=60`, 기사·릴스·투표·로그인·MY·라이브는 그대로 |
| `layout.tsx`의 요청 읽기        | `cookies()` 2회, `headers()` 1회                                  | 0                                                                                                                                                          |
| 정적 응답의 게스트 `Set-Cookie` | 있음                                                              | 있음(3단계에서 뗀다). `guestExpiresAt`·`sessionKind`가 HttpOnly 없이 같이 실린다                                                                           |

ISR 페이지(팀 프로필, 인물, 선수, 이슈)를 요청한 뒤 서버 로그에 ADR 0199에서 본 "Page changed from static to dynamic at runtime"는 없었다. 그 함정은 `@plick/core/client.ts`에서 이미 고쳐진 채로 웹에 와 있었다.

빌드 표와 헤더는 `docs/perf/2026-10-23-kan-667/`의 `build-before-routes.txt`·`headers-before-local.txt`·`build-after-1-routes.txt`·`headers-after-1-local.txt`다. 기사·릴스·투표가 `ƒ`로 남은 것은 페이지가 아직 토큰을 실어 받기 때문이고 2단계(KAN-664 이식)가 다룬다.

## 2단계: 기사·릴스·투표를 익명 ISR로, 내 상태는 오버레이로 (KAN-664 이식)

1단계 뒤에도 기사 상세·릴 상세·릴스 피드·투표 목록은 `ƒ`였다. 페이지가 `getAccessToken()`으로 토큰을 실어 데이터를 받고 응답의 `likedByMe`·`myVote`를 그리기 때문이다. ADR 0200의 설계를 그대로 옮겼다. 로더·브라우저 기억·쿼리 키·`setMyArticleState`·`syncLikeIntoFeeds`의 내 상태 갱신은 전부 `@plick/core`에 있어서 웹은 `useAuth`에 묶이는 훅 `useMyArticleState` 하나만 앱에 두면 됐다.

- 네 화면의 서버 fetch에서 토큰을 뺐다. 기사 상세의 `loadArticle`은 인자가 postId 하나로 줄었고, `[postId]` 두 라우트에 `revalidate = 60`과 빈 `generateStaticParams`를, 릴스 피드와 투표 목록 페이지에 `revalidate = 60`을 두었다. 릴 딥링크의 catch에는 `unstable_rethrow`를 넣었다.
- `ArticleLikeButton`은 좋아요 수만 state로 들고 눌렀는가는 훅에서 읽는다. `useReelLike`는 릴스 피드 캐시를 손으로 고치던 코드를 `syncLikeIntoFeeds`로 바꿨다. 모바일이 KAN-495에서 한 걸 웹은 안 했었는데, 이번에 내 상태 캐시까지 한 함수가 고치게 되면서 같이 맞췄다. `ReelActionRail`은 `liked` prop을 받는다.
- `DebateVoteCard`는 표 수만 state로 들고 내 표는 훅에서 읽으며 `articleId` prop이 생겼다. 기사 상세, 릴 세부 패널, 투표 목록 세 곳이 넘긴다. 웹의 투표 목록은 마감 탭도 같은 카드를 `closed`로 쓰고 있어서 모바일의 `ClosedVoteCard`는 만들지 않았다.
- `AuthProvider`가 세션 종류가 바뀌면 내 상태 캐시와 브라우저 기억을 지우고, bfcache 복원이면 내 상태 쿼리만 다시 묻는다.

### 댓글은 웹이 더 단순했다

모바일은 댓글 목록 훅이 suspense 쿼리라, 서버 씨앗을 빼면 ISR 생성 중에 서버가 토큰 없이 댓글을 받아 HTML에 굳히는 문제가 있어 `next/dynamic`의 `ssr: false`로 감쌌다. 웹의 `useComments`는 suspense가 아닌 `useInfiniteQuery`이고 `CommentList`는 `isPending`이면 아무것도 그리지 않는다. 서버 렌더에서는 쿼리가 돌지 않아 목록이 빈 채로 나가고, 마운트 뒤 프록시를 거쳐 토큰을 실어 받는다. 그래서 씨앗(`initial`)과 서버의 `getComments` 호출만 지우면 됐다. `useComments`·`CommentList`·`ArticleComments`·`ArticleMain`·페이지에서 `InitialCommentPage`가 사라졌다.

### 투표 탭이 페이지를 동적으로 붙들고 있었다

투표 페이지에 `revalidate = 60`을 두고 빌드했는데 `/debates`가 그대로 `ƒ`였다. 웹은 `?tab=closed`를 페이지가 `searchParams`로 읽어 `DebatesScreen`에 prop으로 내려주고 있었다. `searchParams`를 읽는 것도 `cookies()`처럼 요청을 읽는 것이라 그 라우트는 요청마다 렌더가 된다. 모바일은 처음부터 `DebatesFeed`가 `useSearchParams`로 브라우저에서 읽는 구조였다.

같은 모양으로 바꿨다. 페이지는 쿼리를 읽지 않고, 탭 줄은 클라이언트 컴포넌트 `DebateTabs`가, 목록은 `DebatesFeed`가 각각 `useSearchParams`로 읽는다. `useSearchParams`는 정적으로 그려지는 페이지에서 가장 가까운 Suspense 경계까지를 클라이언트 렌더로 미루므로 둘 다 Suspense 안에 두어야 한다. 목록은 이미 `DebatesSection`의 Suspense 안이었고, 탭 줄은 새로 감쌌다. fallback에 처음엔 `DebateTabs` 자신을 넣었다가 그것도 쿼리를 읽는다는 걸 알고, 쿼리를 읽지 않는 표시 전용 `DebateTabBar`를 떼어 기본 탭으로 둔 fallback을 만들었다. 서버 HTML은 늘 "진행 중" 탭 모양이고 브라우저가 쿼리를 읽어 맞춘다. 마감 탭을 새로고침하면 한 프레임 안에 바뀌는 정도라 자리는 흔들리지 않는다.

### 2단계 전후와 검증

prod BE를 보는 standalone으로 빌드 표와 헤더를 찍었다. 기사 상세·릴 상세가 `●`, 릴스 피드·투표 목록이 `○`가 됐고 `ƒ`는 15개(MY·로그인·라이브·OG·API 라우트)만 남았다. 기사 상세 응답은 `s-maxage=20`이다. 페이지에 `revalidate = 60`을 적어도 그 라우트 fetch 중 가장 짧은 값이 이기는데, 기사 상세에도 라이브 띠(20초)가 있어서다. 모바일은 띠가 없어 60초였다. 투표 목록도 같은 이유로 20초다.

| 항목                               | 1단계 뒤        | 2단계 뒤                       |
| ---------------------------------- | --------------- | ------------------------------ |
| 빌드 표 페이지 라우트              | ○ 14, ● 5, ƒ 19 | ○ 16, ● 7, ƒ 15                |
| 기사 상세·릴 상세                  | ƒ, `no-store`   | ●, `s-maxage=20`·`s-maxage=60` |
| 릴스 피드·투표 목록                | ƒ, `no-store`   | ○, `s-maxage=60`·`s-maxage=20` |
| 네 화면 서버 fetch의 Authorization | 있음            | 없음                           |

내 상태 API는 prod BE에 아직 없다. 토큰 없이 부르면 401이 와서 있는 줄 알았는데, 인증 필터가 라우팅보다 먼저 막은 것이었고 게스트 토큰을 실으니 404였다. 그래서 동작 검증은 dev BE로 했다. 브라우저 `/be` 리라이트 대상은 빌드 때 굳어 standalone을 다시 빌드해야 해서, 기능은 dev BE를 보는 dev 서버(`web-dev-remote`, 3050)에서 봤다. 전에 dev BE가 로컬 요청을 403으로 막던 것은 이번엔 GET에 한해 열려 있었다. POST(조회 기록, 분석 이벤트)는 여전히 403이라 그 둘의 콘솔 에러는 환경 탓이다.

확인한 것은 이렇다.

- 기사 상세(8757): 하이드레이션 경고 없음. `article-states?ids=8757` 한 번. 댓글은 브라우저에서 받아 7개가 떴다. 좋아요를 누르면 즉시 79·눌림이 되고 서버 액션 POST가 200, 새로고침하면 BE 응답이 `liked: true`라 하트가 찬 채로 열리고 수는 익명 캐시의 78이다(ADR 0200이 적은 절충). `localStorage`의 `plick:myArticleStates:v1`에 `{"8757":{"liked":true,"vote":null}}`이 남았다.
- 릴스 피드: 열 장의 내 상태가 `ids` 10개짜리 요청 한 번으로 왔고 방금 누른 8757만 두 레일(데스크톱·좁은 폭) 다 하트가 찼다.
- 투표 목록: `?tab=closed`로 열면 마감 탭이 선택돼 있고 마감 카드 4건의 내 표가 `ids` 4개 요청 한 번으로 왔다. 탭을 바꾸면 소프트 내비게이션으로 URL과 선택이 따라온다. 전환 중 한순간 DOM에 탭 줄이 둘 보였는데 Suspense fallback이 빠지기 전 스냅샷이었고 바로 하나가 됐다.
- 투표 쓰기는 못 눌러 봤다. dev에 지금 열린 투표가 없고, 8757에도 토론이 안 붙어 있다. `DebateVoteCard`는 모바일에서 검증된 카드를 prop 하나(`articleId`) 추가로 그대로 옮긴 것이라 타입 검사로 갈음한다. dev 배포 뒤 E2E `debates.spec`이 다시 본다.

## 3단계: 게스트 발급을 페이지 응답에서 떼다 (KAN-665 이식)

2단계까지 끝나도 정적 FAQ 응답에 게스트 토큰 `Set-Cookie` 아홉 줄이 실려 있었다. 프록시가 쿠키 없는 페이지 요청마다 발급해 그 응답에 심기 때문이다. 이 응답을 CloudFront가 저장하면 한 사람의 게스트 토큰이 다음 사람에게 나간다. ADR 0201의 설계를 그대로 옮겼다.

- 발급은 `POST /api/session/guest` 라우트가 맡는다. `/api`는 프록시 matcher 밖이라 라우트가 쿠키를 직접 심는다. 크롤러 UA와 다른 출처의 POST는 403, 세션이 이미 있으면 `issued: false`, BE 실패는 503이다. 모바일 라우트를 웹 상수(`PLICK_CLIENT`가 `desktop_web`)로 옮긴 것이고 `@plick/core`로 올리지는 않았다. 쿠키 이름·옵션·분석 헤더가 앱 상수에 묶여 있고, 공용으로 빼면 두 앱 상수를 인자로 넘기는 껍데기만 남아서다.
- `AuthProvider`가 세션이 없으면 브라우저가 한가할 때(`requestIdleCallback`, 사파리는 300ms 타이머) 발급을 요청하고, `ensureSession`으로 좋아요·투표·댓글·신고·차단이 발급을 기다렸다가 보낸다. `isSessionPending` 동안 채팅 패널은 로그인 안내 대신 자리만 비운다. 웹 패널은 모바일처럼 `null`을 돌려주면 레일 높이가 줄어 아래 레일이 튀어서, 같은 높이의 빈 상자를 둔다.
- 프록시에서 `startGuestSession`·`skipsGuestIssue`를 걷어냈다. 토큰 없는 첫 진입은 익명으로 통과하고, 게스트 마감(두 번째 재발급 401)은 새 게스트를 만들지 않고 세션 쿠키를 지워 브라우저가 다시 받게 한다. 기기 식별자와 랜딩(진입 쿼리·외부 Referer)은 head의 `deviceSyncScript`가 쿠키로 넘기고, 유입 경로·마케팅 쿠키는 첫 `/be` 응답이 심는다. 쿠키를 심는 `/be` 요청은 `next.config` rewrites 대신 프록시가 직접 BE로 rewrite한다. 외부 rewrite에서 Next가 미들웨어 응답 헤더를 버리는 문제를 ADR 0201이 찾아 둔 덕에 웹에서는 바로 피했다.
- 안전핀. 어느 갈래로든 쿠키를 심거나 지운 응답은 `Cache-Control: private, no-store`로 덮는다. 재발급, 진입 쿠키 소모, 게스트 마감이 여기 걸린다.
- MY 첫 방문은 `MeSessionGate`가 세션이 생기면 `router.refresh()`로 한 번 다시 받는다. 웹 MY는 로그인 안내 카드가 두 자리(프로필 없음, 활동 조회 401)라 둘 다 감쌌다.

핵심 스크립트는 `@plick/core`의 `deviceSyncScript({ issue, landing })`라 모바일이 붙인 `device-sync-mobile.test.mjs`가 웹까지 덮는다. 옵션 없는 갈래를 "웹"이라고 부르던 테스트 이름만 고쳤다. 두 앱이 같은 옵션을 넘기는 지금은 그 갈래를 쓰는 앱이 없다.

### 3단계 전후와 검증

dev BE를 보도록 빌드한 standalone에 착수 전과 같은 조건(브라우저 UA, 쿠키 없음)으로 요청했다. 페이지 응답 어디에도 `Set-Cookie`가 없다. 광고 랜딩(`/?utm_source=insta&fbclid=…`, 외부 Referer)도 쿠키 없이 `s-maxage=20`으로 나간다. 발급 라우트는 같은 출처 POST에 토큰 다섯 줄과 `private, no-store`로 답하고, 다른 출처와 크롤러 UA는 403이다.

| 항목                              | 2단계 뒤                          | 3단계 뒤                                                        |
| --------------------------------- | --------------------------------- | --------------------------------------------------------------- |
| 빌드 표 페이지 라우트             | ○ 16, ● 7, ƒ 15                   | ○ 16, ● 7, ƒ 16(`/api/session/guest` 추가)                      |
| 정적·ISR 문서 응답의 `Set-Cookie` | 게스트 토큰 아홉 줄               | 없음                                                            |
| 게스트 발급 자리                  | 프록시, 쿠키 없는 페이지 요청마다 | `POST /api/session/guest`, 브라우저가 한가할 때나 첫 상호작용에 |
| curl 한 번에 생기는 게스트        | 1                                 | 0                                                               |

동작은 두 겹으로 봤다. 브라우저 패널에서 새 호스트(`[::1]`)로 첫 방문하니 페이지 응답에 쿠키 없이 화면이 뜨고, 한가해진 뒤 `POST /api/session/guest`가 한 번 나가 `sessionKind`·`guestExpiresAt`·`plick_did`가 생겼다(기기 식별자는 head 스크립트가 만든다). 좋아요를 누르면 서버 액션이 200이고, 새로고침하면 발급 없이 `article-states` 한 번으로 하트가 찬다.

그런데 패널에서는 새로고침 뒤 하트가 10초 넘게 비어 있는 것으로 읽힌 적이 있었다. `article-states` 응답은 `liked: true`였고 `pageshow`를 흉내 내 무효화하면 바로 찼다. 탭을 앞으로 올리고 다시 재니 0.5초에 찼다. 패널이 숨겨져 있으면 타이머가 묶여 TanStack Query의 알림 배치가 늦게 도는 것으로, ADR 0191·KAN-457에서 본 "숨은 패널 폴링" 함정의 변형이다. 토큰이 무효한 세션의 MY 안내가 안 뜨는 것처럼 보인 것도 같은 원인이었다. 코드 버그로 쫓다 시간을 썼다.

그래서 두 번째 겹은 Playwright였다. E2E 패키지의 크로미엄으로 쿠키 없는 컨텍스트를 만들어 standalone을 탔다. 처음엔 쿠키가 하나도 안 남았는데, 헤드리스 UA(`HeadlessChrome`)가 `CRAWLER_UA_PATTERN`에 걸려 발급 라우트와 head 스크립트가 크롤러로 보고 아무것도 안 한 것이었다. 보통 크롬 UA를 주니 다음이 그대로 됐다.

- 첫 방문이 MY: 서버 HTML의 `main`은 비어 있고(게이트가 안내를 숨김), 발급 뒤 `router.refresh()`로 "계정을 연동해 주세요" 카드가 2초 안에 뜬다.
- 첫 방문이 기사: 발급 뒤 좋아요를 누르면 81·눌림, 새로고침하면 `article-states` 한 번으로 눌림이 유지되고 수는 익명 캐시의 80이다.
- access 토큰이 무효한 세션: 한 번 다시 받은 뒤 로그인 안내가 2초에 뜬다. 무한 재요청은 없다.
- access가 없고 refresh가 무효한 세션: 프록시가 재시도 뒤 세션 쿠키를 지우고, 브라우저가 새 게스트를 받아 연동 카드로 바뀐다.

웹 E2E 다섯 개(`E2E_WEB_URL`로 로컬 standalone 지정)도 통과했다(`docs/perf/2026-10-23-kan-667/e2e-web-local-after-3.txt`). dev 배포 뒤에는 같은 E2E가 dev를 탄다.

## 남긴 것

- CloudFront 콘솔. `plick.co.kr`과 `dev.plick.co.kr` 배포의 기본 비헤이비어 캐시 정책을 ADR 0201의 m.plick 설정과 같게 바꾼다(TTL 최소 0·기본 0·최대 1년, 캐시 키는 쿼리스트링 전체 + `rsc` 헤더, 쿠키 제외, 오리진 요청 정책은 AllViewer 유지). 이 저장소 밖 작업이라 PR 뒤 콘솔에서 한다. 바꾼 뒤 같은 문서 두 번 요청에 `Hit from cloudfront`, 로그인 MY가 저장되지 않음을 확인한다.
- `article-states` API가 prod BE에 아직 없다. prod 배포는 BE KAN-663이 prod에 나간 뒤여야 하트가 찬다. 그 전에 나가도 `useMyArticleState`가 실패를 삼켜 화면은 뜬다(웹 `QueryProvider`는 에러를 던지지 않는다).
- 투표 쓰기는 dev에 열린 투표가 없어 못 눌러 봤다. dev 배포 뒤 열린 투표가 생기면 E2E `debates.spec`이 본다.
- KAN-643은 이 작업의 1단계와 같은 내용이라 닫는다.

## 배포 뒤: 콘솔 적용과 prod 재측정

이 브랜치가 develop에 머지돼 dev에 배포된 뒤, 저장소 밖에 남겨 둔 CloudFront 콘솔 작업을 했다. 순서는 이랬다. 10월 23일 13:52(KST)에 `dev.plick.co.kr` 배포(E1NRBTX3Y1PE98)의 기본 비헤이비어 캐시 정책을 바꿨다. `dev-m.plick.co.kr`은 ADR 0201 때(10월 16일) 이미 바뀐 상태였다. 14:06에 develop→main PR이 머지돼 BE `plick-main-prod`(14:05~14:17)와 FE `plick-frontend-prod`(14:11~14:22) CodeDeploy가 돌았고, 14:41에 `plick.co.kr`(E1KX1LWBFZKMMY)과 `m.plick.co.kr`(EDJQ2UHUYBADH) 두 prod 배포의 정책을 바꿨다. 네 배포가 같은 커스텀 정책을 쓰게 되자 처음 만들 때 붙인 이름 `plick-mobile-documents-dev`가 틀린 말이 돼서 14:42에 `plick-documents`로 바꿨다(ID `6c5e02cc-2ac2-4c70-9c28-5be91c3303ea`). 어드민 배포만 `Managed-CachingDisabled`로 남겨 뒀다.

정책의 내용은 ADR 0201의 "남긴 것"에 적은 그대로다. TTL은 최소 0·기본 0·최대 1년이다. 최소와 기본이 0이면 CloudFront는 원본 응답의 `Cache-Control`이 말하는 시간만큼만 저장하고, 원본이 아무 말도 하지 않으면 저장하지 않는다. 최대 1년은 FAQ·약관처럼 `s-maxage=31536000`을 단 정적 문서를 그대로 받아 주기 위한 상한이다. 캐시 키는 쿼리스트링 전체와 `rsc` 헤더이고 쿠키는 키에 넣지 않는다. CloudFront는 원본의 `Vary`를 캐시 키로 쓰지 않으므로, Next가 같은 URL에 `rsc: 1` 헤더와 `_rsc` 쿼리로 요청하는 RSC 페이로드(`text/x-component`)와 HTML이 한 항목에 섞이지 않게 하려면 둘을 키에 직접 올려야 한다. 쿠키를 키에서 뺐다는 것은 로그인한 사람과 게스트가 같은 캐시 항목을 본다는 뜻이고, 그래서 세션을 보고 그리는 MY·로그인과 쿠키를 심는 응답은 전부 `private, no-store`여야 한다. 3단계의 안전핀이 그 자리다. 오리진 요청 정책은 `Managed-AllViewer`라 Miss일 때 원본에는 쿠키가 그대로 간다.

### curl로 본 것

콘솔 적용 직후 두 호스트에 브라우저 UA로 같은 문서를 두 번씩 요청했다(`docs/perf/2026-10-23-kan-667/prod-headers-after-cdn.txt`).

| 문서                           | `Cache-Control`                                           | 1번째 → 2번째 `x-cache` |
| ------------------------------ | --------------------------------------------------------- | ----------------------- |
| 홈(두 호스트)                  | `s-maxage=20, stale-while-revalidate=31535980`            | Hit → Hit               |
| FAQ(두 호스트)                 | `s-maxage=31536000`                                       | Hit → Hit               |
| 기사 상세 9679 모바일 / 웹     | `s-maxage=60` / `s-maxage=20`                             | Miss → Hit              |
| 릴스(두 호스트)                | `s-maxage=60`                                             | Hit → Hit               |
| 투표 모바일 / 웹               | `s-maxage=60` / `s-maxage=20`                             | Hit → Hit               |
| 팀 프로필 liverpool(두 호스트) | `s-maxage=60`                                             | Miss → Hit              |
| MY·로그인(두 호스트)           | `private, no-cache, no-store, max-age=0, must-revalidate` | Miss → Miss             |

홈·FAQ·릴스·투표가 첫 요청부터 Hit인 것은 내가 재기 몇 분 전에 다른 누군가가(또는 앞서 돈 Lighthouse 스모크가) 이미 받아 뒀기 때문이고, `age` 헤더가 278~284초였다. 기사 상세와 팀 프로필은 아무도 안 받은 문서라 첫 요청이 Miss였다. 32개 응답 어디에도 `Set-Cookie`가 없다. 착수 전 로컬 측정에서 여덟 줄씩 실리던 자리다. RSC 페이로드도 따로 확인했다. `rsc: 1`을 달고 `/faq?_rsc=…`를 두 번 요청하면 `text/x-component`로 Miss → Hit이고, 헤더 없이 받은 HTML 항목과 섞이지 않았다. `/_next/static` 청크는 `public, max-age=31536000, immutable`인데 이건 CloudFront가 아니라 S3 CDN이 따로 맡는 자리다(ADR 0081).

### Lighthouse bf-cache

10월 11일 감사에서 모바일 18개, 웹 19개 라우트가 전부 `bf-cache`에 실패했다. 이번엔 두 호스트의 홈·FAQ·기사 상세(9679)·릴스·투표·팀 프로필(liverpool) 12개 URL을 Lighthouse 12.8.2 CLI로 3회씩, 36회 돌렸다(`--only-audits=bf-cache`, 모바일은 기본 프로파일, 웹은 `--preset=desktop`). 36회 모두 통과했고 차단 사유는 0건이었다(`lighthouse-bfcache-prod.tsv`). ADR 0199에서 꼽힌 사유 셋은 문서 `no-store`, 메인 리소스 `no-store`, JS가 받은 응답의 `no-store`였다. 앞의 둘은 문서가 `s-maxage`로 바뀌어 사라졌다. 셋째는 조금 다르다. `/be` API 응답은 지금도 `no-cache, no-store, max-age=0, must-revalidate`인데 사유에 오르지 않았다. Lighthouse가 띄운 크롬 136이 그 조건을 더는 차단 사유로 세지 않는 것이고, 문서만 고쳐도 통과한다는 뜻이다.

### `article-states`가 prod에 들어왔다

"남긴 것"에 prod BE에는 `article-states`가 아직 없다고 적었는데, 이 글을 쓰는 사이 상황이 바뀌었다. 사설 ALB(`plick-alb-pri-prod`) 로그를 보면 12:14~12:15와 13:12~13:16에 FE가 보낸 `GET /api/v1/users/me/article-states` 다섯 건이 404였고, 14:17에 BE `plick-main-prod` CodeDeploy가 끝난 뒤 두 호스트에서 `POST /api/session/guest`로 게스트 하나를 받아 `/be/api/v1/users/me/article-states?ids=9679`를 부르니 200에 `{"articleSummaryId":9679,"liked":false,"vote":null}`이 왔다(`prod-article-states.txt`). KAN-663이 같은 날 prod에 나간 것이다. 그 전 404 구간에는 ADR 0201에서 `throwOnError`를 끈 덕에 기사 화면이 비는 대신 하트만 비어 있었다.

### ALB 로그는 이번엔 답을 주지 못했다

콘솔 적용 전후 한 시간(04:40~05:40, 05:40~06:40 UTC)의 공용 ALB 문서 요청을 셌다(`alb-buckets.tsv`). 전은 모바일 313·웹 264건, 후는 539·670건으로 오히려 늘었다. 두 가지가 겹쳤다. 후 구간에 내 Lighthouse 72회가 들어 있는데 공용 ALB 로그의 클라이언트 IP는 CloudFront 엣지 IP라 내 요청을 IP로 뺄 수 없어 UA로 뺐고(1997건), 그래도 Lighthouse가 띄운 화면이 뒤이어 보내는 요청까지 다 걸러지진 않았다. 그리고 06:20과 06:30에 크롤러 버스트가 모바일 211건, 웹 226건을 보냈다. 크롤러는 기사 2천여 개를 서로 다른 URL로 훑으니 CloudFront 캐시가 거의 돕지 못하는 트래픽이기도 하다. 사설 ALB의 BE 게스트 발급(`POST /api/v1/auth/guest`)은 전 8건, 후 79건인데 후의 대부분이 내 Lighthouse가 받은 게스트다. 측정이 곧 부작용이었다. 사람 트래픽에서 문서 요청이 얼마나 줄었는지는 측정이 없는 날 같은 시간대를 다시 세야 알 수 있다. 이번에 분명한 것은 curl과 Lighthouse가 본 것, 같은 문서의 두 번째 요청은 CloudFront가 답하고 문서는 bfcache에 들어간다는 것까지다.
