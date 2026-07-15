---
name: web-publishing
description: >-
  PLick 데스크톱 웹(apps/web) 화면·컴포넌트를 만들거나 수정할 때 따르는 규칙.
  모바일과 같은 디자인 토큰 재사용, 모바일 공용 컴포넌트의 @plick/ui 승격 절차,
  데스크톱 레이아웃(컨테이너·hover·focus) 패턴, 다크/라이트. Use when creating or
  editing screens/components in apps/web, promoting shared components to
  @plick/ui, or building desktop layouts for PLick.
---

# 화면 퍼블리싱 규칙 (apps/web — 데스크톱)

`apps/web`에서 화면/컴포넌트를 만들 때 이 규칙을 따른다. 모바일 규칙(`screen-publishing` 스킬)과
**토큰·구조 컨벤션은 동일**하고, 레이아웃 뼈대와 컴포넌트 재사용 전략만 데스크톱에 맞게 다르다.

## 1. 디자인 토큰만 사용 — 모바일과 동일 (하드코딩 금지)

`@plick/tokens/theme.css` 하나를 양쪽 앱이 공유한다(웹 `globals.css`에 이미 import됨).
색·간격·글자·라운드는 전부 토큰 유틸. 임의 hex/px 쓰지 않는다.

- 색: `bg-bg` `bg-nav` `bg-elevate` `text-text` `text-text-2/3/4` `text-icon`
  `bg-accent` `text-accent` `text-on-accent` `border-border` `text-danger`
- 미디어(사진 자리): `bg-media` / `text-media-on`, 팀색: `bg-team-liv` 등
- 글자: `text-display`(44) `text-headline`(24, 행간·자간 내장) `text-title`(17)
  `text-body-lg`(15) `text-body` `text-label` `text-caption`(11) `text-micro`(10)
- 자간: `tracking-tight`(-0.2px) `tracking-snug`(-0.1px) `tracking-label`(1px) — `tracking-[…]` 임의값 금지
- 라운드: `rounded-card`(16) `rounded-hero`(22) `rounded-control`(14) `rounded-pill`
- 간격: `gap-gap`(12) `gap-gap-lg`(14) `pb-section`(16) 등 시맨틱 간격은 토큰 유틸로
- 사진 위 스크림: `color-mix(in srgb, var(--plk-scrim) N%, transparent)` — rgba 하드코딩 금지

데스크톱에서 새 시맨틱 값(예: 콘텐츠 최대폭, 데스크톱 거터)이 반복되면 **`packages/tokens/theme.css`에
토큰으로 추가**하고 양쪽 앱이 쓰게 한다 — 웹 전용 CSS에 숨기지 않는다. 색은 `@theme inline` 매핑 함께.

⚠️ `px-edge`(20px)는 **모바일 화면 가장자리** 토큰이다. 데스크톱 페이지 좌우 여백에 그대로 쓰지 말고
컨테이너 패턴(§3)을 쓴다. 카드 내부 패딩처럼 의미가 같은 곳엔 써도 된다.

## 2. 다크/라이트 — 모바일과 동일

다크가 기본(`:root`), 라이트는 `[data-theme="light"]` 오버라이드로 자동 전환.
→ **화면은 다크 기준으로만 만든다.** 라이트를 따로 만들지 않는다.

## 3. 데스크톱 레이아웃

모바일의 `AppShell`(100dvh·480px)·`TabBar`·safe-area 패턴은 **웹뷰 전용이라 재사용하지 않는다.**
데스크톱은 문서 흐름 그대로 두고 컨테이너로 폭을 제한한다.

- **페이지 뼈대**: 상단 `SiteHeader`(GNB) + 본문 컨테이너 + (필요 시) 푸터.
  뼈대 컴포넌트는 `apps/web/app/_components/`에 만든다.
- **컨테이너**: 콘텐츠 최대폭 + `mx-auto` + 좌우 패딩을 담는 `PageContainer` 하나로 통일하고,
  페이지마다 max-width를 따로 적지 않는다. 최대폭 값은 피그마 데스크톱 프레임에서 확인해 정한다.
- **반응형**: 피그마 데스크톱 폭 기준으로 만들되, 좁아질 때 깨지지 않게 grid/flex + `min-w-0`으로
  유연하게. 모바일 대응은 apps/mobile 담당이므로 **웹에서 모바일 브레이크포인트를 새로 파지 않는다**
  (태블릿 정도까지 자연스럽게 줄어들면 충분).
- **hover·focus**: 데스크톱은 포인터가 있다 — 인터랙티브 요소에 `hover:` 상태를 주고,
  키보드 접근은 `focus-visible:`로. 모바일에서 가져온 컴포넌트에 hover가 없으면 추가한다.
- ⚠️ `theme.css`가 스크롤바를 전역으로 숨긴다(`::-webkit-scrollbar { display: none }`) — 모바일
  웹뷰용 결정이다. 데스크톱에서 긴 페이지의 스크롤바가 필요해지면 **말없이 고치지 말고 사용자와
  논의**한다(토큰 패키지 수정은 모바일에도 영향).

## 4. 컴포넌트 재사용 — 만들기 전에 반드시 찾는다

새 컴포넌트를 만들기 전에 이 순서로 확인한다:

1. **`packages/ui/src`** — 이미 공용화된 컴포넌트가 있으면 `@plick/ui/<파일명>`으로 import.
2. **`apps/mobile/app/_components`** — 모바일에 같은 역할의 컴포넌트가 있고 앱 중립적
   (프레젠테이션 위주, 모바일 레이아웃에 결합 안 됨)이면 **`@plick/ui`로 승격**한다:
   - 파일을 `packages/ui/src/<PascalCase>.tsx`로 **이동**(복사 금지 — 사본이 두 개면 감사 대상).
   - 모바일 쪽 import를 `@plick/ui/<파일명>`으로 바꾸는 것까지 **같은 PR**에서 한다.
   - 토큰 유틸만 쓰는 컴포넌트는 그대로 양쪽에서 동작한다(토큰이 공유되므로).
   - 승격 후보 예: `TeamCrest` `MediaThumb` `Logo` `ThemeToggle` `icons` 등.
     (`TeamCrest`의 `public/teams/*.webp`처럼 앱 public 에셋에 의존하면 에셋도 양쪽 앱에 두거나
     경로를 prop으로 받게 일반화한다.)
   - 반대로 `AppShell` `ScrollArea` `TabBar` `TopBar`는 모바일 전용 — 승격 금지.
3. 둘 다 없으면 새로 만든다 — **한 화면 전용이면 그 라우트 `_components/`, 웹 내 2개 화면 이상
   공용이면 `apps/web/app/_components/`, 모바일과도 공용이면 처음부터 `packages/ui`**.

주의:

- `packages/ui`의 `button.tsx` `card.tsx` `code.tsx`는 **Turborepo 보일러플레이트**(alert 데모)다.
  재사용하지 말 것. 첫 진짜 공용 컴포넌트를 넣을 때 함께 삭제한다.
- **Tailwind v4 소스 스캔**: `@plick/ui` 컴포넌트의 클래스는 앱의 Tailwind가 자동 감지하지
  못한다(node_modules 제외). `@plick/ui`를 처음 소비하는 앱의 `globals.css`에
  `@source "../../../packages/ui/src";`를 추가한다(양쪽 앱 모두).
- `@plick/ui`에 컴포넌트를 넣으면 **양쪽 앱 빌드를 모두** 확인한다(§6).

## 5. 구조·목데이터 — 모바일과 동일

- 기본 서버 컴포넌트, 상호작용 있을 때만 `"use client"`.
- 타입/상수/유틸은 `_lib`로 분리(CLAUDE.md 규칙 그대로): 웹 공용은 `apps/web/app/_lib/`,
  라우트 전용은 그 라우트의 `_lib/`.
- 절대경로 import `@/* → apps/web/app/*` — 부모 탐색(`../`) 금지, 형제·하위는 `./`.
- BE 전이므로 목데이터 우선: `apps/web/app/_lib/mock.ts` + `types.ts`(BE 목표 형태).
  모바일과 같은 도메인 데이터(루머 포스트·팀 등)는 **타입 모양을 모바일 `_lib/types.ts`와 맞춘다**
  — 나중에 같은 API를 소비하므로 어긋나면 안 된다.
- 아이콘은 피그마 노드 벡터 그대로(`currentColor`) — 비슷한 기존 아이콘 재사용 금지.

## 6. 검증

- **클린 빌드**: `pnpm --filter web build`. `@plick/ui`나 `packages/tokens`를 건드렸으면
  `pnpm --filter mobile build`도 함께(공유 패키지 회귀 확인).
- 로컬 dev(:3000, launch.json `web`)를 **데스크톱 뷰포트(1280×800 이상)**로 띄워 스크린샷으로
  피그마와 대조(간격·정렬·타이포). 다크/라이트 토글, hover 상태 확인.
- CI는 레이아웃 깨짐을 못 잡으니 **시각 확인 필수**.
