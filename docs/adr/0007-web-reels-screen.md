# 0007 · 데스크톱 웹 릴스 화면 (KAN-218)

> 상태: 반영됨 · 관련: [ADR 0003](0003-reels-screen-and-conventions.md)(모바일 릴스),
> [ADR 0005](0005-web-home-and-ui-promotion.md)(웹 뼈대·@plick/ui 승격), `web-publishing` 스킬

## 무엇을

피그마 **W3 릴스**(node 209-2)를 `apps/web/app/reels/`로 퍼블리싱했다. 헤더(GNB) +
세로 스냅 릴 뷰어. 릴 한 장 = 9:16 미디어 카드(칩·제목·기자 오버레이) + **카드 밖** 세로 액션 레일.
위아래로 스냅 스크롤(피드에 여러 릴).

## 어떻게 · 왜

### 뼈대 — 문서 흐름 대신 100dvh 고정 + 내부 스크롤

홈/기사는 문서 흐름을 그대로 스크롤시키지만, 릴스는 "릴 하나 = 뷰포트 한 장"이라
스냅이 깔끔하려면 **바깥 문서가 스크롤되면 안 된다**. `page.tsx`를
`flex h-[100dvh] flex-col overflow-hidden`으로 두고 `SiteHeader`(shrink-0) + `ReelViewer`(flex-1)로
채웠다. 스크롤은 뷰어(`flex-1 overflow-y-auto snap-y snap-mandatory`) 안에서만 일어난다.
헤더 높이를 calc로 빼지 않고 flex로 나눠 매직 넘버(`4rem`)를 없앴다.

- `overflow-hidden` 래퍼가 GNB의 `MobileNav` 드롭다운을 자를까 걱정했지만, 드롭다운은
  100dvh 박스 **안**에 떠서 안 잘리고 백드롭은 `fixed`라 무관 — 실측으로 확인.
- 순수 CSS 스냅이라 릴 뷰어·카드·레일 **전부 서버 컴포넌트**(상호작용 없음, "use client" 0개).

### 재사용 — 모바일 릴 칩 2종을 @plick/ui로 승격

`PostChips`·`ReporterTierBadge`는 모바일 릴 전용이었지만 토큰만 쓰는 순수 프레젠테이션이라
`packages/ui/src`로 **이동**(복사 아님)하고 모바일 import를 교체했다(같은 PR).

- `ReporterTierBadge`는 prop 모양(`{ reporter: { tier } }`)을 그대로 둬 모바일 호출부는
  import 경로만 바뀌었다(무churn).
- `PostChips`는 앱 상수(`TEAMS`)를 참조하던 걸 primitive prop(`teamName`·`rumour`)으로 일반화 —
  `MediaThumb`의 `colorVar` 전례를 따랐다. 모바일 호출부에서 `TEAMS[post.team].name`을 꺼내 넘긴다.

액션 레일은 모바일(`ReelActionRail`, 카드 안 절대배치·맨아이콘)과 레이아웃이 달라
(데스크톱은 **카드 밖** 세로 스택 + 원형 칩 배경) 웹 전용으로 새로 만들되 아이콘·`formatCount`는 공용을 썼다.

### 하드원 — 라이트 모드에서 레터박스가 밝아져 레일이 사라진다

레터박스(카드 밖 무대)를 `bg-media`로 칠했더니 라이트에서 `--plk-media-bg`가 밝은 회색
(#dfe4ec)으로 전환됐다. 그런데 그 위에 얹힌 액션 레일은 `media/chip`(흰 반투명) + `media/on`(흰 글자)
**테마 무관 흰색 계열** — 밝은 배경에선 안 보인다. 모바일 릴은 레일 뒤에 전용 우측 스크림이 있어
피했지만, 데스크톱 레일은 맨 무대 위라 그대로 노출됐다.

→ **릴스 무대는 시네마틱 다크 서피스**라 라이트에서도 어둡게 유지하는 게 맞다(영상 플레이어처럼
라이트 크롬 + 다크 무대). `packages/tokens/theme.css`에 **테마 무관** 토큰
`--plk-media-stage: #0b101d`(라이트 오버라이드 없음, `scrim` 옆)를 추가하고
`--color-media-stage`로 매핑해 `bg-media-stage`로 썼다. 피그마 Main Content fill(`media/bg` 다크값)과 일치.
공유 토큰 변경이라 **양쪽 앱 빌드로 회귀 확인**.

### 반응형 — 숨기지 않고 줄여서 맞춘다 (330px)

레일을 모바일에서 카드 안으로 옮기는 재구성 대신, **카드 밖 나란한 배치를 유지하고 카드만 줄였다**.
카드는 `aspect-[9/16] h-full max-w-full min-w-0` — 높이를 채우되 좁아지면 `max-w-full`이 폭을
가둬 레일과 나란해도 가로가 안 넘친다(미디어는 그라데이션 placeholder라 비율이 눌려도 무해).
330px에서 가로 오버플로 0, 겹침·잘림 없음 실측. GNB는 기존 `lg` 경계(햄버거)로 자동 대응.

- 무너짐만 막는 자명한 조정(1열/폭 유연화)이라 사용자 확인 없이 진행. 요소를 **숨기지 않았다**.

## 파일

- 화면: `apps/web/app/reels/page.tsx`, `_components/ReelViewer.tsx`·`ReelCard.tsx`·`ReelActionRail.tsx`
- 승격: `packages/ui/src/PostChips.tsx`·`ReporterTierBadge.tsx` (모바일 사본 삭제, import 교체)
- 토큰: `packages/tokens/theme.css` — `--plk-media-stage` / `--color-media-stage` 추가
