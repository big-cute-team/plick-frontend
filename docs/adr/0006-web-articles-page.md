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

### 2. 공용은 승격, 다른 것은 새로 — `TeamFilterTabs`만 올리고 행은 분리

- **`TeamFilterTabs`는 홈과 100% 동일** → 홈 라우트 전용(`(home)/_components/`)에서
  `apps/web/app/_components/`로 승격하고, 이 탭이 쓰던 `Filter` 타입도 `(home)/_lib/types.ts`에서
  공용 `_lib/types.ts`로 옮겼다(라우트 전용 `_lib`은 빈 파일이 되어 삭제). 홈 `NewsFeed`의 import를
  같은 커밋에서 교체. (스킬 §4: 웹 내 2개 화면 이상 공용 → `app/_components/`)
- **기사 행은 홈 `NewsItem`과 다르다** → 새로 만들었다. 홈 행은 가로형 썸네일(`h-24 w-33`)·제목 17px,
  기사 행은 **정사각 썸네일(86px, `size-21.5` `rounded-control`)·제목 15px(`text-body-lg`)**로 더 촘촘하다.
  `variant` prop으로 한 컴포넌트에 4갈래 분기를 넣기보다 `ArticleItem`을 분리하는 편이 읽기 쉽고,
  이미 병합된 홈 디자인(KAN-200)을 건드리지 않는다. 필터 컨테이너도 마찬가지로 행만 다른
  `ArticleFeed`(≈20줄)로 분리 — 얇은 클라이언트 래퍼라 render-prop 추상화는 과설계로 판단.
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
- **"있는 것 재사용"과 "피그마 그대로"가 부딪히면 디자인 의도를 기준으로.** 홈 `NewsItem`이 90% 비슷해도
  썸네일 형태·제목 크기가 다르면 근사치로 끼워맞추지 않고 분리한다. 대신 진짜 동일한 조각
  (`TeamFilterTabs`)은 반드시 승격해 사본을 남기지 않는다(감사 대상).
