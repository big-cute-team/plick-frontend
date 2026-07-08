# ADR 0002 — 모바일 홈 화면 레이아웃 · 디자인 적용기

- **상태(Status):** Accepted
- **날짜(Date):** 2026-07-08
- **범위:** `apps/mobile` 홈 화면 퍼블리싱 (KAN-163). 반응형 레이아웃 전략과 디자인 토큰 적용 과정을 정리한다.
- **관련:** [ADR 0001 개발 도구](0001-dev-tooling-setup.md), 디자인 토큰은 `@plick/tokens/theme.css`

> 이 문서는 "무엇을 만들었나"보다 **"어떻게 만들었고, 왜 그렇게 했고, 어디서 막혔나"**에 집중한다.
> 다음 화면(릴스·상세·MY·온보딩·로그인)도 여기 정립한 패턴을 그대로 재사용한다.

---

## 1. 목표와 제약

- **모바일 우선**. `apps/mobile`만 구현(웹은 별도).
- **웹뷰로 배포**될 예정 → 갤럭시/아이폰/저사양폰/**갤럭시 폴드(접힘·펼침)** 등 폭·높이가 제각각인 기기에서 **레이아웃이 안 깨져야** 한다.
- **디자인 토큰을 100% 사용** — 하드코딩 색/치수 금지. 다크가 기본, 라이트는 토큰 오버라이드.
- 백엔드 전이라 **목데이터 먼저** 만들고 화면을 붙인다.

---

## 2. 반응형 전략 (가장 중요)

웹뷰에서 다양한 기기를 커버하려고 **4겹**으로 접근했다. 각 겹은 특정 문제 하나를 푼다.

| 문제                                       | 해결                                                | 구현 위치                  |
| ------------------------------------------ | --------------------------------------------------- | -------------------------- |
| 모바일 브라우저 주소창 때문에 `100vh`가 튐 | **`100dvh`** (동적 뷰포트 높이)                     | `AppShell`                 |
| 노치·펀치홀·홈 인디케이터가 콘텐츠를 가림  | **`env(safe-area-inset-*)`** + `viewport-fit=cover` | `TopBar`·`TabBar`·`layout` |
| 폴드 펼침·태블릿·PC에서 UI가 흉하게 늘어남 | **`max-width` + 중앙 정렬** → 폰 폭 유지            | `AppShell`                 |
| 폴드 접힘(≈280px)·큰 폰트에서 넘침         | **고정 px 폭 지양** (flex·%·가로 스크롤)            | 전반                       |

### 2-1. 앱 셸 (`AppShell`)

레이아웃의 뼈대. 화면 하나 = "고정 상단바 + 스크롤 본문 + 고정 하단탭"의 세로 스택.

```tsx
// 핵심만
<div className="bg-bg text-text relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden">
  {children}
</div>
```

- `h-[100dvh]` — **동적 뷰포트 높이**. iOS Safari/Chrome은 스크롤 시 주소창이 줄었다 커지는데, `100vh`는 가장 큰 상태로 고정돼 하단이 잘린다. `dvh`는 실제 보이는 높이를 따라간다.
- `max-w-[480px] mx-auto` — 넓은 화면(폴드 펼침·데스크톱)에선 **폰 폭(480)으로 가운데 정렬**. 양옆 여백은 `body`의 `bg-nav`가 채워 "폰 프레임" 느낌. 좁은 화면에선 자동으로 꽉 참.
- `overflow-hidden` + 내부 `ScrollArea`가 스크롤 담당 → 상/하단 바가 안 밀린다.

```tsx
// 상/하단 바 사이 스크롤 영역
<main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
  {children}
</main>
```

`overscroll-contain`으로 스크롤 바운스가 부모(웹뷰)로 전파되지 않게 막았다.

### 2-2. Safe-area (노치·홈 인디케이터)

`layout.tsx`에서 뷰포트에 `viewport-fit=cover`를 줘 **노치 영역까지 그려지게** 한 뒤, 바에서 inset을 패딩으로 흡수한다.

```tsx
// layout.tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // 노치/펀치홀까지 캔버스 확장
  themeColor: "#0b0d12",
};
```

```tsx
// TopBar: 상단 노치 아래로 콘텐츠 내림
<header style={{ paddingTop: "env(safe-area-inset-top)" }} ... />
// TabBar: 홈 인디케이터/제스처 영역 피함
<nav style={{ paddingBottom: "env(safe-area-inset-bottom)" }} ... />
```

### 2-3. "고정 px 폭 지양" 원칙

폴드 접힘(≈280px)이나 사용자 폰트 확대에서도 안 깨지도록:

- 컨테이너 폭은 `%`·`flex`로, 넘칠 수 있는 가로 요소(팀 필터, 핫이슈 캐러셀)는 **가로 스크롤**로 처리.
- 세로 높이도 고정하지 않고 콘텐츠가 흐르게 둔다.

---

## 3. 디자인 토큰을 화면에 적용한 방식

### 3-1. 토큰 → Tailwind 유틸 매핑 (`@theme inline`)

`theme.css`의 `--plk-*` 변수는 그냥 CSS 변수라서, 그대로는 Tailwind 클래스로 못 쓴다.
`@theme inline` 블록으로 **색을 Tailwind 색 유틸에 연결**했다.

```css
@theme inline {
  /* inline이라 값을 굳히지 않고 var()를 그대로 emit
     → [data-theme=light]에서 자동 전환된다 */
  --color-bg: var(--plk-bg);
  --color-text: var(--plk-text);
  --color-accent: var(--plk-accent);
  --color-border: var(--plk-border);
  /* ... */
}
```

결과: `bg-bg` · `text-text` · `text-text-3` · `bg-accent` · `border-border` 같은 유틸이 생기고,
**하드코딩 색 없이** 컴포넌트를 짤 수 있다.

**`inline`이 핵심**이다. 일반 `@theme`은 값을 컴파일 타임에 굳혀버려 테마 전환이 안 된다.
`inline`은 `var(--plk-*)`를 그대로 내보내므로, 아래 다크/라이트 전환이 자동으로 따라온다.

### 3-2. 다크/라이트 = `data-theme` 한 줄

`theme.css`가 다크를 `:root`, 라이트를 `[data-theme="light"]` 오버라이드로 정의한다(ADR/토큰 참고).
그래서 **화면을 다크 기준으로만 만들면 라이트는 공짜**로 따라온다.

```tsx
// ThemeToggle: <html>의 data-theme만 토글하면 전체 UI가 전환됨
document.documentElement.setAttribute("data-theme", next);
```

라이트 화면을 따로 퍼블리싱하지 않았고, 토글 한 번으로 전 화면이 전환되는 것을 실제로 검증했다.

### 3-3. 치수·타이포도 토큰

색 외에 간격/모서리/글자도 토큰으로 유틸화했다.

- 타입: `--text-title` `--text-body-lg` `--text-body` `--text-caption` … → `text-title` 등
- 라운드: `--radius-card`(16) `--radius-hero`(22) `--radius-pill`(999) … → `rounded-hero` 등
- 간격: `--spacing-edge`(20, 화면 좌우 패딩) `--spacing-gap`(12) … → `px-edge` 등
- 미디어 placeholder: `--plk-media-bg` / `--plk-media-on` (사진 자리 색, BE 이미지로 교체 예정)

> ⚠️ **간격 토큰 이름 주의**: 처음엔 `--spacing-screen`으로 `px-screen`을 쓰려 했는데,
> `screen`은 Tailwind 예약어(`w-screen`/`h-screen`)라 **유틸이 생성되지 않았다**. → 6장 참고.

---

## 4. 컴포넌트 아키텍처

라우트·조립·반응형은 앱에, 재사용 조각은 컴포넌트로 분리했다. Next App Router의 **private 폴더(`_`)** 로
라우트가 아닌 것들을 격리했다.

```
apps/mobile/app/
  layout.tsx          루트(뷰포트·다크 기본·Pretendard)
  globals.css         tailwind + tokens import + 웹뷰 보강
  page.tsx            홈 조립
  _lib/               types.ts · mock.ts · format.ts   (도메인/목데이터)
  _components/        AppShell · TopBar · TabBar · ThemeToggle · Logo
                      TeamCrest · MediaThumb · HotCarousel · HotHeroCard
                      NewsFeed · NewsItem · TeamFilterTabs · icons
```

- **서버/클라이언트 분리**: 기본은 서버 컴포넌트, 상호작용 있는 것만 `"use client"`
  (테마 토글, 탭 활성 상태(`usePathname`), 팀 필터 상태, 캐러셀 스크롤 추적).
- **아이콘**: 외부 아이콘 라이브러리 대신 `icons.tsx`에 인라인 SVG. `stroke=currentColor`라 토큰 색을 그대로 물려받는다.
- **미디어 placeholder**: 실제 사진이 없어 `MediaThumb`이 **팀 컬러 → 미디어 배경**으로 흐르는 그라데이션을 그린다. 전부 토큰 기반. BE 연동 시 `<img>`로 교체.

---

## 5. 목데이터 우선

화면을 붙이기 전에 도메인 타입과 목데이터를 먼저 고정했다.

- `_lib/types.ts` — `FeedPost` / `Team` / `Reporter` / `Comment` / `Debate` / `User`. BE 응답의 목표 형태.
- `_lib/mock.ts` — 팀 레지스트리(빅6 + 컬러 토큰 매핑), 게시물 목록, 현재 유저, 댓글/토론 샘플.
- `_lib/format.ts` — 조회수 포맷(`12400 → 12.4K`), 루머 단계 라벨 등.

화면 컴포넌트는 이 목데이터만 소비하므로, 나중에 BE fetch로 갈아끼우기 쉽다.

---

## 6. 하드원 교훈 (막혔던 지점)

### 6-1. `screen` 예약어 → 가로 패딩 전체 증발 🔴

**증상**: 어느 순간 홈의 **모든 가로 패딩이 사라져** 로고·헤딩·리스트가 왼쪽에 딱 붙었다.

**원인**: Tailwind v4에서 `screen`은 예약어(`w-screen`=100vw 등)다. 그래서 `--spacing-screen`을 정의해도
**`px-screen` 유틸이 생성되지 않는다**. 색/글자/라운드 토큰은 예약어 충돌이 없어 멀쩡했고, 오직 `px-screen`만 죽었다.

**왜 갑자기?**: dev 서버가 증분 컴파일로 예전 CSS를 물고 있다가, 리베이스로 **클린 재컴파일**되면서
"원래 안 생성되던" 상태가 드러났다. → **"dev에선 되는데 클린 빌드/CI에선 깨지는"** 전형적 함정.

**해결**: 토큰을 `--spacing-edge`로 개명하고 `px-screen` → `px-edge`로 교체.

> 교훈: **Tailwind 토큰 이름에 예약어(`screen` 등)를 피하라.** 그리고 자동 정렬/패딩이 의심되면
> **dev 캐시가 아니라 클린 빌드로 재현**해봐야 진짜 상태를 본다.

### 6-2. 캐러셀 센터 정렬 — 끝단이 안 맞는 문제

핫이슈 캐러셀을 "카드가 화면 중앙에 오도록" 만드는 과정에서 두 번 막혔다.

1. **처음**: 좌측 정렬(`snap-start` + 좌우 패딩). → 카드가 왼쪽에 붙음.
2. **센터로**: `snap-center` + 좌우 패딩. → 가운데 카드는 맞는데 **첫/마지막 카드가 중앙까지 안 감**.
   - 원인: 카드 폭이 `w-[86%]`인데 이 %는 **패딩 뺀 콘텐츠 박스** 기준이라, 끝단에서 카드 중심이 화면 중심에 닿을 스크롤 여지가 없다. (수식상 필요한 패딩이 폭의 50%가 되어 불가능)
3. **최종**: 좌우 패딩 대신 **스페이서(spacer) div** 를 넣었다.

```tsx
<div className="snap-x-carousel flex gap-2.5 overflow-x-auto">
  <div aria-hidden className="w-[calc(7%-10px)] shrink-0" /> {/* 좌 스페이서 */}
  {posts.map((p) => (
    <div className="w-[86%] shrink-0 snap-center">…</div>
  ))}
  <div aria-hidden className="w-[calc(7%-10px)] shrink-0" /> {/* 우 스페이서 */}
</div>
```

카드 폭 86% → 좌우 여백이 각각 `(100-86)/2 = 7%` 필요. 스페이서를 `7% - gap`으로 두면
첫/마지막 카드도 정확히 화면 중앙에 스냅된다.

> 교훈: **`%` 폭 + 패딩 방식은 센터 캐러셀의 끝단을 못 맞춘다. 스페이서로 스크롤 여지를 만들어라.**

### 6-3. 프리뷰 스크린샷이 스크롤을 리셋함

마지막 카드 중앙 정렬을 스크린샷으로 확인하려니 도구가 스크롤을 0으로 되돌렸다. →
스크린샷 대신 **DOM `elementFromPoint`로 화면 중심에 있는 카드**를 조회해 검증했다
(`카드 중심 == 뷰포트 중심` 확인).

---

## 7. 검증 방법

- **클린 빌드**: `pnpm --filter mobile build` — 타입·컴파일 통과 확인(dev 캐시에 속지 않기 위해).
- **실기 렌더**: 로컬 dev 서버를 모바일 뷰포트로 띄워 스크린샷. 다크/라이트 토글, 센터 정렬 확인.
- **정밀 확인**: `elementFromPoint`·computed style로 패딩/정렬을 픽셀 단위 검증.
- **CI**: `format:check → lint → check-types → build` (ADR 0001). 단, CI는 **레이아웃 깨짐은 못 잡는다**
  (6-1이 CI 초록불에도 살아남았음) → 시각 검증이 별도로 필요하다는 교훈.

---

## 8. 다음 화면을 위한 재사용 체크리스트

새 화면(릴스·상세·MY·온보딩·로그인)을 만들 때:

- [ ] `AppShell` + `ScrollArea` + (필요시) `TopBar`/`TabBar`로 뼈대 구성
- [ ] 색·간격·글자는 **토큰 유틸만** 사용(`bg-bg` `text-text` `px-edge` `rounded-card` …). 하드코딩 금지
- [ ] 상호작용 없으면 서버 컴포넌트, 있으면 `"use client"`
- [ ] 사진 자리는 `MediaThumb`, 팀 표식은 `TeamCrest`
- [ ] 데이터는 `_lib/mock.ts`에 추가 후 소비
- [ ] 좌우 패딩은 `px-edge`(예약어 `screen` 쓰지 말 것)
- [ ] 다크로만 만들고 라이트는 토글로 검증
- [ ] **클린 빌드 + 실기 스크린샷**으로 확인

---

## 9. 남은 일

- 화면: 릴스 풀스크린 · 기사상세+댓글 · MY · 프로필수정 · 온보딩(닉네임/팀선택) · 로그인
- 팀 필터 실제 라우팅/데이터 연동, 무한 릴스, 공유 딥링크(`/reels/[postId]`)
- BE 연동 시 `MediaThumb` → 실제 이미지, 목데이터 → fetch 교체
