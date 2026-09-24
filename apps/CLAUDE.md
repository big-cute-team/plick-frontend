# apps/ 공통 컨벤션

`apps/mobile`과 `apps/web` 코드에 공통으로 적용된다. 앱 파일을 열면 자동으로 로드된다.
기계로 판정할 수 있는 항목(부모 탐색 import, barrel, 임의값 색)은 `.claude/hooks/convention-check.mjs`가
편집 직후 검사해 stderr로 돌려준다. 지적이 오면 그 자리에서 고친다.

## 스타일

색과 간격, 글자, 라운드는 디자인 토큰 유틸만 쓴다. 하드코딩한 색이나 px는 금지다.
(`bg-bg`, `text-text`, `bg-accent`, `border-border`, `rounded-card`, `px-edge`)

화면 좌우 패딩은 `px-edge`다. Tailwind 예약어라 `px-screen`은 안 된다([ADR 0002](../docs/adr/0002-mobile-home-layout.md) §6).

앱은 라이트 고정이다(`<html data-theme="light">`, KAN-567 리디자인). 테마 토글 UI는 없고 옛 다크
팔레트는 `theme.css`의 `[data-theme="dark"]` 블록에 잠들어 있다. 화면은 라이트 기준으로만 만들되 색은
토큰으로 쓴다. 라운드 토큰은 앱만 둥글고 웹은 `globals.css`가 0으로 덮어 각지다. 빨강(`danger`)은
댓글 수, 새 글 `N`, 하트, BEST, VS, LIVE에만 쓴다. 회색 글자 하한은 `text-4`(#767676)다.

파일은 kebab-case, 컴포넌트는 PascalCase, 훅은 useXxx, 상수는 UPPER_SNAKE.

기본은 서버 컴포넌트다. 상호작용이 있을 때만 `"use client"`.

주석은 JSDoc 블록 주석으로 쓴다. 선언 위에 이중 슬래시(`//`) 블록은 금지다. props와 인자는 `@param`,
예시는 `@example`로 단다. 표현식 내부처럼 JSDoc이 불가능한 자리의 제약 설명만 인라인 `//`로 허용한다.

## 절대경로 import (`@/`)

각 앱 `tsconfig.json`에 `@/* → ./app/*` alias가 있다(`baseUrl: "."`).
컴포넌트 파일 밖으로 올라가는 import는 절대경로 `@/…`로 쓴다. `../`나 `../../` 부모 탐색은 금지다.
예: `@/_types/app`, `@/_components/AppShell`, `@/_constants/reels`

같은 폴더 형제는 상대경로 `./`를 그대로 둔다. 절대경로로 바꾸면 더 길고 관용에 어긋난다.

자기 폴더 아래로 내려가는 import도 `./`로 쓴다(`page.tsx`에서 `./_components/…`).
부모를 거쳐야 닿을 때만 `@/…`를 쓴다(`reels/[postId]/page.tsx`에서 `@/reels/_components/…`).

`next/`나 `react`, `@plick/*` 같은 패키지 import는 그대로 쓴다.

## 레이어 폴더 (레이어드 아키텍처)

앱 코드는 `app/` 안 레이어 폴더에 배치한다([ADR 0029](../docs/adr/0029-layered-architecture-restructure.md)).
underscore 폴더는 Next private folder라 라우팅에서 제외된다.

- `_components/`: 2개 화면 이상 공용 컴포넌트. 한 화면 전용은 그 라우트의 `_components/`에 co-locate한다.
- `_hooks/`: 커스텀 훅 전부. 라우트 전용이어도 여기 둔다. 파일 하나에 훅 하나로 `useXxx.ts`.
- `_services/`: 서버 액션(`"use server"`), 서버 fetcher, 세션·OAuth 같은 비즈니스 로직.
- `_queries/`: TanStack Query(QueryClient, Provider, 쿼리·뮤테이션 훅).
- `_stores/`: zustand 스토어.
- `_apis/`: 통신 유틸(`apiFetch` 래퍼, `ApiError`).
- `_utils/`: 도메인 무관 순수 헬퍼.
- `_types/`, `_constants/`, `_mocks/`: 타입·상수·목데이터.

`_utils`·`_types`·`_constants`·`_mocks`는 주제별 파일로 쪼갠다(`_constants/reels.ts`, `_types/api.ts`).
거대 단일 파일을 만들지 않는다. 컴포넌트 파일에 타입·상수·순수함수를 인라인으로 두지 않는다.

barrel(index.ts) 파일은 금지다. edge 미들웨어 번들에 서버 액션이 딸려 들어간다.

web과 mobile이 함께 쓰는 도메인 타입(FeedPost 등)과 참조 상수(TEAMS 등), 포맷 유틸은
`@plick/domain`(types/constants/format)이 단일 출처다(ADR 0018). 앱 레이어 폴더에는 앱 전용만 남긴다
(web `NAV_LINKS`, mobile `TABS`).

예외로, 한 컴포넌트 안에서만 쓰는 사적이고 자명한 타입(그 컴포넌트 로컬 `IconProps` 등)은 인라인으로 둔다.
