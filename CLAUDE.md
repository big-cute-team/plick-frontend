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

## Git · PR

- `main`에 직접 커밋 금지 → 브랜치 `feature/KAN-<번호>-<설명>`.
- **커밋 메시지에 Jira 키(`KAN-###`) 포함** → 이슈 자동 연결.
- PR base=`main`, **CI(format:check→lint→check-types→build) 통과 후 squash 병합.**
- 환경: Node 22(`.nvmrc`), pnpm 9. `node_modules`·`.next`·`pnpm-lock.yaml`은 손대지 않는다(도구 산출물).

## 더 읽을 것 (필요할 때만)

- **모바일 화면/컴포넌트 구현** → `plick-frontend` 스킬 + [ADR 0002](docs/adr/0002-mobile-home-layout.md)
- 제품·UX·데이터 모델·화면 IA 전반 → [docs/handoff.md](docs/handoff.md)
- 개발 도구(Prettier/Husky/CI 등) 결정 배경 → [ADR 0001](docs/adr/0001-dev-tooling-setup.md)
- 화면 하나를 티켓+피그마로 구현 → `/screen` 커맨드
