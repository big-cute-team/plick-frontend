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
- **화면 퍼블리싱 세부 규칙**(아이콘 벡터, 토큰 사용법, 레이아웃 패턴 등) → `screen-publishing` 스킬에 추가.
  분량이 크면 `.claude/skills/screen-publishing/` 안에 별도 파일을 만들고 SKILL.md에서 가리킨다.
- 클로드는 이런 피드백을 받으면 **알아서 위 위치에 반영**하고 커밋에 포함한다.

## Git · PR

- `main`에 직접 커밋 금지 → 브랜치 `feature/KAN-<번호>-<설명>`.
- **커밋 메시지에 Jira 키(`KAN-###`) 포함** → 이슈 자동 연결.
- PR base=`main`, CI(format:check→lint→check-types→build) 통과 확인까지.
- 🚫 **병합은 절대 하지 않는다.** 클로드는 **PR 생성 + CI 확인까지만** — `gh pr merge` 금지, 병합은 사용자가 직접.
- 환경: Node 22(`.nvmrc`), pnpm 9. `node_modules`·`.next`·`pnpm-lock.yaml`은 손대지 않는다(도구 산출물).

## 더 읽을 것 (필요할 때만)

- **모바일 화면/컴포넌트 구현** → `screen-publishing` 스킬 + [ADR 0002](docs/adr/0002-mobile-home-layout.md)
- 제품·UX·데이터 모델·화면 IA 전반 → [docs/handoff.md](docs/handoff.md)
- 개발 도구(Prettier/Husky/CI 등) 결정 배경 → [ADR 0001](docs/adr/0001-dev-tooling-setup.md)
- 화면 하나를 티켓+피그마로 구현 → `/screen` 커맨드
