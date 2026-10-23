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
