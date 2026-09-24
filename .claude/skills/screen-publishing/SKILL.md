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

색·간격·글자·라운드는 전부 토큰 유틸. 임의 hex/px 쓰지 않는다. 토큰 정의는 `packages/tokens/theme.css`이고
값의 출처는 KAN-567 핸드오프 시안이다. 새 토큰이 필요하면 거기 추가하고 `@theme inline`(색) 매핑을 함께.

- 면: `bg-bg`(흰) `bg-canvas`(셸 밖) `bg-elevate`(배너·릴 상자) `bg-elevate-2`(핫이슈 상자) `bg-chip`(태그 칩) `bg-input`(입력창)
  `bg-avatar`(회색 원) `bg-vote-card`/`bg-vote-track`(투표 카드) `bg-pitch`(라인업) `bg-muted` `bg-dim`/`bg-dim-strong`(딤)
- 선: `border-border`(섹션) `border-border-soft`(목록 행) `border-border-table`(표 머리) `border-border-strong`(레일·테두리 버튼)
- 글자: `text-text-strong`(제목) `text-text`(본문) `text-text-2` `text-text-3`(보조) `text-text-4`(메타, 회색 하한)
- 강조: `text-accent`/`bg-accent`(딥 그린) `hover:text-accent-hover` `text-accent-bright`(어두운 면 위) `text-on-accent`
  빨강 `text-danger`/`bg-danger`는 댓글 수, 새 글 `N`, 하트, BEST, VS, LIVE에만. 경고 `text-warn`
- 글자 크기(시안 px 그대로): `text-micro`(10) `text-micro-lg`(10.5) `text-caption`(11) `text-caption-lg`(11.5) `text-label`(12)
  `text-label-lg`(12.5) `text-body`(13.5) `text-body-md`(14) `text-body-lg`(15) `text-title`(17) `text-reel`(19) `text-hero`(21)
  `text-section`(22) `text-profile`(23) `text-headline`(24) `text-score`(38)
- 굵기: 900 `font-black`(제목·로고·섹션), 700 `font-bold`, 500 `font-medium`
- 자간: `tracking-logo`(-.06em) `tracking-title`(-.04em) `tracking-heading`(-.03em) `tracking-section`(-.025em) `tracking-tight`(-.02em)
  `tracking-snug`(-.01em) `tracking-vs`(.06em) `tracking-live`(.08em) `tracking-label`(1px) — `tracking-[…]` 임의값 금지
- 라운드: `rounded-badge`(6) `rounded-tile`(10) `rounded-control`(14) `rounded-card`(16) `rounded-hero`(22) `rounded-sheet`(26) `rounded-pill`.
  선과 목록 행은 각지게, 채운 면과 상자는 둥글게
- 간격: **`px-edge`**(화면 좌우 16) `w-reporter`(목록 오른쪽 기자 칼럼 88) `gap-gap`(12) `gap-gap-lg`(14) `pb-section`(16)
- 사진 위 스크림: `var(--plk-scrim)` 앵커색을 `color-mix(in srgb, var(--plk-scrim) N%, transparent)`로 — rgba 하드코딩 금지

⚠️ **`px-screen` 쓰지 말 것.** `screen`은 Tailwind 예약어라 유틸이 생성되지 않는다 → **`px-edge`**.

## 2. 라이트 고정

라이트가 기본(`:root`)이고 앱은 `<html data-theme="light">` 고정이다(KAN-567). 옛 다크 팔레트는
`[data-theme="dark"]` 오버라이드에 잠들어 있다. 화면은 라이트 기준으로만 만들고 색은 계속 토큰으로 써서
되살릴 여지를 남긴다. 폰트는 Noto Sans KR 셀프호스팅(`--font-noto`)이다.

시안 규칙: 본문 카드에 테두리를 두르지 않는다. 기본 버튼은 테두리 없는 텍스트 버튼이고 등록·투표·보내기 같은
확정 행동만 채운 면이다. 기능을 설명하는 안내 문구, 가운뎃점, 대시, 둥근 따옴표, 이모지를 쓰지 않는다.
확인이 필요한 행동은 팝업이 아니라 `BottomSheet`(radius 26)다. 프로필 이미지·아바타를 그리지 않는다.
루머 단계 라벨과 기자 등급을 노출하지 않고 기자는 대표 한 명만, 댓글 수는 `제목 [96]`, 투표 이슈는 빨간 `VsMark`다.

## 3. 반응형 (웹뷰 다기기)

- 화면 뼈대는 `AppShell`(= `h-[100dvh]` + `max-w-[480px] mx-auto`) + `ScrollArea`(스크롤 영역) + 필요시 `TopBar`(로고+햄버거, 46px)/`SubTopBar`(뒤로+왼쪽 제목)/`TabBar`.
- 안전영역은 `env(safe-area-inset-*)`를 직접 쓰지 않고 `var(--safe-top)`/`var(--safe-bottom)`을 쓴다.
  네이티브 앱셸이 웹뷰를 이미 시스템 바 안쪽에 배치한 경우 layout.tsx의 인라인 스크립트가
  `data-inset-viewport`로 변수를 0으로 눌러 이중 여백을 막는다(ADR 0075). 상단바 `pt = var(--safe-top)`,
  하단탭 `pb = var(--safe-bottom)`.
- **고정 px 폭 지양**: flex·%·가로 스크롤. 넘칠 수 있는 가로 요소는 `overflow-x-auto`.
- 센터 캐러셀은 **좌우 스페이서**로 첫/마지막까지 중앙 스냅(패딩 % 방식은 끝단이 안 맞음, ADR 0002 §6-2).

## 4. 컴포넌트 구조

- 기본 서버 컴포넌트, 상호작용(상태·이벤트·`usePathname`) 있을 때만 `"use client"`.
- 컴포넌트는 **화면 전용이면 해당 라우트의 `_components/`**(예: `app/(home)/_components`, `app/reels/_components`), **2개 화면 이상 공용이면 `app/_components/`**. 파일 하나 = 컴포넌트 하나(작은 private 헬퍼는 예외). 목데이터는 `app/_mocks/posts.ts`, 도메인 타입·상수·포맷 유틸은 `@plick/domain`(types/constants/format — ADR 0018). `_` = 라우트 아님.
- 새 훅을 만들기 전에 `app/_hooks/`를 먼저 훑는다. 비슷한 훅이 이미 있으면 재사용하거나 확장하고, 새로 만들면 JSDoc 첫 줄에 무엇을 하는 훅인지 요약을 단다(자동완성 목록에서 읽히는 줄이다).
- `Logo` `MediaThumb` `TeamCrest`와 아이콘 레지스트리(`icons.tsx`)는 웹과 공용이라
  **`@plick/ui`로 승격됨**(KAN-200) — `@plick/ui/<파일명>`으로 import. 새 공용 아이콘도 여기에 추가.
- 콘텐츠를 좌우로 끌어 이웃 값(팀·날짜·탭)으로 넘기는 화면은 `SwipePager`(`_components`)를 쓴다.
  `value`·`neighborOf`·`onCommit`·`renderPreview`만 넘기면 축 판정·플릭·스냅·미리보기 페인이 붙는다.
  커밋 핸들러는 탭 클릭 핸들러를 그대로 넘긴다(URL·상태 동기화가 같은 경로를 타게). 소켓처럼
  마운트 비용이 있는 페인의 미리보기는 자리 표시로 대신한다(`MatchChatPreview`). 당겨서 새로고침은
  `ScrollArea`의 `onRefresh`인데 서버 컴포넌트는 함수를 못 넘기니 `XxxScrollArea` 클라 껍데기를 둔다.
- 사진 자리는 `bg-media` 면이다. 팀컬러 그라데이션은 쓰지 않는다(KAN-567).
- 팀 로고 = `TeamCrest`(`team`에 `TEAMS[code]` 객체) — `public/teams/<코드소문자>.webp`의 **실제 구단
  로고**를 그린다(피그마의 구단 로고 자리 전부 이걸로). 새 팀은 같은 규칙으로 webp만 추가(웹·모바일
  양쪽 public에). 로고 비율이 제각각이라 정사각 + `object-contain`.
- **아이콘은 피그마 노드 벡터를 그대로 옮긴다** — 기존 비슷한 아이콘 재사용 금지(형태 자체가 스펙).
  `get_design_context`가 주는 에셋 URL(`figma.com/api/mcp/asset/...`, 7일 유효)을 받아
  viewBox·패스·선 굵기를 원본대로 컴포넌트화하고 색만 `currentColor`로 바꾼다.
- 사용자가 준 이미지(PNG 등)를 원본으로 아이콘을 딸 때도 같다: 실루엣을 그대로 따라 그린다.
  면으로 그려진 도형을 단일 선으로 단순화하는 식의 재해석 금지 — 형태가 스펙이다. 면 도형의
  흰 속이 세트 기본 스트로크(1.8)에서 메워지면 형태를 바꾸지 말고 그 아이콘만 스트로크를
  낮춘다(주석으로 이유를 남긴다). 렌더 확인은 `qlmanage -t`로 SVG를 PNG로 떠서 원본과
  나란히 비교하면 빠르다.

## 5. 목데이터 우선

BE 전이므로 `app/_mocks/posts.ts`에 데이터를 먼저 만들고 화면이 소비한다. 타입은 `@plick/domain/types`(BE 목표 형태, web과 단일 출처). 나중에 fetch로 교체.

## 6. 검증

- **클린 빌드**로 확인: `pnpm --filter mobile build` (dev 증분 캐시에 속지 말 것 — 정렬/패딩 깨짐은 클린 빌드로 재현).
- 로컬 dev(:3001)를 402x874 뷰포트로 띄워 스크린샷으로 시안과 대조.
- CI는 레이아웃 깨짐을 못 잡으니 **시각 확인 필수**.

## 7. ADR 남기기

세션 ADR은 CLAUDE.md `작업 기록` 규칙대로 남기되, **문체는 블로그 회고체**(1인칭·짧게·사람 말투, AI 티 금지)로 쓴다.
