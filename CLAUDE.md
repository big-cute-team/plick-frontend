# CLAUDE.md — PLick 프론트엔드

> 어떤 작업이든 반드시 알아야 할 **최소한**만 여기 둔다.
> 제품·기술 세부는 필요할 때 아래 "더 읽을 것"에서 골라 읽는다(정적 컨텍스트를 얇게 유지).

## 프로젝트

- **PLick** = 프리미어리그 이적 루머를 릴스형으로 넘겨보는 앱. **모바일 우선**.
- pnpm + Turborepo 모노레포. 스코프 **`@plick/*`**.

## 구조

```
apps/
  mobile/   Next 모바일 웹 (dev :3001)  ← 현재 주력
  web/      Next 데스크톱 웹 (dev :3000)
packages/
  tokens/             @plick/tokens — 디자인 토큰(theme.css)
  ui/                 @plick/ui — 공용 컴포넌트
  eslint-config/      @plick/eslint-config
  typescript-config/  @plick/typescript-config
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

## 컨벤션 (반드시)

- **색·간격·글자·라운드는 디자인 토큰 유틸만 사용.** 하드코딩 색/px 금지.
  (`bg-bg` `text-text` `bg-accent` `border-border` `rounded-card` `px-edge` …)
- ⚠️ 화면 좌우 패딩은 **`px-edge`** (Tailwind 예약어라 `px-screen`은 안 됨 — [ADR 0002](docs/adr/0002-mobile-home-layout.md) §6).
- 다크가 기본, 라이트는 `[data-theme="light"]`로 자동 전환 → **다크 기준으로만 만든다.**
- 파일 kebab-case / 컴포넌트 PascalCase / 훅 useXxx / 상수 UPPER_SNAKE.
- 기본 서버 컴포넌트, 상호작용 있을 때만 `"use client"`.
- **주석은 JSDoc 블록 주석으로.** 선언 위 이중 슬래시(`//`) 블록 금지. props/인자는 `@param`,
  예시는 `@example`. 표현식 내부처럼 JSDoc이 불가능한 위치의 제약 설명만 인라인 `//` 허용.

### 절대경로 import (`@/`)

- 각 앱 `tsconfig.json`에 `@/* → ./app/*` alias가 있다(`baseUrl: "."`). **컴포넌트 파일 밖으로
  올라가는 import는 절대경로 `@/…`로.** `../`·`../../` 부모 탐색 금지.
  - `@/_lib/types` · `@/_components/AppShell` · `@/reels/_lib/constants` (라우트 그룹은 `@/(home)/_lib/…`)
- **같은 폴더 형제는 상대경로 `./`** 그대로 둔다(절대경로로 바꾸면 더 길고 관용에 어긋남).
- **자기 폴더 아래로 내려가는 import도 `./`**(예: `page.tsx` → `./_components/…`). 부모를 거쳐야
  닿을 때만 `@/…`(예: `reels/[postId]/page.tsx` → `@/reels/_components/…`).
- `next/`·`react`·`@plick/*` 같은 패키지 import는 당연히 그대로.

### 타입·상수·유틸 분리 (`_lib`)

컴포넌트 파일에 타입/상수/순수함수를 **인라인으로 두지 않는다**. 역할별 파일로 나눠 `_lib`에 둔다.
경로는 **2개 이상 화면 공용 → `app/_lib/`**, **한 라우트 전용 → 그 라우트의 `_lib/`**(예: `app/reels/_lib/`).

- `types.ts` — 타입·인터페이스. (여러 컴포넌트가 공유하거나 중복되는 타입은 반드시 여기로)
- `constants.ts` — 상수·설정값. BE가 붙어도 유지되는 참조 데이터(팀 레지스트리 등)도 여기.
- `utils.ts` — 순수 헬퍼 함수. (공용 포맷 유틸은 `app/_lib/format.ts`)
- `mock.ts` — 목데이터(나중에 fetch로 교체될 가짜 데이터). 상수(`constants.ts`)와 구분한다.
- 훅은 파일 하나 = 훅 하나로 `useXxx.ts`.
- **예외:** 한 컴포넌트 안에서만 쓰는 사적·자명한 타입(예: 그 컴포넌트 로컬 `IconProps`)은 인라인 허용.

## 규칙 기록 (컨벤션이 새로 생기면)

새 컨벤션·작업 방식 피드백은 개인 메모가 아니라 **저장소에 기록**해 팀 전체 클로드에 적용시킨다:

- **팀 공통 규칙**(주석 스타일, 네이밍, Git 절차 등) → 이 `CLAUDE.md`의 해당 섹션에 추가.
- **화면 퍼블리싱 세부 규칙**(아이콘 벡터, 토큰 사용법, 레이아웃 패턴 등) → 모바일은 `screen-publishing`,
  데스크톱 웹은 `web-publishing` 스킬에 추가. 분량이 크면 해당 스킬 폴더 안에 별도 파일을 만들고
  SKILL.md에서 가리킨다.
- 클로드는 이런 피드백을 받으면 **알아서 위 위치에 반영**하고 커밋에 포함한다.

## 작업 기록 (세션 단위 ADR — 필수)

**한 작업 세션(대화)에서 의미 있는 구현·리팩터·결정을 하면 반드시 `docs/adr/`에 그 세션의 ADR을 남긴다.**

- **세션 시작 시**: 새 ADR 파일 하나 생성 → `docs/adr/000N-<짧은-설명>.md`(N = 다음 번호). 그 세션에서 **무엇을·어떻게·왜 했고 어디서 막혔는지**를 요약한다("무엇"보다 **어떻게·왜·하드원 교훈** 중심 — 기존 ADR 0002·0004·0005 톤을 따른다).
- **세션 중 변경이 생기면**: 새 파일을 또 만들지 말고 **그 세션 ADR에 계속 이어 붙인다**(후속 피드백·버그 수정도 같은 md의 절로). 같은 PR/브랜치 작업은 같은 ADR.
- 커밋에 포함하고, 다른 규칙·화면과 얽히면 **`더 읽을 것`·스킬·관련 ADR에 상호 링크**한다.
- 자명한 잡일(오타 수정, 포맷만)만 한 세션은 생략 가능. 판단이 서지 않으면 남기는 쪽.

## Git · PR

- `main`·`develop`에 직접 커밋 금지 → `develop`에서 브랜치 `feature/KAN-<번호>-<설명>` 생성.
- **커밋 메시지에 Jira 키(`KAN-###`) 포함** → 이슈 자동 연결.
- PR base=`develop`, CI(format:check→lint→check-types→build) 통과 확인까지.
- `main`은 릴리스용 — `develop`→`main` 병합은 사용자가 직접.
- 🚫 **병합은 절대 하지 않는다.** 클로드는 **PR 생성 + CI 확인까지만** — `gh pr merge` 금지, 병합은 사용자가 직접.
- 환경: Node 22(`.nvmrc`), pnpm 9. `node_modules`·`.next`·`pnpm-lock.yaml`은 손대지 않는다(도구 산출물).

## 더 읽을 것 (필요할 때만)

- **모바일 화면/컴포넌트 구현** → `screen-publishing` 스킬 + [ADR 0002](docs/adr/0002-mobile-home-layout.md)
- **데스크톱 웹(apps/web) 화면/컴포넌트 구현** → `web-publishing` 스킬 (`@plick/ui` 승격 절차 포함)
  - [ADR 0005](docs/adr/0005-web-home-and-ui-promotion.md) (웹 홈·공용 컴포넌트 승격·데스크톱 토큰·Tailwind 토큰 충돌 교훈)
- **무엇을 공통으로 뺄지 판단(모노레포 공용 경계)** → [ADR 0011](docs/adr/0011-shared-code-boundary.md) (web↔mobile 조각을 `@plick/ui`/토큰으로 승격할지 앱별로 둘지 — 기준·근거·리스크. 승격 *절차*는 ADR 0005)
- 제품·UX·데이터 모델·화면 IA 전반 → [docs/handoff.md](docs/handoff.md)
- 개발 도구(Prettier/Husky/CI 등) 결정 배경 → [ADR 0001](docs/adr/0001-dev-tooling-setup.md)
- 화면 하나를 티켓+피그마로 구현 → 모바일 `/screen` · 데스크톱 웹 `/web-screen` 커맨드
- 코드베이스 전수 감사(중복·배치·컨벤션 리스트업) → `/audit` 커맨드 (`code-audit` 스킬)
