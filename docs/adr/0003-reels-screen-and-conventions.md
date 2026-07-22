# ADR 0003 — 릴스 화면 퍼블리싱 · 컨벤션 정비

- **상태(Status):** Accepted
- **날짜(Date):** 2026-07-09
- **범위:** `apps/mobile` 릴스 화면 퍼블리싱 (KAN-167, PR #16) + 이 과정에서 정비한 코드 구조·주석·클로드 설정 컨벤션.
- **관련:** [ADR 0002 모바일 홈 레이아웃](0002-mobile-home-layout.md), 디자인 토큰은 `@plick/tokens/theme.css`

> ADR 0002처럼 "무엇을 만들었나"보다 **"어떻게 만들었고, 왜 그렇게 했고, 어디서 막혔나"**에 집중한다.
> 후반부는 화면 작업 중 함께 정비한 **프로젝트 컨벤션**(폴더 구조·주석·규칙 기록 위치)을 다룬다.

---

## 1. 목표와 범위

- 피그마 `D5 릴스`(node 77-6)를 그대로 재현: **풀스크린 릴 + 세로 스냅**으로 한 장씩 넘기는 피드.
- 릴 구성: 풀블리드 미디어 → 우측 스크림 → 팀 칩·RUMOUR 배지·제목·티어/기자/시간 → 우측 액션 레일(좋아요·댓글·공유·저장) → 그라데이션 오버레이 탭바.
- 홈 핫이슈 카드가 이미 `/reels/[postId]`로 링크하고 있었으므로(당시 404) **딥링크 라우트도 함께** 구현.

---

## 2. 세로 스냅 피드 — CSS scroll-snap만으로

> 이 절은 더 이상 유효하지 않다. KAN-277에서 모바일 릴스 넘김을 Embla 캐러셀로 교체했다.
> 왜 바꿨고 무엇이 달라졌는지는 [ADR 0031](0031-reels-embla-carousel.md)에 있다.
> 아래는 최초 구현 당시의 기록으로 남긴다.

JS 스크롤 라이브러리 없이 CSS로 해결했다. 구조는 두 겹:

```tsx
// ReelsFeed — 스크롤 + 스냅 담당
<main className="flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain no-scrollbar">
  {posts.map((post) => <ReelItem key={post.id} post={post} />)}
</main>

// ReelItem — 스냅 지점. h-full = 컨테이너(100dvh) 전체
<section className="relative h-full w-full snap-start">…</section>
```

- `AppShell`(`h-[100dvh]`) 안에서 `flex-1`이라 릴 하나 = 화면 하나. 검증 시 `scrollHeight === 7 × clientHeight`가 정확히 일치했다.
- `overscroll-contain`으로 끝단 바운스가 웹뷰로 전파되지 않게 (ADR 0002와 동일 패턴).
- **딥링크**(`/reels/[postId]`)는 마운트 시 `el.scrollTo({ top: idx * el.clientHeight })`로 점프. JS 개입은 이것뿐.
- 추후 무한 스크롤·가상화가 필요해지면 라이브러리로 교체할 수 있는데, 클라이언트 로직이 `ReelsFeed` 한 파일에 격리돼 있어 교체 단위가 명확하다(§6-1 분리의 부수 효과).

## 3. 디자인 재현 방식

- **피그마 프레임은 0.55 배율**(221×480.7 = 402×874 iPhone)이었다. 모든 수치를 실척으로 환산해 적용
  (예: 제목 13.2px → 24px = `text-headline` 토큰, 레일 간격 12.1 → 22px).
- **토큰 5개 추가** — 피그마 변수(`get_variable_defs`)와 1:1 대응:
  - `media/on-dim` `media/chip` `media/chip-border` — 사진 위 오버레이용이라 **테마 불변**(다크 `:root`에만 정의, 라이트가 상속).
  - `accent/tint` `accent/border` — `color-mix(in srgb, var(--plk-accent) N%, transparent)`로 정의해 **라이트에서 accent를 따라 자동 전환**. 하드코딩 rgba였다면 라이트에서 어긋났을 것.
- **탭바는 릴스에서 다르게 생겼다**(배경 대신 그라데이션 스크림, 비활성 = 흰색 dim). 컴포넌트를 복제하지 않고
  `TabBar`에 `variant="overlay"` prop을 추가해 분기했다. 스크림·하단 정보 그라데이션은 이미지 가독성용 고정 값(테마 무관, ADR 0002 홈 히어로와 동일 판단).
- **목데이터는 홈과 단일 소스**(`_lib/mock.ts`의 `POSTS` 7개가 디자인 릴 7개와 1:1). 피그마의 좋아요/댓글 수치·기자명 일부는 mock과 달랐지만 **데이터는 mock을 소스로** 유지하고 PR에 기록해뒀다 — 레이아웃은 피그마가 스펙, 데이터는 mock이 스펙.

---

## 4. 하드원 교훈 (막혔던 지점)

### 4-1. 아이콘을 "비슷한 걸로" 재사용했다가 지적받음 🔴

**증상**: 우측 액션 레일 아이콘이 디자인과 다르게 보임 ("우측 아이콘이 다 깨졌는데?").

**원인**: 구조·토큰·카피는 노드 JSON으로 구현했지만, **아이콘만 기존 `icons.tsx`의 홈용 손그림 아이콘을 재사용**했다.
디자인은 하트(둥근 윤곽)·원형 말풍선·**종이비행기**·북마크인데, 기존 것은 사각 말풍선·**업로드 화살표**라 형태 자체가 달랐다.

**해결**: `get_design_context`가 주는 에셋 URL(`figma.com/api/mcp/asset/…`, 7일 유효)에서 SVG를 받아
**viewBox·패스·선 굵기를 원본 그대로** 옮긴 컴포넌트(`LikeIcon`·`ChatIcon`·`SendIcon`·`SaveIcon`)를 만들고 색만 `currentColor`로 바꿨다.

> 교훈: **아이콘은 형태 자체가 스펙이다.** 비슷한 아이콘 대체는 바로 눈에 띈다. 스크린샷은 검증용이고,
> 벡터도 노드가 소스다. → `screen-publishing` 스킬에 규칙으로 박제.

### 4-2. Prettier가 마크다운 속 `/** */`를 깨뜨림

CLAUDE.md에 JSDoc 규칙을 적으며 백틱 안에 `/** */`를 넣었더니, Prettier가 `*/`를 `\*/`로 이스케이프하면서
문장이 깨졌다. → 마크다운에서는 기호 리터럴 대신 **말로 풀어 쓰는 게**("JSDoc 블록 주석으로") 안전하다.

### 4-3. TS 5.9의 TS6 마이그레이션 경고

`packages/ui/tsconfig.json`의 `outDir`에 경고 발생. TS 6부터 `rootDir` 추론에 의존하지 말라는 사전 경고(ts6)로,
`"rootDir": "src"` 명시로 해소. 추론 의존은 include 구성이 바뀌면 출력 경로가 조용히 밀리는 위험이 있다.

---

## 5. 코드 구조 컨벤션 정비

화면 작업 중 받은 피드백("한 컴포넌트에 함수가 너무 많다", "플랫 폴더에선 못 찾는다")을 계기로 규칙화했다.

### 5-1. 파일 하나 = 컴포넌트 하나

- `ReelsFeed`에서 `ReelItem` 분리, `AppShell`에서 `ScrollArea` 분리 (2-export였던 유일한 파일).
- 20줄 미만의 파일-내부 전용 헬퍼(`RailAction` 등)는 private으로 남겨도 된다.

### 5-2. 컴포넌트 라우트 콜로케이션

```
app/
  _components/          # 2개 화면 이상 공용만 (AppShell·ScrollArea·TopBar·TabBar·
                        # MediaThumb·TeamCrest·Logo·ThemeToggle·icons)
  (home)/               # 라우트 그룹 — URL은 그대로 /
    page.tsx
    _components/        # 홈 전용 (HotCarousel·HotHeroCard·NewsFeed·NewsItem·TeamFilterTabs)
  reels/
    page.tsx · [postId]/page.tsx
    _components/        # 릴스 전용 (ReelsFeed·ReelItem)
```

- 규칙: **화면 전용은 그 라우트 안에, 2개 화면 이상에서 쓰면 루트 `_components`로 승격.**
- 루트 라우트(`/`)는 폴더가 없어 콜로케이션이 안 되므로 **라우트 그룹 `(home)`**을 만들었다(URL 불변).
- `git mv`로 이동해 파일 이력 보존.

### 5-3. 주석은 JSDoc으로

선언 위 `//` 블록을 전부 `/** */`로 통일 (IDE 호버/자동완성 노출). props는 `@param`, 예시는 `@example`,
타입 필드의 줄끝 주석은 필드 위 JSDoc으로. 표현식 내부처럼 JSDoc이 문법적으로 불가능한 위치만 인라인 `//` 허용.

---

## 6. 클로드 설정 변경 — 규칙을 어디에 기록하나

이번에 생긴 규칙들을 개인 메모리가 아니라 **저장소에 기록**하도록 체계를 정했다
(개인 메모리는 한 사람의 로컬에만 남지만, 저장소 기록은 머지 즉시 팀 전체의 클로드에 적용된다).

| 규칙 종류                                             | 기록 위치                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| 팀 공통 규칙 (주석 스타일, 네이밍, Git 절차)          | 루트 `CLAUDE.md`                                                  |
| 화면 퍼블리싱 세부 (아이콘 벡터, 토큰, 레이아웃 패턴) | `screen-publishing` 스킬 (분량 크면 스킬 폴더에 별도 파일 + 참조) |
| 앱 로컬 규칙 (컴포넌트 배치 등 apps/mobile 한정)      | `apps/mobile/CLAUDE.md`                                           |

이번에 실제로 반영한 것:

- **루트 CLAUDE.md** — JSDoc 주석 컨벤션 + "규칙 기록" 섹션(위 표의 내용 자체를 규칙화).
- **screen-publishing 스킬** — 아이콘은 피그마 노드 벡터 그대로(§4-1), 콜로케이션·파일당 컴포넌트 하나(§5).
- **apps/mobile/CLAUDE.md** — 컴포넌트 배치 규칙(§5-2).

---

## 7. 검증 방법

- **클린 빌드**: `pnpm --filter mobile build` — 커밋마다 (dev 캐시에 속지 않기, ADR 0002 §7).
- **실기 렌더**: dev(:3001) 모바일 뷰포트에서 스냅(7릴 = 정확히 7×뷰포트 높이), 딥링크 점프(마지막 릴까지),
  라이트 토글 시 스크림 위 텍스트 가독성 확인. 아이콘 형태는 피그마 스크린샷과 대조.
- **CI**: 커밋 7개 전부 `Lint · Types · Build` 통과. 리팩터링(분리·이동·주석) 커밋은 화면 결과가 동일함을
  프리뷰 스냅샷으로 별도 확인 — CI는 여전히 시각 회귀를 못 잡는다.

---

## 8. 남은 일

- 릴스 상호작용: 좋아요/저장 토글, 댓글 시트, 공유. 현재 레일 버튼은 표시만 한다.
- ~~스크롤 라이브러리 교체 검토(무한 피드·가상화 필요 시) — 교체 단위는 `ReelsFeed`.~~
  → KAN-277에서 Embla로 교체([ADR 0031](0031-reels-embla-carousel.md)). 가상화는 아직 미적용.
- mock 데이터 정리: 피그마와 어긋나는 수치·기자명, `n1`(라이스 뉴스)의 `stage: RUMOUR` 재검토.
- 다음 화면(기사상세+댓글·MY·온보딩·로그인)은 §5 구조와 `screen-publishing` 스킬 규칙을 그대로 적용.
