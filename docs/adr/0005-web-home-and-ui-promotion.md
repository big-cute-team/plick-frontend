# ADR 0005 — 데스크톱 웹 홈 · 공용 컴포넌트 `@plick/ui` 승격 · 데스크톱 토큰

- **상태(Status):** Accepted
- **날짜(Date):** 2026-07-15
- **범위:** `apps/web` 홈 화면 첫 퍼블리싱 (KAN-200, PR #28) + 이 과정에서 정비한 **모바일↔웹 공용 컴포넌트의 `@plick/ui` 승격**, **데스크톱 디자인 토큰**, 후속 GNB 피드백 반영.
- **관련:** [ADR 0002 모바일 홈 레이아웃](0002-mobile-home-layout.md), [ADR 0004 \_lib 분리·절대경로](0004-reel-detail-sheet-and-code-organization.md), `web-publishing`·`screen-publishing` 스킬, 디자인 토큰은 `@plick/tokens/theme.css`

> ADR 0002·0004처럼 "무엇을 만들었나"보다 **"어떻게 만들었고, 왜 그렇게 했고, 어디서 막혔나"**에 집중한다.
> 핵심은 (1) 모바일 전용이던 컴포넌트를 **앱 중립으로 일반화해 `@plick/ui`로 올린 절차**, (2) 데스크톱 반복 값을 **토큰으로 승격**한 결정, (3) Tailwind v4에서 **폰트 토큰이 색 토큰과 이름 충돌**해 활성 링크가 죽은 사건.

---

## 1. 목표와 범위

- 피그마 `W1 홈`(node 203-2)을 데스크톱에서 재현: 상단 GNB(`SiteHeader`) + 🔥핫이슈 그리드(히어로 2fr + 서브 2장 1fr) + "지금 올라온 소식"(팀 필터 탭 + 리스트) + 우측 sticky 사이드바(마이팀 카드 · 실시간 인기 Top5).
- 모바일(`apps/mobile`) 규칙과 **토큰·구조 컨벤션은 동일**, 레이아웃 뼈대(웹뷰 `AppShell` 대신 문서 흐름 + 컨테이너)와 컴포넌트 재사용 전략만 데스크톱에 맞게.

---

## 2. 핵심 결정 — 모바일 컴포넌트를 `@plick/ui`로 승격

웹이 처음 생기며 "모바일에만 있던 앱 중립 컴포넌트를 어디에 둘까"가 처음 실제 문제로 등장. `web-publishing` 스킬 §4 절차대로 **복사 금지, 이동**으로 `@plick/ui`에 올렸다: `Logo` `ThemeToggle` `MediaThumb` `TeamCrest` `icons`. 보일러플레이트(`button/card/code.tsx`)는 이때 삭제.

### 2-1. 앱 결합을 prop으로 끊어내기 (승격의 핵심 작업)

그냥 옮기면 안 되는 것들이 있었다 — 모바일 앱의 `_lib`에 결합돼 있었기 때문:

- **`MediaThumb`**: 원래 `team: TeamCode`를 받아 내부에서 `TEAMS[team].colorVar`를 조회했다. `TEAMS`는 앱별 `_lib/constants.ts`에 있어 패키지가 앱을 역참조하게 된다. → **`colorVar: string`만 받도록 일반화.** 앱 쪽 호출부에서 `TEAMS[post.team].colorVar`를 꺼내 넘긴다.
- **`TeamCrest`**: `team: TeamCode` + 내부 `TEAMS[team].name` 조회 → **`team: {code, name}` 객체**를 받게 일반화. 에셋(`public/teams/*.webp`)은 소비 앱의 public에 있어야 하므로 **웹에도 복사**.
- **`ThemeToggle`**: 모바일 TopBar 규격이 하드코딩돼 있어 데스크톱 GNB에 안 맞았다 → `className`·`iconSize` prop 추가(기본값은 모바일 규격 유지).
- `Logo`·`icons`는 토큰 유틸/`currentColor`만 써서 그대로 이동 → import 경로만 교체.

> 원칙: **패키지는 앱을 몰라야 한다.** 앱별 레지스트리(`TEAMS`)를 조회하던 결합을 "필요한 값(`colorVar`)이나 형태(`{code,name}`)를 prop으로 주입"으로 뒤집어 끊었다.

### 2-2. import 교체는 같은 PR에서

모바일 20여 파일의 `@/_components/…`·`./…` import를 `@plick/ui/<파일명>`으로 codemod. 사본이 두 개 남으면 감사 대상(스킬 §4)이라 **이동+교체를 한 PR에** 담았다.

### 2-3. Tailwind v4 소스 스캔 (놓치기 쉬움)

`@plick/ui` 컴포넌트의 클래스는 `node_modules` 취급이라 앱 Tailwind가 **자동 감지 못 한다.** 양쪽 앱 `globals.css`에 `@source "../../../packages/ui/src";`를 넣어야 스타일이 생성된다. 안 넣으면 빌드는 되는데 스타일만 실종.

---

## 3. 데스크톱 디자인 토큰 승격

데스크톱에서 반복되는 시맨틱 값은 `theme.css`에 토큰으로 올려 양쪽 앱이 쓰게 했다(웹 전용 CSS에 숨기지 않음, 스킬 §1):

- 레이아웃: `--container-page`(1200px, `max-w-page`) · `--spacing-gutter`(32px, `px-gutter`).
- 데스크톱 글자: `--text-hero`(26) `--text-hero-sm`(18.5) `--text-section`(20) `--text-gnb`(14.5) `--text-tab`(14) — 행간은 서브토큰으로 내장. 자간 `--tracking-heading`(-0.3px).
- **피그마 W1 프레임은 0.45 배율**이라 실제 px = 노드값 ÷ 0.45. 라벨류(캡션 11.5px 등)는 새 토큰을 만들지 않고 기존 토큰으로 스냅(0.5px 이내).

`PageContainer`(= `max-w-page` + `mx-auto` + `px-gutter`)로 폭을 단일화 — 페이지마다 max-width를 따로 적지 않는다.

---

## 4. 하드원 교훈

### 4-1. 🔴 Tailwind v4 — 폰트 크기 토큰이 색 토큰과 이름 충돌

가장 오래 헤맨 버그. 데스크톱 GNB 링크 크기 토큰을 `--text-nav`로 지었는데, **이미 색 토큰 `--color-nav`(nav 배경색)가 있었다.** Tailwind v4의 `text-*`는 폰트 크기(`--text-*`)와 텍스트 색(`--color-*`) **두 네임스페이스를 공유**한다. 그래서 `text-nav`가 **폰트 크기 유틸 + `color: var(--color-nav)` 유틸을 둘 다 생성**했고, 생성 순서상 색 규칙이 활성 링크의 `text-accent`를 덮어썼다.

- 증상: 활성 "홈"의 글자 색이 accent 그린이 아니라 **어두운 nav-bg(`rgb(10,11,15)`)** 로 렌더 → 라벨이 배경과 뭉개져 **빈 동그라미처럼** 보이고, "악센트가 어둡다"는 인상까지 줬다. (사용자 피드백 두 개가 실은 같은 원인)
- 진단: `getComputedStyle(link).color`가 `rgb(10,11,15)`인데 클래스엔 `text-accent`가 분명히 있음 → 생성된 CSS를 grep하니 `.text-nav{color:var(--plk-nav-bg)}` 발견.
- 해결: 폰트 토큰을 **`--text-gnb`로 개명**(색 토큰에 `gnb`가 없어 충돌 없음). `text-gnb`는 순수 폰트 크기.

> 교훈: **`--text-<name>` 폰트 토큰을 지을 때 같은 `<name>`의 `--color-*`가 있는지 반드시 확인한다.** `nav`처럼 색으로도 쓰이는 이름은 폰트 토큰에 쓰지 말 것. `text-*`는 크기·색을 겸하는 오버로드 네임스페이스다.

### 4-2. 🔴 `overflow-x: hidden`이 `position: sticky`를 깬다

웹 `globals.css`가 가로 스크롤 방지로 `html, body { overflow-x: hidden }`을 쓰고 있었는데, `overflow-x: hidden`은 **body를 스크롤 컨테이너로 만들어** sticky GNB·사이드바가 붙지 않았다(스크롤해도 따라오지 않음). → **`overflow-x: clip`으로 교체**(clip은 스크롤 컨테이너를 만들지 않음). DOM 측정(`getBoundingClientRect().top`)으로 sticky 동작을 수치 확인.

### 4-3. 🔴 Turbopack stale CSS 청크 (재발, ADR 0002·0004 §6)

`globals.css`(토큰)를 고쳐도 dev가 **옛 CSS 청크를 계속 서빙**했다(`curl`로 확인해도 옛 규칙). HMR·재요청·서버 재시작으로도 안 바뀌어 **`.next` 삭제 후 재시작**해야 반영됐다. `packages/tokens`(공유 패키지) 변경은 특히 캐시가 끈질기다.

> 교훈: 토큰/공유 패키지를 고쳤는데 브라우저에 반영이 안 되면 dev 캐시를 의심. `rm -rf apps/web/.next` + preview 재시작이 확정 방법.

### 4-4. Browser 프리뷰 pane의 스크린샷 지연

스크롤 후 스크린샷이 옛 프레임에 멈춰 있는 현상 → 뷰포트를 1px 리사이즈하면 리페인트가 강제됐다. 시각 확인은 `getComputedStyle`·`getBoundingClientRect` 수치 측정과 병행해야 신뢰할 수 있었다.

---

## 5. 검증 방법

- **양쪽 앱 클린 빌드**: `@plick/ui`·`packages/tokens`를 건드렸으므로 `pnpm --filter web build` + `pnpm --filter mobile build`(공유 패키지 회귀) 둘 다. lint·check-types·format:check 통과.
- **실기 렌더**: dev(:3000) 데스크톱 뷰포트(1280×800+)에서 피그마 대조 — 간격·정렬·타이포, 다크/라이트 토글, 팀 필터 동작, sticky GNB·사이드바. 색·라운드·폰트 크기는 `getComputedStyle`로 수치 확인(예: 활성 홈 color=`rgb(47,217,127)`, radius=14px).
- **모바일 회귀**: 승격 컴포넌트 소비처(홈 `MediaThumb`, 온보딩 팀 선택 `TeamCrest`) dev(:3001)에서 재확인.
- **CI**: `Lint · Types · Build` 전 커밋 통과.

---

## 6. 후속 피드백 반영 (같은 세션·같은 PR)

퍼블리싱 후 GNB 관련 피드백 3건을 같은 브랜치에 이어 반영:

1. 비활성 내비 링크가 시안 대비 어두움 → `text-text-4`(#5e6b80) → **`text-text-2`(#c4cddb)**, hover는 `text-text`.
2. 활성 "홈"이 어둡고 빈 동그라미 같음 → **§4-1 토큰 충돌이 진짜 원인**, `text-gnb` 개명으로 해소.
3. 활성 필 라운드가 과함 → `rounded-pill`(999px) → **`rounded-control`(14px)**.

---

## 7. 모바일 반응형 (같은 세션 후속 요구)

"웹도 좁은 화면에서 레이아웃이 박살난다, 반응형 챙겨라"는 요구로 홈에 모바일 뷰를 넣었다. 스킬 §3의 기존 문구("웹에서 모바일 브레이크포인트를 새로 파지 않는다")를 **뒤집는 결정** — 웹도 모바일 뷰를 대응한다(스킬 §3 갱신함).

- **경계는 `lg`(1024px)** 단일 기준. 그 아래는 모바일 뷰로 스택(태블릿 768~1024도 모바일 취급). 1200px 데스크톱 디자인이 그보다 좁으면 촘촘해지므로 한 경계로 깔끔히 나눴다.
- **핫이슈**: `grid-cols-1 lg:grid-cols-[2fr_1fr]` — 모바일은 히어로 **1장만**, 서브 스택은 `hidden lg:flex`.
  - 함정: 히어로 카드가 `h-full`로 우측 스택 높이에 맞춰져 있었는데, 1열이 되면 **높이 기준이 사라져 카드가 찌부**된다. → 모바일에서 `aspect-video`를 주고 `lg:aspect-auto lg:h-full`로 되돌렸다.
- **사이드바(마이팀·실시간 인기)**: `HomeSidebar`에 `className` prop을 받게 하고 페이지에서 `hidden lg:flex` 주입. 뉴스 그리드도 `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]`.
- **GNB 햄버거**: 가로 내비·검색은 `hidden lg:flex`, 대신 `MobileNav`(`lg:hidden`) — 햄버거 버튼 + 펼침 패널(내비 링크 세로 스택, 바깥 클릭 백드롭으로 닫힘). 아이콘은 피그마에 모바일 시안이 없어 표준 3선 `MenuIcon`을 `@plick/ui/icons`에 추가(특정 노드 벡터 아닌 기하 아이콘이라 `base()` 라인 스타일). 검색·내비를 숨긴 자리는 스페이서(`flex-1 lg:hidden`)로 아이콘 클러스터를 우측 정렬.
- **검증**: dev(:3000)에서 390px·1280px 두 폭 — 모바일에서 사이드바 `display:none`, 핫이슈 링크 1개, 햄버거 패널 개폐, **가로 오버플로 0**(`scrollWidth == innerWidth`)을 DOM으로 수치 확인. 데스크톱은 3카드+사이드바+가로 내비 유지. 프리뷰 스크린샷은 지연이 있어 `getComputedStyle`·`read_page` 병행.

## 8. 남은 일

- 웹 나머지 화면(릴스·기사·MY)·라우트(`/reels` `/articles` `/me`) — GNB 링크는 이미 걸려 있음(현재 홈만 구현).
- 검색·알림·프로필 버튼은 표시만(동작 미연결). 모바일 햄버거 패널엔 현재 내비 링크만 — 검색·프로필을 넣을지는 추후.
- 승격 후보 추가 발생 시(예: 뱃지·칩) 같은 §2 절차로 `@plick/ui`에.
