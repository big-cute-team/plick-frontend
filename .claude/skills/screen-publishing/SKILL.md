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
- 글자: `text-title`(17) `text-body-lg`(15) `text-body` `text-label` `text-caption` `text-micro`
- 라운드: `rounded-card`(16) `rounded-hero`(22) `rounded-control`(14) `rounded-pill`
- 간격: **`px-edge`**(화면 좌우 20) `gap`/`gap-lg`/`section` — 그 외는 숫자 유틸

⚠️ **`px-screen` 쓰지 말 것.** `screen`은 Tailwind 예약어라 유틸이 생성되지 않는다 → **`px-edge`**.

토큰 정의는 `packages/tokens/theme.css`. 새 토큰이 필요하면 여기 추가하고 `@theme inline`(색) 매핑을 함께.

## 2. 다크/라이트

다크가 기본(`:root`), 라이트는 `[data-theme="light"]` 오버라이드로 **자동 전환**된다.
→ **화면은 다크 기준으로만 만든다.** 라이트를 따로 만들지 않는다. `ThemeToggle`이 `<html data-theme>`만 바꾼다.

## 3. 반응형 (웹뷰 다기기)

- 화면 뼈대는 `AppShell`(= `h-[100dvh]` + `max-w-[480px] mx-auto`) + `ScrollArea`(스크롤 영역) + 필요시 `TopBar`/`TabBar`.
- 상단바 `pt = env(safe-area-inset-top)`, 하단탭 `pb = env(safe-area-inset-bottom)`.
- **고정 px 폭 지양**: flex·%·가로 스크롤. 넘칠 수 있는 가로 요소는 `overflow-x-auto`.
- 센터 캐러셀은 **좌우 스페이서**로 첫/마지막까지 중앙 스냅(패딩 % 방식은 끝단이 안 맞음, ADR 0002 §6-2).

## 4. 컴포넌트 구조

- 기본 서버 컴포넌트, 상호작용(상태·이벤트·`usePathname`) 있을 때만 `"use client"`.
- 재사용 조각은 `app/_components/`, 도메인/목데이터는 `app/_lib/`(types·mock·format). `_` = 라우트 아님.
- 사진 자리 = `MediaThumb`(팀컬러 그라데이션 placeholder), 팀 방패 = `TeamCrest`, 아이콘 = `_components/icons.tsx`(인라인 SVG, `currentColor`).

## 5. 목데이터 우선

BE 전이므로 `app/_lib/mock.ts`에 데이터를 먼저 만들고 화면이 소비한다. 타입은 `app/_lib/types.ts`(BE 목표 형태). 나중에 fetch로 교체.

## 6. 검증

- **클린 빌드**로 확인: `pnpm --filter mobile build` (dev 증분 캐시에 속지 말 것 — 정렬/패딩 깨짐은 클린 빌드로 재현).
- 로컬 dev(:3001)를 모바일 뷰포트로 띄워 스크린샷 + 다크/라이트 토글 확인.
- CI는 레이아웃 깨짐을 못 잡으니 **시각 확인 필수**.
