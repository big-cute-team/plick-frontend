# CLAUDE.md - PLick 프론트엔드

어떤 작업이든 반드시 알아야 할 최소한만 여기 둔다.
제품과 기술 세부는 필요할 때 아래 "더 읽을 것"에서 골라 읽는다.

## 프로젝트

PLick은 프리미어리그 이적 루머를 릴스형으로 넘겨보는 앱이다. 모바일 우선.
pnpm과 Turborepo 모노레포이고 스코프는 `@plick/*`.

## 구조

```
apps/
  mobile/   Next 모바일 웹 (dev :3001)  ← 현재 주력
  web/      Next 데스크톱 웹 (dev :3000)
packages/
  tokens/             @plick/tokens - 디자인 토큰(theme.css)
  ui/                 @plick/ui - 공용 컴포넌트
  domain/             @plick/domain - 도메인 타입·팀 레지스트리·포맷 유틸 (web/mobile 공용)
  eslint-config/      @plick/eslint-config
  typescript-config/  @plick/typescript-config
scripts/
  be-verify/          로컬 BE 검증 도구 (JWT 민팅·공유 DB psql)
```

## 명령어 (루트에서)

```bash
pnpm install            # 의존성 설치 (+husky)
pnpm dev                # web+mobile 동시 (개별: pnpm --filter mobile dev)
pnpm build              # 전체 빌드
pnpm lint               # ESLint
pnpm check-types        # 타입 검사
pnpm format             # Prettier 적용 (확인만: format:check)
```

## 컨벤션

색과 간격, 글자, 라운드는 디자인 토큰 유틸만 쓴다. 하드코딩한 색이나 px는 금지다.
(`bg-bg`, `text-text`, `bg-accent`, `border-border`, `rounded-card`, `px-edge`)

화면 좌우 패딩은 `px-edge`다. Tailwind 예약어라 `px-screen`은 안 된다([ADR 0002](docs/adr/0002-mobile-home-layout.md) §6).

앱은 다크 고정이다(`<html data-theme="dark">`). 테마 토글 UI는 없앴고 라이트 토큰
(`[data-theme="light"]`)만 `theme.css`에 남겨 뒀다. 화면은 다크 기준으로만 만들되 색은 토큰으로
쓴다 — 나중에 토글을 되살릴 때 화면을 다시 만들지 않아도 되게 한다.

파일은 kebab-case, 컴포넌트는 PascalCase, 훅은 useXxx, 상수는 UPPER_SNAKE.

기본은 서버 컴포넌트다. 상호작용이 있을 때만 `"use client"`.

주석은 JSDoc 블록 주석으로 쓴다. 선언 위에 이중 슬래시(`//`) 블록은 금지다. props와 인자는 `@param`,
예시는 `@example`로 단다. 표현식 내부처럼 JSDoc이 불가능한 자리의 제약 설명만 인라인 `//`로 허용한다.

### 절대경로 import (`@/`)

각 앱 `tsconfig.json`에 `@/* → ./app/*` alias가 있다(`baseUrl: "."`).
컴포넌트 파일 밖으로 올라가는 import는 절대경로 `@/…`로 쓴다. `../`나 `../../` 부모 탐색은 금지다.
예: `@/_types/app`, `@/_components/AppShell`, `@/_constants/reels`

같은 폴더 형제는 상대경로 `./`를 그대로 둔다. 절대경로로 바꾸면 더 길고 관용에 어긋난다.

자기 폴더 아래로 내려가는 import도 `./`로 쓴다(`page.tsx`에서 `./_components/…`).
부모를 거쳐야 닿을 때만 `@/…`를 쓴다(`reels/[postId]/page.tsx`에서 `@/reels/_components/…`).

`next/`나 `react`, `@plick/*` 같은 패키지 import는 그대로 쓴다.

### 레이어 폴더 (레이어드 아키텍처)

앱 코드는 `app/` 안 레이어 폴더에 배치한다([ADR 0029](docs/adr/0029-layered-architecture-restructure.md)).
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

⚠️ web과 mobile이 함께 쓰는 도메인 타입(FeedPost 등)과 참조 상수(TEAMS 등), 포맷 유틸은
`@plick/domain`(types/constants/format)이 단일 출처다(ADR 0018). 앱 레이어 폴더에는 앱 전용만 남긴다
(web `NAV_LINKS`, mobile `TABS`).

예외로, 한 컴포넌트 안에서만 쓰는 사적이고 자명한 타입(그 컴포넌트 로컬 `IconProps` 등)은 인라인으로 둔다.

## 규칙 기록

새 컨벤션이나 작업 방식 피드백은 개인 메모가 아니라 저장소에 기록해 팀 전체 클로드에 적용한다.

팀 공통 규칙(주석 스타일, 네이밍, Git 절차)은 이 CLAUDE.md의 해당 절에 추가한다.

화면 퍼블리싱 세부 규칙(아이콘 벡터, 토큰 사용법, 레이아웃 패턴)은 모바일이면 `screen-publishing`,
데스크톱 웹이면 `web-publishing` 스킬에 추가한다. 분량이 크면 스킬 폴더 안에 별도 파일을 만들고
SKILL.md에서 가리킨다.

이런 피드백을 받으면 알아서 위 위치에 반영하고 커밋에 포함한다.

## 문서 문체

CLAUDE.md와 `.claude/` 아래 커맨드·스킬·서브에이전트, README, PR 본문, 코드 주석은 `doc-style` 스킬을 따른다.
볼드 강조와 em dash를 쓰지 않고 필수만 남겨 컴팩트하게 쓴다.

PR 본문은 문체에 더해 `pr-writing` 스킬의 5절 틀(구현 사항 / 문제 상황 / 해결 방법 / 검증 / TODO)을 쓴다.

`docs/` 아래는 정반대다. 아래 `작업 기록`을 따른다.

## 작업 기록 (세션 단위 ADR)

한 작업 세션에서 의미 있는 구현이나 리팩터, 결정을 하면 반드시 `docs/adr/`에 그 세션의 ADR을 남긴다.

세션을 시작하면 새 ADR 파일 하나를 만든다(`docs/adr/000N-<짧은-설명>.md`, N은 다음 번호).
그 세션에서 무엇을 어떻게 왜 했고 어디서 막혔는지를 담는다.

세션 중에 변경이 생기면 새 파일을 또 만들지 말고 그 세션 ADR에 이어 붙인다. 후속 피드백과 버그 수정도
같은 md의 절로 넣는다. 같은 PR이나 브랜치 작업은 같은 ADR이다.

문체는 포트폴리오 블로그 회고체로 쓴다. ADR은 사내 규격 문서가 아니라 나중에 블로그나 포트폴리오에 올릴
내 회고 글이라고 생각하고 쓴다.

- 1인칭 회고 흐름으로 쓴다. 이걸 만들었다, 여기서 이런 문제를 만났다, 이렇게 풀었다를 자연스럽게 이어 쓴다.
- 자세히 쓴다. 시행착오를 다 적는다. 어떤 걸 시도했다가 왜 버렸는지, 어디서 몇 번 막혔는지까지 남긴다.
  나중에 읽는 사람이 초보자여도 완전히 이해할 수 있게 쓰는 게 목표다. 분량을 아끼지 않는다.
- 기술 메커니즘은 끝까지 파고들어 설명한다. 서버 액션, 쿠키, 내비게이션(soft/hard, prefetch), 캐싱,
  서버와 클라 경계, 리다이렉트처럼 어떻게 왜 그렇게 되는가가 걸리는 대목은 얼버무리지 않는다.
  요청과 응답 흐름, 무엇이 어디서 도는지, 왜 그 방식인지까지 풀어 쓴다.
  읽는 사람이 나중에 따로 되물을 필요가 없어야 한다. `"use server"`는 서버 액션이지 단순 서버 실행이 아니고,
  `cookies()`는 요청 헤더를 읽고 `Set-Cookie`로 지시하는 것이며, `redirect()`는 리로드가 아니라
  소프트 내비게이션이라는 식으로, 오해하기 쉬운 지점은 정의부터 바로잡아 준다.
- 사람이 쓴 티가 나게 쓴다. 담백한 `~했다`체로, 막힌 데는 막혔다고 솔직하게 쓴다.
  AI 티 나는 말투는 금지다. 과장 형용사(강력한, 매끄러운, seamless, robust류), "결론적으로"와
  "~할 수 있습니다" 남발, 기계적 나열, 문단마다 소제목 다는 습관을 피한다.
- 전문용어는 처음 나올 때 한 줄로 풀어준다.
- 기존 0002~0011은 옛 격식 톤이라 그대로 두고, 이 문체는 새로 쓰는 ADR부터 적용한다.

커밋에 포함하고, 다른 규칙이나 화면과 얽히면 "더 읽을 것"과 스킬, 관련 ADR에 상호 링크한다.

오타 수정이나 포맷만 한 세션은 생략할 수 있다. 판단이 서지 않으면 남기는 쪽으로 간다.

## Git · PR

`main`과 `develop`에 직접 커밋하지 않는다. `develop`에서 `feature/KAN-<번호>-<설명>` 브랜치를 딴다.

커밋 메시지에 Jira 키(`KAN-###`)를 넣어 이슈를 자동 연결한다.

PR base는 `develop`이고 CI(format:check, lint, check-types, build) 통과까지 확인한다.

PR 본문은 `pr-writing` 스킬의 5절 틀을 따른다.

`main`은 릴리스용이다. `develop`에서 `main`으로 병합하는 건 사용자가 직접 한다.

🚫 병합은 절대 하지 않는다. 클로드는 PR 생성과 CI 확인까지만 한다. `gh pr merge`는 금지다.

환경은 Node 22(`.nvmrc`)와 pnpm 9다. `node_modules`, `.next`, `pnpm-lock.yaml`은 도구 산출물이라 손대지 않는다.

## 더 읽을 것 (필요할 때만)

- 배포와 운영(EC2 + ALB, 롤백, 환경변수, 자주 막히는 곳): [docs/deploy.md](docs/deploy.md).
  판단 근거와 작업 기록은 [ADR 0059](docs/adr/0059-mobile-ec2-deploy.md).
  배포는 main 푸시에 걸려 있고 `API_BASE_URL`은 빌드 시점에 산출물로 굳는다
- 레이어 폴더 구조의 배경과 판단: [ADR 0029](docs/adr/0029-layered-architecture-restructure.md)
- 모바일 화면과 컴포넌트 구현: `screen-publishing` 스킬 + [ADR 0002](docs/adr/0002-mobile-home-layout.md)
- 데스크톱 웹(apps/web) 화면과 컴포넌트 구현: `web-publishing` 스킬(`@plick/ui` 승격 절차 포함)
  - [ADR 0005](docs/adr/0005-web-home-and-ui-promotion.md): 웹 홈, 공용 컴포넌트 승격, 데스크톱 토큰,
    Tailwind 토큰 충돌 교훈
- 무엇을 공통으로 뺄지 판단하는 모노레포 공용 경계: [ADR 0011](docs/adr/0011-shared-code-boundary.md).
  web과 mobile 조각을 `@plick/ui`나 토큰으로 승격할지 앱별로 둘지의 기준과 근거, 리스크.
  승격 절차 자체는 ADR 0005에 있다.
- BE API 연결(mock에서 fetch로): `api-integration` 스킬 + 커맨드 `/wire-api`(모바일), `/web-wire-api`(웹 이식).
  계약 확인과 검증은 `be-verify` 서브에이전트가 맡는다(`scripts/be-verify/` 도구 사용).
  웹 이식은 모바일 코드가 검증된 계약이라 스킬의 `web-wiring.md`를 따른다.
  단발 읽기는 서버 컴포넌트 fetch, 릴스와 뮤테이션은 TanStack Query. 공용화는 ADR 0011 게이트로 판단한다.
- 문서 문체: `doc-style` 스킬
- PR 본문 틀(구현 사항 / 문제 상황 / 해결 방법 / 검증 / TODO): `pr-writing` 스킬
- 제품과 UX, 데이터 모델, 화면 IA 전반: [docs/handoff.md](docs/handoff.md)
- 개발 도구(Prettier, Husky, CI) 결정 배경: [ADR 0001](docs/adr/0001-dev-tooling-setup.md)
- 화면 하나를 티켓과 피그마로 구현: 모바일은 `/screen`, 데스크톱 웹은 `/web-screen` 커맨드
- 코드베이스 전수 감사(중복, 배치, 컨벤션 리스트업): `/audit` 커맨드(`code-audit` 스킬)
