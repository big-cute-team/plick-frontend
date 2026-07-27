---
name: screen-publishing
description: >-
  PLick 모바일 프론트엔드(apps/mobile) 화면·컴포넌트를 만들거나 수정할 때 따르는 규칙.
  디자인 토큰 사용법, 반응형(dvh·safe-area·max-width) 패턴, 다크/라이트, 컴포넌트 구조,
  목데이터 흐름. Use when creating or editing screens/components in apps/mobile,
  applying design tokens (colors/spacing/radius/type), building responsive mobile
  webview layouts, or wiring mock data for PLick.
---

# 화면 퍼블리싱 규칙 (apps/mobile)

`apps/mobile`에서 화면/컴포넌트를 만들 때 이 규칙을 따른다. 배경·근거는 `docs/adr/0002-mobile-home-layout.md`.

## 1. 디자인 토큰만 사용 (하드코딩 금지)

색·간격·글자·라운드는 전부 토큰 유틸. 임의 hex/px 쓰지 않는다.

- 색: `bg-bg` `bg-nav` `bg-elevate` `text-text` `text-text-2/3/4` `text-icon`
  `bg-accent` `text-accent` `text-on-accent` `border-border` `text-danger`
- 미디어(사진 자리): `bg-media` / `text-media-on`, 팀색: `bg-team-liv` 등
- 글자: `text-headline`(24, 행간 1.35·자간 -0.4px 내장) `text-title`(17) `text-body-lg`(15)
  `text-body` `text-label` `text-caption`(11) `text-micro`(10)
- 자간: `tracking-tight`(-0.2px) `tracking-snug`(-0.1px) `tracking-label`(1px) — `tracking-[…]` 임의값 금지
- 라운드: `rounded-card`(16) `rounded-hero`(22) `rounded-control`(14) `rounded-pill`
- 간격: **`px-edge`**(화면 좌우 20) · `gap-gap`(12) `gap-gap-lg`(14) `pb-section`(16)처럼
  시맨틱 간격은 토큰 유틸로 — 그 외 미세 조정만 숫자 유틸
- 사진 위 스크림: `var(--plk-scrim)` 앵커색을 `color-mix(in srgb, var(--plk-scrim) N%, transparent)`로 — rgba 하드코딩 금지

⚠️ **`px-screen` 쓰지 말 것.** `screen`은 Tailwind 예약어라 유틸이 생성되지 않는다 → **`px-edge`**.

토큰 정의는 `packages/tokens/theme.css`. 새 토큰이 필요하면 여기 추가하고 `@theme inline`(색) 매핑을 함께.

## 2. 다크/라이트

다크가 기본(`:root`), 라이트는 `[data-theme="light"]` 오버라이드다.
→ **화면은 다크 기준으로만 만든다.** 라이트를 따로 만들지 않는다.
앱은 `<html data-theme="dark">` 고정이고 테마 토글 UI는 없다. 라이트 토큰은 `theme.css`에만
남아 있어 지금 화면에 안 보이지만, 색은 계속 토큰으로 써서 되살릴 여지를 남긴다.

## 3. 반응형 (웹뷰 다기기)

- 화면 뼈대는 `AppShell`(= `h-[100dvh]` + `max-w-[480px] mx-auto`) + `ScrollArea`(스크롤 영역) + 필요시 `TopBar`/`TabBar`.
- 상단바 `pt = env(safe-area-inset-top)`, 하단탭 `pb = env(safe-area-inset-bottom)`.
- **고정 px 폭 지양**: flex·%·가로 스크롤. 넘칠 수 있는 가로 요소는 `overflow-x-auto`.
- 센터 캐러셀은 **좌우 스페이서**로 첫/마지막까지 중앙 스냅(패딩 % 방식은 끝단이 안 맞음, ADR 0002 §6-2).

## 4. 컴포넌트 구조

- 기본 서버 컴포넌트, 상호작용(상태·이벤트·`usePathname`) 있을 때만 `"use client"`.
- 컴포넌트는 **화면 전용이면 해당 라우트의 `_components/`**(예: `app/(home)/_components`, `app/reels/_components`), **2개 화면 이상 공용이면 `app/_components/`**. 파일 하나 = 컴포넌트 하나(작은 private 헬퍼는 예외). 목데이터는 `app/_mocks/posts.ts`, 도메인 타입·상수·포맷 유틸은 `@plick/domain`(types/constants/format — ADR 0018). `_` = 라우트 아님.
- 새 훅을 만들기 전에 `app/_hooks/`를 먼저 훑는다. 비슷한 훅이 이미 있으면 재사용하거나 확장하고, 새로 만들면 JSDoc 첫 줄에 무엇을 하는 훅인지 요약을 단다(자동완성 목록에서 읽히는 줄이다).
- `Logo` `MediaThumb` `TeamCrest`와 아이콘 레지스트리(`icons.tsx`)는 웹과 공용이라
  **`@plick/ui`로 승격됨**(KAN-200) — `@plick/ui/<파일명>`으로 import. 새 공용 아이콘도 여기에 추가.
- 사진 자리 = `MediaThumb`(팀컬러 그라데이션 placeholder) — `colorVar`에 `TEAMS[code].colorVar`를 넘긴다.
- 팀 로고 = `TeamCrest`(`team`에 `TEAMS[code]` 객체) — `public/teams/<코드소문자>.webp`의 **실제 구단
  로고**를 그린다(피그마의 구단 로고 자리 전부 이걸로). 새 팀은 같은 규칙으로 webp만 추가(웹·모바일
  양쪽 public에). 로고 비율이 제각각이라 정사각 + `object-contain`.
- **아이콘은 피그마 노드 벡터를 그대로 옮긴다** — 기존 비슷한 아이콘 재사용 금지(형태 자체가 스펙).
  `get_design_context`가 주는 에셋 URL(`figma.com/api/mcp/asset/...`, 7일 유효)을 받아
  viewBox·패스·선 굵기를 원본대로 컴포넌트화하고 색만 `currentColor`로 바꾼다.

## 5. 목데이터 우선

BE 전이므로 `app/_mocks/posts.ts`에 데이터를 먼저 만들고 화면이 소비한다. 타입은 `@plick/domain/types`(BE 목표 형태, web과 단일 출처). 나중에 fetch로 교체.

## 6. 검증

- **클린 빌드**로 확인: `pnpm --filter mobile build` (dev 증분 캐시에 속지 말 것 — 정렬/패딩 깨짐은 클린 빌드로 재현).
- 로컬 dev(:3001)를 모바일 뷰포트로 띄워 스크린샷 + 다크/라이트 토글 확인.
- CI는 레이아웃 깨짐을 못 잡으니 **시각 확인 필수**.

## 7. ADR 남기기

세션 ADR은 CLAUDE.md `작업 기록` 규칙대로 남기되, **문체는 블로그 회고체**(1인칭·짧게·사람 말투, AI 티 금지)로 쓴다.
