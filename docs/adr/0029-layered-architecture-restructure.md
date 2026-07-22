# 0029. 레이어드 아키텍처로 폴더 구조 재구성 (web·mobile)

## 무엇을 했나

WOOWACON 2023 "팀 내 표준 개발 환경" 발표에 나오는 레이어드 구조 — Page / Component /
Business(hooks, services) / Store(queries, stores) / Utility(apis, utils) — 를 두 앱에 적용했다.
지금까지는 라우트별 `_lib` co-location 구조였다. `reels/_lib/constants.ts`처럼 화면 옆에 그 화면의
타입·상수·유틸·훅을 두는 방식이었는데, 이걸 전부 `app/` 바로 아래 레이어 폴더로 모았다.

최종 구조는 이렇다 (두 앱 공통):

```
app/
  _components/   앱 전역 공용 컴포넌트 (화면 전용은 라우트 _components/에 그대로)
  _hooks/        커스텀 훅 전부
  _services/     서버 액션, 서버 fetcher, 세션·OAuth 로직
  _queries/      TanStack Query (query-client.ts, QueryProvider.tsx)
  _stores/       zustand (아직 뼈대만)
  _apis/         apiFetch 래퍼, ApiError
  _utils/        순수 헬퍼 (reels.ts, me.ts 처럼 주제별 파일)
  _types/ _constants/ _mocks/   주제별 파일 (app.ts, api.ts, reels.ts …)
```

TanStack Query와 zustand도 이번에 설치했다. 실제로 쿼리를 쓰는 화면은 아직 없고, Provider와
QueryClient 세팅까지만 해뒀다. mock을 fetch로 바꾸는 작업(/wire-api)이 릴스나 뮤테이션을 만나면
그때부터 `_queries`가 채워진다.

## 왜 했나

발표의 구조를 그대로 갖고 싶어서라기보다, "이 파일 어디에 두지?"라는 판단을 없애고 싶었다.
지금까지는 화면 하나 만들 때마다 상수를 앱 `_lib`에 둘지 라우트 `_lib`에 둘지, 훅은 어디에 둘지를
매번 정했다. 규칙은 CLAUDE.md에 있었지만 "2개 이상 화면이 쓰면 전역, 아니면 라우트"라는 기준은
파일이 두 번째 소비자를 만나는 순간 이사를 요구한다. 실제로 `useNicknameCheck`는 온보딩 전용으로
시작했다가 프로필 수정이 쓰게 되면서 앱 `_lib`로 옮긴 이력이 있다. 레이어 폴더로 모으면 이 이사가
없어진다. 훅은 처음부터 `_hooks`다.

## App Router에 그대로 이식하면 안 되는 이유부터 정리했다

저 발표의 레이어링은 CSR SPA 시절 구조다. 모든 코드가 브라우저에서 돌던 때는
"컴포넌트 → 훅 → 쿼리/스토어 → api"가 데이터 흐름 그 자체였다. App Router에선 세 가지가 어긋난다.

첫째, Store 레이어의 비중이 다르다. 서버 컴포넌트가 fetch를 직접 하기 때문에 단발 조회는 쿼리
레이어를 거칠 필요가 없다. PLick도 이미 `me/page.tsx`가 `profile.ts`(서버 fetcher)를 직접 `await`
한다. 그래서 `_queries`는 발표에서처럼 중심 레이어가 아니라, 릴스 무한스크롤과 낙관적 뮤테이션
같은 클라이언트 상호작용 전용의 얇은 보조 레이어가 된다.

둘째, Business 레이어의 의미가 달라진다. 원본의 services는 클라이언트에서 부르는 API 서비스
모듈인데, 우리 `_services`에는 `"use server"` 서버 액션(auth.ts, users.ts), 서버 전용
fetcher(profile.ts), edge 미들웨어용 함수(refresh.ts)가 섞인다. 폴더 이름은 같지만 서버/클라
경계라는 새 축이 하나 더 있고, 이건 폴더 구조가 표현해주지 못한다. 파일별 지시어와 규율로
지켜야 한다.

셋째, colocation이 App Router의 설계 사상이다. 라우트 옆에 그 화면 코드를 두는 게 공식 문서가
미는 방식이라, 완전 레이어드는 이 강점을 버리는 일이다.

그래서 하이브리드로 정했다. 한 화면 전용 컴포넌트는 라우트 `_components/`에 남기고(화면과 마크업은
같이 움직이는 게 맞다), 훅·서비스·쿼리·스토어·API·유틸·타입·상수·목은 레이어 폴더로 모은다.
레이어 폴더는 전부 underscore로 시작해서 Next의 private folder 규칙에 걸린다 — 라우팅에서
자동 제외되므로 `app/` 안에 둬도 URL이 생기지 않는다. 기존 `_components`·`_lib`이 이미 쓰던
메커니즘 그대로다.

## `_lib`을 부분 잔류시킬지, 전면 해체할지

처음엔 라우트 전용 상수·타입은 라우트 `_lib`에 남기는 안도 검토했다. `(home)/_lib/constants.ts`의
`CARD_W` 같은 초지역 상수가 소비처에서 멀어지는 게 걸렸다. 그런데 이 안은 규칙을 두 갈래로
만든다. "훅은 전역인데 상수는 라우트 로컬"이 되고, `_lib`이라는 옛 이름이 새 구조와 공존한다.
문서도 두 규칙을 다 설명해야 한다.

전면 해체를 선택했다. 규칙이 "컴포넌트만 co-locate, 나머지는 레이어 폴더" 한 줄이 되고,
마이그레이션 완료를 `grep "_lib"` 0건으로 기계 검증할 수 있다는 게 컸다. 지역성 손실은 레이어
폴더 안을 주제별 파일로 쪼개서 완화했다. `_constants/home.ts`, `_utils/reels.ts` 식이라 소비처와
파일명이 붙어 있다. 거대 단일 `constants.ts`는 만들지 않는다.

## oauth.ts는 어디 소속인가

이동 맵에서 유일하게 고민한 파일이다. `oauth.ts`는 인가 URL을 조립하고 state를 포장하는
헬퍼라서 언뜻 `_utils` 같다. 그런데 뜯어보면 `process.env`에서 클라이언트 ID를 읽으니 엄밀한
순수 함수가 아니고, 소비자가 `_services/auth.ts`와 `oauth/callback/route.ts`뿐인 인증 도메인
로직이다. `_utils`를 "도메인 무관 순수 함수"로 좁게 유지하는 게 경계가 선명해서 `_services`로
보냈다. 같은 논리로 `_apis`에는 실제 통신 래퍼(`apiFetch`)만 남겼다. 구 `_lib/api/constants.ts`와
`types.ts`는 `_constants/api.ts`, `_types/api.ts`로 갔다 — `_apis`에 남기면 거기가 제2의 잡동사니
폴더가 된다.

이 파일들이 애초에 왜 분리돼 있었는지도 옮기면서 다시 확인했다. `"use server"` 파일은 async 함수만
export할 수 있다. 서버 액션 파일에 상수를 같이 두면 빌드가 거부한다. 그래서 `AUTH_COOKIES` 같은
상수가 별도 파일로 존재했던 거고, 이 제약은 새 구조에서도 그대로다. `_services/auth.ts`에 상수를
되끌어오면 안 된다.

## barrel 금지를 규칙으로 못박은 이유

`_services/index.ts` 같은 barrel(여러 모듈을 한 파일에서 재export하는 index)을 만들면 편해
보이지만, edge 미들웨어가 `refresh.ts` 하나를 쓰려고 barrel을 거치는 순간 `next/headers`를 쓰는
서버 액션들이 edge 번들에 딸려 들어온다. `middleware.ts`는 edge 런타임이라 이게 빌드 에러나
런타임 폭탄이 된다. 지금 `refresh.ts`의 의존은 `_apis/client.ts`뿐이라 안전한데, 이 안전이
우연이 아니라 규칙이 되도록 CLAUDE.md에 barrel 금지를 명시했다.

## TanStack Query Provider — useState로 만들지 않았다

흔한 예제는 Provider 컴포넌트에서 `useState(() => new QueryClient())`로 클라이언트를 만든다.
TanStack 공식 문서는 이제 이 패턴을 피하라고 한다. React가 suspend로 초기 렌더를 버리면(그리고
경계 밖에 클라이언트가 없으면) useState로 잡은 클라이언트도 같이 버려질 수 있어서다. 대신
`getQueryClient()` 함수를 렌더 중에 호출한다:

- 서버(`isServer`)면 호출마다 새 QueryClient를 만든다. 서버에서 싱글턴을 쓰면 요청 A의 캐시가
  요청 B에 보이는 오염이 생기므로, 요청마다 격리한다.
- 브라우저면 모듈 스코프 변수에 싱글턴으로 잡는다(`browserQueryClient ??= makeQueryClient()`).
  리렌더마다 새 클라이언트를 만들면 캐시가 초기화되니 한 번만 만든다.

`staleTime: 60_000`을 기본으로 뒀다. 0이면 SSR로 방금 그린 데이터를 클라이언트가 마운트 직후
또 fetch한다. 루트 layout에서는 `<QueryProvider>{children}</QueryProvider>`로 감쌌는데, children을
props로 통과시키는 구조라 하위 서버 컴포넌트가 클라이언트 컴포넌트로 강등되지 않는다. Provider가
`"use client"`여도 그 안에 꽂히는 children은 서버에서 렌더된 결과가 슬롯으로 들어오는 것이다.

zustand는 설치만 했다. 지금 클라 전역 상태가 없어서 스토어를 억지로 만들지 않았고, `_stores`는
`.gitkeep`으로 자리만 잡았다(git은 빈 폴더를 추적하지 않는다). 첫 스토어를 만들 때 클라 전용 UI
상태면 `create`로 충분하고, SSR 상태를 담게 되면 요청별 store + context 패턴이 필요하다는 것만
방침으로 남긴다.

## 마이그레이션 자체는 순조로웠다

`git mv`로 21개 파일을 옮겨 히스토리를 보존하고, import 재작성은 perl 일괄 치환으로 했다.
막힌 데는 두 종류였다. 하나는 일괄 치환이 못 잡는 상대경로 import — `me/page.tsx`의
`./_lib/constants`와 `NicknameEditField`의 `../_lib/utils`(이건 원래부터 부모 탐색 금지 규칙
위반이었다). 둘 다 수동으로 `@/` 절대경로로 바꿨다. 다른 하나는 옮긴 파일들 내부의 형제
import다. 구 `_lib/api/` 안에서는 `./client`, `./constants`가 형제였지만 폴더가 갈라지면서
`@/_apis/client`, `@/_constants/api`로 바꿔야 했다. `_services/auth.ts` → `./oauth`만 여전히
형제라 상대경로로 남았다.

검증은 `grep "_lib"` 0건 확인 후 두 앱 각각 lint, check-types, build를 돌렸고 전부 통과했다.
underscore 폴더가 라우트로 잡히는 문제는 예상대로 없었다(빌드 라우트 목록이 이동 전과 동일).

## 남긴 것들

- web은 폴더만 있고 내용이 없는 레이어(`_apis`, `_services`, `_hooks`, `_utils`, `_stores`)가
  있다. 구조가 코드보다 앞서간 상태인데, web에 API를 붙이는 시점에 mobile과 같은 자리로 채워진다.
- `profile.ts`·`session.ts` 같은 서버 전용 모듈은 `next/headers` import로만 보호된다. 클라
  컴포넌트가 실수로 import하면 빌드 에러로 드러나긴 하지만, `server-only` 패키지를 깔면 의도를
  선언적으로 못박을 수 있다. 이번 스코프에선 안 했고 후속 과제로 남긴다.
- 앱이 커져서 레이어 폴더가 비대해지면 폴더 안을 도메인별 하위 폴더(`_hooks/reels/`)로 쪼개는
  진화 경로를 열어뒀다. 레이어드에서 시작해 도메인 기반으로 넘어가는 자연스러운 길이다.
- 브랜치는 `chore/layered-architecture`로 했다. 대응하는 Jira 티켓이 없는 구조 작업이라
  `feature/KAN-*` 컨벤션 대신 chore를 썼다(0028의 `chore/be-verify-subagent` 선례).

## 후속: 훅 폴더의 발견 가능성 걱정

PR을 올리고 나서 "훅을 전부 `_hooks`에 모으면, 나중에 훅이 많아졌을 때 어떤 훅이 이미 있는지
일일이 찾아봐야 하지 않냐"는 걱정이 나왔다. 재사용하려는 시점의 발견 가능성 문제다.

따져보니 이 걱정은 오히려 co-location 구조에서 진짜가 된다. 훅이 `reels/_lib/`, `me/edit/_lib/`,
`onboarding/_lib/`에 흩어져 있으면 "비슷한 훅 있었나?"를 확인하러 앱 트리 전체를 뒤져야 한다.
한 폴더에 모여 있으면 그 폴더가 곧 훅 전체 목록이다. 재사용 탐색만 놓고 보면 모으는 쪽이 유리하다.

실무 동선도 두 개 있다. 훅은 전부 `useXxx` 네이밍이라 컴포넌트에서 `use`까지만 쳐도 에디터가
익스포트된 훅을 auto-import 후보로 다 띄워주고, 이때 JSDoc 첫 줄이 같이 보인다. 그리고 `/audit`
(code-audit 스킬)이 같은 로직의 중복 구현을 잡는 항목을 이미 갖고 있어서, 모르고 비슷한 훅을
또 만들어도 감사에서 걸린다.

그래도 사람보다는 화면을 찍어내는 클로드가 중복 훅을 만들 위험이 있어서, 두 퍼블리싱 스킬
(screen-publishing, web-publishing)에 규칙을 한 줄 넣었다. 새 훅을 만들기 전에 `app/_hooks/`를
먼저 훑고, 새로 만들면 JSDoc 첫 줄에 요약을 달라는 내용이다. 그 첫 줄이 자동완성 목록에서
읽히는 줄이라 요약의 품질이 곧 발견 가능성이 된다.

관련 문서: 폴더 규칙 자체는 CLAUDE.md "레이어 폴더" 절, 공용 경계 판단은
[ADR 0011](0011-shared-code-boundary.md), 도메인 타입 단일 출처는 ADR 0018,
데이터 레이어 상세는 `api-integration` 스킬(data-layer.md, tanstack-query.md).
