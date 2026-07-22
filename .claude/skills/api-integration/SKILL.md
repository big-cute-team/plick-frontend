---
name: api-integration
description: >-
  PLick에서 퍼블리싱 끝난 화면에 로컬 백엔드(스웨거) API를 하나씩 붙일 때(mock→fetch 교체) 따르는 규칙.
  스웨거로 실제 응답 shape 확인, 도메인 타입에 손으로 매핑, 데이터 레이어(_services·_apis) 배치,
  서버 컴포넌트 fetch(기본)와 TanStack Query(릴스·뮤테이션) 구분, 로딩·에러·빈 상태,
  무엇을 공용(@plick/*)으로 뺄지 ADR 0011 기준 판단. Use when connecting backend APIs,
  replacing mock data with fetch, reading a Swagger/OpenAPI spec, wiring endpoints into
  apps/web or apps/mobile, aligning response types, choosing server fetch vs TanStack Query,
  or deciding whether shared data/types should be promoted to a package.
---

# BE API 연결 (mock에서 fetch로)

로컬에 뜬 백엔드를 엔드포인트 하나씩 화면에 붙인다. 이 스킬이 잡는 건 넷이다.
실제 응답 shape를 확인해 도메인 타입에 맞추기, mock을 fetch로 안전하게 갈아끼우기,
서버 fetch냐 TanStack Query냐를 표면 성격으로 가르기, web과 mobile 공통을 언제 무엇을 공용으로 뺄지.

세부 코드 패턴은 참조 파일 둘에 있다. 읽고 그대로 따른다.

- [data-layer.md](data-layer.md): env와 프록시 세팅, `apiFetch` 클라이언트, 도메인 fetcher, 경계 변환,
  서버 컴포넌트 교체, 스웨거 읽는 법, 로컬 BE로 검증.
- [tanstack-query.md](tanstack-query.md): RQ를 언제 도입하는지, provider와 쿼리키, 무한스크롤과 prefetch,
  낙관적 뮤테이션, 서버에서 클라로 하이드레이션.

배경은 [ADR 0011 공용 경계](../../docs/adr/0011-shared-code-boundary.md)와
[ADR 0005 승격 절차](../../docs/adr/0005-web-home-and-ui-promotion.md)에 있다.

## 0. 확정된 아키텍처 결정

KAN-249 첫 API 연결에서 정한 기본값이다. 다르게 갈 이유가 생기면 사용자에게 확인하고 이 절을 고친다.

로컬 BE는 Spring `http://localhost:8080`. 스웨거 UI는 `/swagger-ui/index.html`, 스펙 JSON은 `/v3/api-docs`.

base URL은 서버 전용 env `API_BASE_URL`이고 클라에 노출하지 않는다. 클라 fetch가 생기면 Next `rewrites`로
same-origin `/be/*` 프록시를 깔아 CORS를 없애고 base를 한 곳에 둔다([data-layer.md](data-layer.md) §1).

타입은 손으로 도메인 타입에 매핑한다. 코드젠(openapi-typescript)은 쓰지 않는다. 스웨거 응답을 기존
`_types/`로 경계에서 변환하고, BE 필드명이 화면 관용과 다르면 데이터 레이어에서 흡수한다.

BE는 모든 응답을 `{ code, message, data }` 봉투로 감싼다(스웨거 `ApiResponse*`). `apiFetch`가 벗겨 `data`만
돌려주고 에러는 `ApiError(status, code, message)`로 정규화한다. 화면 분기는 status가 아니라 `code` 문자열
(`USER_ALREADY_ONBOARDED` 등)로 하는 경우가 많으니 붙일 때 code를 꼭 받아둔다.

인증은 이미 붙어 있다(KAN-255~269, ADR 0019~0027). access와 refresh 토큰을 HttpOnly 쿠키로 두고,
서버 컴포넌트와 서버 액션이 `cookies()`로 꺼내 호출마다 `Authorization: Bearer …`로 싣는다
(`apps/mobile/app/_services/users.ts`). 만료는 미들웨어가 refresh로 잇는다(ADR 0021).
보호 API를 실제로 밟는 검증은 `be-verify` 서브에이전트가 토큰을 민팅해서 한다(§6).

### 페칭 도구

| 표면                                  | 성격                   | 도구                |
| ------------------------------------- | ---------------------- | ------------------- |
| 홈 피드 첫 로드, 상세 요약, MY 프로필 | 한 번 읽고 렌더 끝     | 서버 컴포넌트 fetch |
| 릴스 다음 페이지 prefetch, 무한스크롤 | 클라에서 계속 이어짐   | TanStack Query      |
| 좋아요, 투표, 댓글                    | 낙관적 업데이트와 롤백 | TanStack Query      |

가르는 기준은 클라에서 이어지느냐다. 단발 읽기는 서버, 이어지는 읽기와 쓰기는 RQ.

둘이 만나는 릴스는 서버가 1페이지를 fetch해 `HydrationBoundary`로 RQ에 심고 클라가 이어받는다. 이중 페치는 없다.

RQ는 지금 깔지 않는다. 처음으로 클라 연속이나 뮤테이션이 필요한 엔드포인트(릴스 페이지네이션이나 첫 좋아요)에서
도입한다. 그 전 단순 GET은 서버 fetch로 간다. 조기 의존성도 나중 대공사도 피하려는 것이다.
트리거와 패턴은 [tanstack-query.md](tanstack-query.md)에 있다.

## 1. 왜 이 단계가 특별한가

퍼블리싱 때는 각 앱 `_mocks/posts.ts`가 화면에 데이터를 먹였고 타입은 `_types/`가 BE 목표 shape로 들고 있었다.
BE가 붙으면 그 mock을 실제 응답으로 교체한다. 이때 도메인 데이터의 모양이 처음으로 굳으므로
무엇을 공용으로 뺄지 판단하기 좋은 시점이다([ADR 0011 게이트 C](../../docs/adr/0011-shared-code-boundary.md)).

지금 소비 패턴은 깔끔하다. 페이지(서버 컴포넌트)가 `HOT_POSTS` 같은 mock을 import해 `_components`에 props로
내려준다. 교체는 공급원만 바꾸는 일이다. `import { HOT_POSTS }`가 `const posts = await getPosts()`가 된다(§4).

## 2. 순서 (엔드포인트 하나가 작업 하나이자 PR 하나)

1. 실제 shape 파악은 `be-verify` 서브에이전트에 위임한다. 항상 위임한다. 티켓도 스웨거 설명도 믿지 않는다.
   그쪽이 스웨거를 읽고 실제로 때려서 path, method, 파라미터, 요청 body, 응답 필드와 타입, 페이지네이션,
   에러 code까지 대조한 리포트를 돌려준다. 보호 API면 JWT 민팅과 일회용 테스트 유저, DB 대조도 그쪽 몫이다.
   손으로 할 때의 명령어는 [data-layer.md](data-layer.md) §2에 있다.
2. 응답 shape를 도메인 타입과 대조한다. 같으면 그대로 두고, 다르면 타입을 BE에 맞춰 조정하되
   web과 mobile 양쪽 `types.ts`를 같은 모양으로 동기화한다(수동 계약).
   BE 필드명이 화면 관용과 다르면 경계에서 변환한다(`view_count`를 `views`로). 변환은 데이터 레이어에서 한다.
3. 데이터 접근 레이어를 작성한다. `apiFetch` 위에 도메인 fetcher를 `_services/`에 두고 경계 변환도 여기서 한다.
   화면 컴포넌트는 소비 형태를 그대로 유지하고 mock 대신 이 레이어 결과를 받는다([data-layer.md](data-layer.md) §3~4).
4. 페칭 도구를 고른다. §0 표를 쓴다. 단발 읽기는 서버 fetch, 릴스와 뮤테이션은 RQ.
5. 로딩과 에러, 빈 상태를 처리한다(§5). mock의 항상 성공하고 즉시 오는 성질에 속지 않는다.
6. 공용화를 판단한다(§3). 이 PR에서 뺄지 후보로만 기록할지 정한다.
7. 검증한다(§6). 계약과 DB는 `be-verify`, 화면은 브라우저로 직접.
8. 커밋하고 PR을 올린다. 티켓 키를 넣고 `develop` 기준 브랜치에서 CI를 통과시킨다. 병합은 사용자가 한다.

## 3. 공용화 판단

BE를 붙이다 web과 mobile이 같은 걸 쓰는 게 보여도 바로 빼지 않는다. 아래 규칙으로 나눈다.

### 3-1. 무엇을 어디로

| 종류                                                             | 어떻게                                                                                                        | 왜                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 데이터와 타입 (응답 shape, `FeedPost`, `Comment`, 팀 레지스트리) | BE 확정 후 양쪽이 같은 모양이면 공용 승격 검토. 수동 동기화를 단일 정의와 양쪽 import로 바꾼다.               | BE가 모양을 정하므로 이때 굳는다. 굳은 계약은 한 곳에 둬야 드리프트가 없다.       |
| 화면 표현 (`ArticleBody`, 리스트, 시트)                          | 앱별로 유지한다. BE가 붙어도 빼지 않는다.                                                                     | 스케일과 인터랙션, 레이아웃이 web과 mobile에서 다르다. 합치면 variant가 폭발한다. |
| 순수 원자와 유틸 (아이콘, 썸네일, 배지, `formatCount`)           | BE와 무관하게 두 번째로 쓰이면 언제든 `@plick/ui`로.                                                          | 도메인이 없어 굳을 걸 기다릴 필요가 없다.                                         |
| fetch 인프라 (`apiFetch` 래퍼, RQ provider와 쿼리키 규약)        | 첫 앱은 앱별 레이어 폴더(`_apis/`·`_queries/`)에 둔다. 두 번째 앱이 같은 규약을 쓰면 `@plick/core` 승격 검토. | 데이터나 타입과 같은 성숙도 게이트를 탄다.                                        |

한 줄로 줄이면, 데이터와 fetch 규약은 굳으면 공용, 표현은 앱별, 원자는 두 번째 쓰이면 공용이다.

### 3-2. 승격 게이트 (ADR 0011)

셋 다 통과해야 뺀다.

A. 앱 역참조 금지. 패키지가 `@/_services/…` 같은 앱 내부나 라우트, `TEAMS`를 내부에서 조회하면 실격이다. 못 끊으면 승격할 수 없다.
끊으려면 값을 prop으로 주입한다(`MediaThumb`은 `TeamCode`가 아니라 `colorVar`를 받는다).

B. 동일성. 두 앱에서 스케일과 인터랙션, 레이아웃이 정말 같은지 본다. 갈리면 앱별로 둔다.

C. 성숙도. 두 번째 실사용처가 이미 있고 모양이 굳었는지 본다. BE로 shape가 확정된 때가 이 관문이 서는 시점이다.

### 3-3. 타이밍

엔드포인트를 하나씩 붙이면서 첫 앱에선 앱별로 붙인다. 두 번째 앱에서 같은 shape를 또 쓰게 될 때 올린다.
첫 번째부터 언젠가 공유하겠지 하고 미리 빼지 않는다.

### 3-4. 확신이 안 서면

기본값인 앱별과 주입은 되돌리기 싸다. 애매하면 승격하지 말고 ADR 0011 §7 열린 후보 목록에 한 줄 남긴다.
근거가 필요하면 추측하지 말고 `/audit`으로 진짜 중복인지 확인한 뒤 정한다.

## 4. mock에서 fetch로 교체하기

화면은 mock을 데이터로만 소비하도록 짜여 있다. props로 받아 렌더한다. 그래서 교체는 공급원만 바꾸는 일이다.

서버 컴포넌트는 페이지나 레이아웃에서 데이터 레이어를 `await`해 자식에 내려준다.
`import { HOT_POSTS } from "@/_mocks/posts"`이 `const posts = await getHotPosts()`가 된다.

필요 없어진 목데이터는 그 PR에서 바로 지운다(사용자 확정 규칙, KAN-264). 화면이 실제 데이터를 받게 됐으면
목을 흘리던 import와 초기값을 남기지 않는다. 임시로 남겨두지 않는다. 실제 초기값이 아직 미연동 API 몫이면
목으로 때우지 말고 빈 값으로 시작시키고 그 API 티켓에서 채운다. `mock.ts` 파일 자체는 아직 다른 미연동 화면이
쓰는 동안만 남고, 마지막 소비자가 사라지면 파일도 지운다.

타입은 이미 BE 목표 shape라 대개 그대로 쓴다. 필드 차이는 §2의 경계 변환으로 흡수한다.

서버 컴포넌트 교체 diff와 도메인 fetcher 골격은 [data-layer.md](data-layer.md) §4에 있다.

## 5. 로딩, 에러, 빈 상태

mock은 항상 성공하고 즉시 왔지만 fetch는 아니다. 화면마다 세 상태를 토큰으로 처리한다.

로딩은 서버 fetch면 Next `loading.tsx`나 Suspense, RQ면 `isPending`으로 잡는다. 스켈레톤은 `bg-elevate`나
`bg-media` 토큰을 쓴다.

에러는 서버면 `error.tsx`나 분기, RQ면 `isError`로 잡는다. 재시도 버튼은 기존 버튼 토큰을 재사용한다.

빈 상태는 홈 `NewsFeed`의 "아직 이 팀 소식이 없어요"(`text-text-4`) 같은 기존 패턴을 따른다.

색을 하드코딩하지 않는다. 색은 토큰, 문구는 화면 카피 규칙대로 쓴다.

## 6. 검증

검증은 둘로 갈린다. 반복적이고 긴 계약 쪽은 위임하고, 눈으로 봐야 하는 화면만 직접 한다.

계약과 DB는 [`be-verify` 서브에이전트](../../agents/be-verify.md)에 위임한다. 스웨거 대조, JWT 민팅,
일회용 테스트 유저 생성과 삭제, curl 시나리오(성공, 401, 400, 409, 빈 값), DB 반영 확인을 그쪽이 다 하고
요약만 준다. 도구는 `scripts/be-verify/`의 `mint-jwt.mjs`와 `db.sh`다. 민팅과 psql 명령을 매번 새로 짜지 않는다.

화면은 직접 확인한다. dev 서버(`pnpm --filter mobile dev`)와 `localhost:8080` BE를 띄우고 네트워크 탭으로
요청과 응답을 보면서 로딩, 성공, 에러, 빈 상태를 밟는다. 로그인 게이트 뒤 화면은 민팅한 토큰을 브라우저 쿠키로
심고 들어간다. CORS와 프록시는 [data-layer.md](data-layer.md) §5.

⚠️ 공유 DB다. 쓰기는 자기가 만든 일회용 행에만 하고 끝나면 지운다. 기존 유저 닉네임을 바꾸면 7일 잠긴다.

공용(타입이나 패키지)을 건드렸으면 `pnpm --filter web build`와 `pnpm --filter mobile build`를 둘 다 돌려
회귀를 본다. `pnpm check-types`, format:check, lint, CI도 통과시킨다.

## 7. 아직 열린 항목

정해지면 사용자에게 확인하고 이 스킬에 확정한다.

재검증 전략. 서버 fetch의 `next.revalidate`와 `cache` 값은 엔드포인트별 신선도 요구가 나오면 정한다.

페이지네이션 계약. 릴스와 피드가 cursor인지 offset인지, 응답의 `hasNext`나 `nextCursor` 필드명이 무엇인지
스웨거에서 확인해 [tanstack-query.md](tanstack-query.md)에 맞춘다.

공용 타입 패키지(`@plick/types`나 `@plick/core`) 신설. 두 번째 앱이 같은 shape를 쓸 때 §3 게이트로 판단한다.

불명확하면 추측하지 말고 사용자에게 확인한다.

## 참고

- [data-layer.md](data-layer.md), [tanstack-query.md](tanstack-query.md): 이 스킬의 코드 패턴.
- [ADR 0011 공용 경계](../../docs/adr/0011-shared-code-boundary.md): 무엇을 공용으로 뺄지 판단하는 게이트.
- [ADR 0005 승격 절차](../../docs/adr/0005-web-home-and-ui-promotion.md): 실제로 올릴 때 밟는 절차.
- `screen-publishing`, `web-publishing`: 화면 컴포넌트 규칙.
- 문서를 쓸 때는 `doc-style` 스킬을, ADR은 CLAUDE.md `작업 기록`의 회고체를 따른다.
