# 0006 — 데스크톱 웹 기사 페이지(팀별 모아보기)

- 상태: 채택
- 티켓: KAN-207 · 피그마 W10 기사(node 222-2)
- 관련: [ADR 0005](0005-web-home-and-ui-promotion.md)(웹 홈·공용 승격·데스크톱 토큰), `web-publishing` 스킬

## 무엇

`apps/web/app/articles/` 신설. GNB(SiteHeader) + 중앙 정렬 단일 컬럼에 `기사` 제목 + 부제 +
팀 필터 탭 + 팀별 이적 기사 리스트(왼쪽 텍스트 / 오른쪽 정사각 썸네일). NAV_LINKS의 `/articles`가
이제 실제 라우트로 연결된다.

## 어떻게 · 왜

### 1. 좁은 읽기 컬럼은 새 토큰 `max-w-read`(860px)로

피그마 W10은 GNB를 1200px(=`max-w-page`)로 두면서 본문은 860px 좁은 컬럼으로 중앙 정렬한다.
홈의 `PageContainer`(1200)는 이 페이지 본문엔 너무 넓다. `max-w-[860px]` 인라인 대신 **콘텐츠 최대폭은
토큰화**하라는 스킬 §1 지침을 따라 `packages/tokens/theme.css`에 `--container-read: 860px`
(→ `max-w-read`)를 추가했다. 본문 컬럼은 `max-w-read px-gutter mx-auto`로, `px-gutter`(32) 포함해
피그마 본문 폭과 정확히 일치(860 − 32×2 = 796 내부). 기사 상세·다른 단일 컬럼 페이지가 재사용할 값이라
페이지 전용 CSS에 숨기지 않았다. 토큰 패키지를 건드렸으므로 **모바일 빌드까지** 확인(회귀 없음).

### 2. 홈 피드와 기사 피드를 `variant`로 통합

처음엔 "기사 행은 홈 `NewsItem`과 다르니 `ArticleItem`/`ArticleFeed`로 분리"했으나, 리뷰에서
**둘이 마크업이 100% 같고 다른 건 유틸 클래스 4개뿐**(행 gap·세로 패딩·제목 크기·썸네일 형태)임이
드러나 통합했다. 근사치로 끼워맞추는 게 아니라 진짜 동일한 구조라 분리가 곧 중복이었다.

- **`PostListItem`(`app/_components/`)** — `variant: "news" | "article"` 하나로 밀도만 바꾼다.
  공통(Link·팀/시각·`line-clamp-2` 제목·`flex-wrap` 메타·`MediaThumb`)은 한 곳에, 변형은 작은
  `VARIANT` 맵에만 둔다: `news`=가로 썸네일(`h-24 w-33`)·제목 17px(`text-title`),
  `article`=정사각(`size-21.5` `rounded-control`)·제목 15px(`text-body-lg`). 홈 디자인(KAN-200)은
  픽셀 그대로 유지된다(`news` 변형이 기존 값과 동일).
- **`PostFeed`(`app/_components/`)** — 필터 상태 + `TeamFilterTabs` + 리스트. 리스트 하단 패딩만
  변형별로 다르다(`news`는 `pb-6`). 홈 `NewsFeed`/`ArticleFeed`를 대체.
- **`TeamFilterTabs`도 승격** — 홈과 100% 동일하므로 `(home)/_components/` → `app/_components/`.
  이 탭이 쓰던 `Filter` 타입도 `(home)/_lib/types.ts` → 공용 `_lib/types.ts`(라우트 전용 `_lib`은
  빈 파일이 되어 삭제). (스킬 §4: 웹 내 2개 화면 이상 공용 → `app/_components/`)
- 재사용한 것: `SiteHeader`·`MediaThumb`(colorVar)·`formatCount`·`TEAMS`·`FeedPost`. **목데이터는
  `POSTS`(7개) 그대로** — 피그마 7개 기사와 팀·제목·기자·조회·댓글이 정확히 일치해 새로 만들지 않았다.
  (홈은 `NEWS_POSTS`=`POSTS.slice(3)`만 소비해 전 팀 필터가 안 되지만, 기사 페이지는 전체 `POSTS`를 넘긴다.)

### 3. 반응형은 사실상 무료였다

피그마부터 단일 중앙 컬럼이라 홈처럼 다열→1열·사이드바 숨김 같은 판단이 필요 없었다(숨길 요소 없음 →
사용자 확인 불필요). 무너짐 방지만 챙기면 됐다: 넘치는 팀 필터 탭은 승격된 `TeamFilterTabs`의
`overflow-x-auto`가 그대로 처리, 제목 `line-clamp-2`·메타 `flex-wrap`. 330px에서 가로 오버플로 0
(`scrollWidth == innerWidth`) 확인. GNB 햄버거는 `SiteHeader`가 이미 담당.

## 하드원 교훈

- **피그마 0.45 배율에 속지 말 것.** 프레임 실제 폭은 값을 0.45로 나눈다(썸네일 38.7px→86px, 제목
  6.75px→15px, 본문 컬럼 387px→860px). 스크린샷의 "작아 보임"이 아니라 노드 수치로 토큰을 골라야
  `text-body-lg`·`size-21.5` 같은 정확한 매핑이 나온다.
- **"디자인이 다르다"와 "구조가 다르다"를 구분하라.** 홈/기사 행은 밀도가 달라 처음엔 분리했지만,
  마크업이 같고 유틸 4개만 다르면 그건 **한 컴포넌트의 `variant`**지 별개 컴포넌트가 아니다. 값 델타는
  작은 map(`VARIANT`)에 격리하고 구조는 한 곳에 둔다. 근사치 끼워맞춤(다른 구조를 억지 통합)만 피하면
  되고, 같은 구조는 반드시 통합해 사본을 남기지 않는다(감사 대상).
