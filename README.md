# PLick

프리미어리그 이적 루머를 릴스처럼 넘겨보는 앱. 루머 카드에 기자 신뢰도와 이적 단계가 붙고,
팬들이 댓글과 토론으로 반응한다. 모바일 우선으로 만들고 있다.

pnpm과 Turborepo 모노레포다. Next.js(App Router) 앱 둘과 공용 패키지들로 이루어진다.

## 실행

```sh
pnpm install   # Node 22, pnpm 9
pnpm dev       # web(:3000) + mobile(:3001) 동시 실행
```

## 폴더 구조

```
apps/
  mobile/   모바일 웹 (주력)
  web/      데스크톱 웹
packages/
  tokens/   디자인 토큰 (theme.css)
  ui/       공용 컴포넌트
  domain/   도메인 타입, 팀 레지스트리, 포맷 유틸
  eslint-config/  typescript-config/
```

앱 안은 레이어드 아키텍처다. Next가 라우팅에서 제외하는 underscore 폴더로 레이어를 나눈다.

```
app/
  (라우트)/      페이지와 화면 전용 컴포넌트 (Page Layer)
  _components/   앱 전역 공용 컴포넌트 (Component Layer)
  _hooks/        커스텀 훅               (Business Layer)
  _services/     서버 액션, fetcher, 인증 로직
  _queries/      TanStack Query          (Store Layer)
  _stores/       zustand
  _apis/         apiFetch 통신 래퍼      (Utility Layer)
  _utils/        순수 헬퍼
  _types/ _constants/ _mocks/
```

## 구조 설명

페이지는 서버 컴포넌트가 기본이고, 단발 조회는 `_services`의 fetcher를 직접 await한다.
무한스크롤과 뮤테이션 같은 클라이언트 상호작용만 `_queries`(TanStack Query)를 거친다.

한 화면 전용 컴포넌트는 그 라우트의 `_components/`에 두고, 나머지 코드는 전부 레이어 폴더에 둔다.
훅은 라우트 전용이어도 `_hooks/`다. `_utils` `_types` `_constants` `_mocks`는 주제별
파일(`reels.ts`, `api.ts`)로 쪼갠다.

web과 mobile이 함께 쓰는 도메인 타입과 상수, 포맷 유틸은 `@plick/domain`이 단일 출처다.
색과 간격은 `@plick/tokens`의 디자인 토큰만 쓴다.

구조를 이렇게 잡은 배경은 [docs/adr/0029](docs/adr/0029-layered-architecture-restructure.md),
작업 규칙은 [CLAUDE.md](CLAUDE.md)에 있다.
