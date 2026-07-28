# web 이식 - 모바일에서 검증된 API를 web에 붙일 때

`api-integration` 스킬의 web 단계 참조 문서. 공통 규칙(env, apiFetch, fetcher, RQ, 상태 처리)은
SKILL.md와 [data-layer.md](data-layer.md), [tanstack-query.md](tanstack-query.md) 그대로다.
여기는 모바일 연결 때와 달라진 것만 담는다. 커맨드는 `/web-wire-api`다.

## 1. 계약의 출처가 바뀌었다

모바일을 붙일 때는 스웨거를 믿을 수 없어 `be-verify`로 실제 계약을 확인했다. 그 결과가 지금
모바일 코드에 굳어 있다. `_services/` 각 fetcher의 BE 응답 타입과 경계 변환, `_types/`의 도메인 타입,
`_constants/api.ts`의 매핑 테이블(`TEAM_IDS`, `STAGE_BY_BE_VALUE` 등)이 검증된 계약이다.
엔드포인트별 함정은 ADR 0030~0046에 있다(핫이슈는 토큰을 안 싣는다, 상세는 세 번째 shape다 같은 것).

web을 붙일 때는 모바일 코드를 먼저 읽는다. 같은 엔드포인트면 그 타입과 변환을 그대로 쓴다.

`be-verify`는 이럴 때만 부른다.

- 모바일이 안 붙인 새 엔드포인트를 붙일 때
- 모바일 연결 이후 BE가 바뀐 정황이 있을 때
- 뮤테이션의 DB 반영을 다시 확인하고 싶을 때

## 2. 승격 판단이 본편이다

web이 ADR 0011 게이트 C의 두 번째 실사용처다. 모바일 코드 주석들이 이 시점의 판단을 예고해 뒀다.
엔드포인트를 붙일 때마다 그 엔드포인트가 쓰는 조각을 아래 후보와 대조해 게이트 A/B/C로 판단한다.
승격하면 이동과 모바일 import 교체까지 같은 PR에서 한다(절차는 ADR 0005).

승격 후보(모바일 쪽 위치 기준).

- 계약 타입 `_types/articles.ts`, `reels.ts`, `comments.ts`, `likes.ts`, `api.ts` → `@plick/domain`
  (`api.ts`의 `MyProfile`은 KAN-319, `articles.ts`의 피드 부분(`ArticleCard`·`ArticleFeedPage`·
  `InitialArticleFeed`·`ArticleReporter`)은 KAN-321, `ArticleDetail`은 KAN-322에서 승격 완료.
  `HotArticle`은 모바일 단독이라 남았고 `articles/hot`을 web에 붙일 때 따라 올라간다)
- BE 매핑 상수 `_constants/api.ts`의 `TEAM_IDS`, `TEAM_CODES`, `TEAM_BY_KO_NAME`, `STAGE_BY_BE_VALUE` → `@plick/domain`
  (`TEAM_IDS`는 KAN-319, `TEAM_CODES`·`STAGE_BY_BE_VALUE`는 KAN-321, `TEAM_BY_KO_NAME`은
  KAN-322에서 승격 완료 — `_constants/api.ts`에 남은 건 인증 절뿐이다)
- ~~`_apis/client.ts`(`apiFetch`, `ApiError`)~~ → KAN-318에서 `@plick/core` 신설 승격 완료(ADR 0050).
  refresh fetcher도 같이 올라갔다. 이후 순수 모듈 승격은 이 패키지로 간다.
- 도메인 fetcher `_services/articles.ts`, `reels.ts`, `comments.ts`(순수 모듈만) → `@plick/core`
  (`articles.ts`의 `getArticles`는 KAN-321, `getArticle`은 KAN-322에서 `@plick/core/articles`로
  승격 완료. 핫이슈만 모바일에 남음)
- 앱 로컬 표현 컴포넌트 중 순수 원자는 `@plick/ui`로(ADR 0011 "두 번째로 쓰이면 공용").
  `PostBadges`는 KAN-322에서 승격 완료 — ui는 domain에 의존하지 않으므로 도메인 타입·상수를 쓰는
  컴포넌트는 `PostChips` 전례대로 props를 구조 타입으로 좁히고 표시 스펙을 ui가 소유하게 바꾼다
- 쿼리키 `_queries/articleKeys.ts`, `reelKeys.ts`, `commentKeys.ts`와 `query-client.ts`
  (`articleKeys`·`query-client`는 KAN-321에서 `@plick/core`로 승격 완료 — core에
  `@tanstack/react-query` 의존이 이때 생겼다. `QueryProvider`는 클라 컴포넌트라 앱별로 남긴다)
- `_utils/time.ts` 같은 순수 포맷터 (`formatChangeableAt`은 KAN-319, `formatRelativeTime`은
  KAN-321에서 `@plick/domain/format`으로 승격 완료)
- 훅(`useArticleFeed`, `useInfiniteScroll`)은 승격하지 않고 앱별 복제로 둔다(KAN-321).
  React 훅이라 core의 순수 모듈 경계 밖이고, 승격분을 다 걷어낸 뒤엔 얇은 껍데기라 복제가 싸다.
  피드 캐시 정책 상수(`_constants/feed.ts`)도 표면별 정책이라 앱별로 둔다.

`"use server"` 서버 액션 파일(`auth.ts`, `users.ts`, likes, comment-actions)은 승격하지 않는다.
쿠키와 redirect 경로가 앱에 박혀 있고 파일이 얇아 앱별 복제가 싸다. 로직 차이가 생기면 그때 다시 본다.

`FeedPost`는 방향이 반대다. web 컴포넌트 13개가 아직 이 타입을 소비하지만 모바일은 실계약과 어긋나
이미 버렸다. web도 붙이는 화면부터 실계약 타입으로 갈아탄다. `FeedPost`와 부속(`Comment`, `Debate`)은
마지막 소비자가 사라지는 PR에서 `@plick/domain`에서 지운다.

## 3. web에 새로 까는 인프라

첫 연결 PR에서 까는 것.

- `next.config.js` rewrites `/be/:path*`(모바일과 동일). web 첫 화면부터 무한스크롤 RQ가 붙으면 바로 필요하다.
- `.env.local`과 `.env.example`에 `API_BASE_URL`

인증 PR에서 까는 것.

- `apps/web/proxy.ts`. `middleware.ts`가 아니다(Next 16에서 개명, export도 `proxy`). 모바일 `proxy.ts`
  로직(Bearer 주입, refresh 회전, 실패 시 쿠키 삭제와 `/login`)을 가져오되 matcher를 web 라우트로 확인한다.
- `app/oauth/callback/route.ts`, `AuthProvider`, env에 `KAKAO_CLIENT_ID`, `GOOGLE_CLIENT_ID`, `OAUTH_REDIRECT_URI`

⚠️ web의 redirect_uri는 `http://localhost:3000/oauth/callback`이라 모바일(3001)과 다르다.
카카오와 구글 콘솔에 추가 등록해야 하고 등록은 사용자 몫이다. 인증 PR을 시작할 때 먼저 요청한다.
ADR 0023이 정확히 이 불일치로 깨진 기록이다.

## 4. 화면 쪽에서 걸리는 것

- 타입 교체가 큰 덩어리다. `FeedPost`를 받던 컴포넌트 props를 실계약 타입으로 바꾸면서 마크업이 전제하던
  필드(`timeLabel`, 단일 `team`, `author` 핸들)를 실계약(`publishedAt` ISO, 팀 배열, 닉네임)에 맞춘다.
- 프로필은 `User.myTeam` 단일에서 `MyProfile.myTeams` 다중으로 바뀐다. `me`와 `me/edit`는
  KAN-319에서 다중으로 전환했다(응원팀 목록 카드, 크레스트 그리드 다중 토글, 프로필 카드
  보조 줄은 이메일). `onboarding/team`도 KAN-320에서 다중 토글로 전환 완료(건너뛰기 링크 포함).
- 계약 공백이 여럿 있다. `NOTIF_COUNT`(알림), `TRENDING_POSTS`(실시간 인기), 기사 세부의 관련 기사와
  추천 기사는 대응 BE 엔드포인트가 없다. 목이나 피드 슬라이싱으로 채우지 않는 게 원칙이고(모바일
  KAN-283), 자리를 남겨 준비 중 문구를 둘지 통째로 숨길지는 사용자에게 확인한다. 기사 세부는
  KAN-322에서 자리를 남기고 준비 중 문구로 정했다.
- 모바일과 화면 구성이 갈리면 모바일에 맞춘다. 기사 세부는 KAN-322에서 배지 줄을 텍스트 칩
  (`PostChips`)에서 로고 배지(`PostBadges`)로 바꾸고 추천 행을 페이지 하단에서 본문 밑으로 올렸다.
  퍼블리싱 시안이 모바일 개편 이전에 그려진 경우가 있으니 시안만 보고 다르게 두지 않는다.
- web 릴스는 CSS scroll-snap 뷰어라 모바일 제스처 훅(`useReelsCarousel` 등)은 가져오지 않는다.
  debate 투표 블록도 web 릴스엔 없다.
- 화면 검증과 반응형(데스크톱 1280 기준, 330px까지)은 `web-publishing` 스킬을 따른다.

## 5. 이식 순서

권장 순서다. 화면이 익명으로도 도는 읽기부터 붙이고 인증은 그 다음, 뮤테이션은 마지막.

1. 인프라(rewrites, env)와 홈 피드(`getArticles`, `getHotArticles`). 첫 PR이 승격 판단의 대부분을 만난다.
   (피드는 KAN-321에서 완료, 핫이슈는 남음)
2. 기사 상세(KAN-322 완료)와 댓글 읽기.
3. 릴스.
4. 인증(로그인, 로그아웃, refresh proxy, oauth callback). redirect_uri 등록을 먼저 받는다.
5. 프로필과 온보딩(myTeams 화면 확인 포함).
6. 뮤테이션(좋아요, 댓글 작성, 조회수).

엔드포인트 하나가 작업 하나이자 PR 하나인 건 모바일 때와 같다. 티켓이 있으면 브랜치와 커밋에
Jira 키를 넣고, 없으면 브랜치는 `feature/web-<짧은설명>`, 커밋 메시지는 키 없이 쓴다.
