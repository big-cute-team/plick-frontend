# ADR 0010 — 모바일 기사 세부 페이지 (KAN-243)

- **상태(Status):** Accepted
- **날짜(Date):** 2026-07-16
- **범위:** `apps/mobile` 기사 세부 화면 신설(`/articles/[postId]`) + 홈 소식 리스트 라우팅 변경.
- **관련:** [ADR 0002 모바일 홈 레이아웃](0002-mobile-home-layout.md), [ADR 0009 웹 기사 세부](0009-web-article-detail.md), 공용 승격은 [ADR 0005](0005-web-home-and-ui-promotion.md). 피그마 S1(node 301:4).

> 이 세션은 데스크톱 기사 세부(KAN-233 / ADR 0009)를 **모바일 스케일로 옮기는** 작업이다.
> "무엇을 만들었나"보다 **어떻게·왜 그렇게 했나**에 집중한다.

---

## 1. 목표

- 홈 "지금 올라온 소식"에서 기사를 탭하면 **기사 세부 페이지**로 진입(티켓 요구).
- 라우팅·구성은 **웹(`apps/web/app/articles/[postId]`)을 참고**, 공용 조각은 `@plick/ui`를 재사용.
- 피그마 S1을 **그대로** 재현(근사치 금지). 다크 기준·토큰 유틸만.

## 2. 구조

```
apps/mobile/app/articles/[postId]/
  page.tsx                     AppShell + ArticleTopBar + ScrollArea(ArticleBody + SuggestedArticles)
  _components/
    ArticleTopBar.tsx          뒤로가기 + 저장·공유 (TopBarShell 재사용)
    ArticleBody.tsx            칩·제목·기자·이미지·문단·태그·액션·댓글
    SuggestedArticles.tsx      "함께 보면 좋은 기사" 섹션(상단 구분선)
    SuggestedArticleItem.tsx   컴팩트 리스트 행(좌 텍스트 + 우 정사각 썸네일)
```

- 딥링크 패턴은 릴스(`reels/[postId]`)와 동일: `params` await → `getPost` → 없으면 `notFound()`.
- **전부 서버 컴포넌트.** 액션·입력·저장/공유 버튼은 정적(웹 `ArticleMain`과 동일하게 BE 연동 시 핸들러 부착). 답글 토글이 있는 댓글만 기존 모바일 `CommentThread`를 재사용한다.

## 3. 승격 없이 재사용 — "이미 다 올라가 있었다"

티켓은 "web과 함께 쓸 요소는 공통 승격"을 요구했지만, **웹 세부(ADR 0009)에서 쓰던 공용 조각이
이미 `@plick/ui`에 전부 있었다**(KAN-200·KAN-233에서 승격 완료). 그래서 이번엔 **새 승격이 필요 없었다**:

- `MediaThumb` · `ReporterTierBadge` · 아이콘(`HeartMiniIcon` `LinkOutIcon` `SaveIcon` `SendIcon` `SendMiniIcon` `ArrowLeftIcon`)을 그대로 import.
- 상단바 3개 아이콘(뒤로·북마크·공유)은 피그마 벡터를 SVG로 export해 대조한 결과 **이미 승격된
  `ArrowLeftIcon`·`SaveIcon`·`SendIcon`과 같은 노드 벡터**였다(디자인 시스템이 같은 글리프 재사용).
  → 아이콘 규칙("비슷한 아이콘 재사용 금지")은 _형태가 다른_ 근사치를 금지하는 것이므로, 동일 벡터
  재사용은 위반이 아니다(웹 `ArticleMain`도 같은 아이콘을 쓴다).

> 교훈: 승격은 "필요할 때"다. 웹이 먼저 깔아둔 공용 자산 덕에 모바일은 조립만 하면 됐다.

## 4. 웹과 다르게 둔 것 (모바일 전용)

같은 구성이라도 웹 컴포넌트를 그대로 쓰지 않고 모바일 `ArticleBody`를 새로 썼다. 이유:

| 축          | 웹 `ArticleMain`                                                    | 모바일 `ArticleBody`                                        |
| ----------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| 타입 스케일 | `text-read-title`(32) · `text-read-body`(16.5) · `text-section`(20) | `text-headline`(24) · `text-body-lg`(15) · `text-title`(17) |
| 인터랙션    | `hover:` + `focus-visible:outline` 링                               | `active:opacity` (터치)                                     |
| 원문 링크   | "출처 원문 보기"                                                    | "원문" (피그마 카피)                                        |
| 대표 이미지 | `aspect-[16/7]` `rounded-hero`                                      | `aspect-[16/10]` `rounded-card` (피그마 비율·라운드)        |
| 추천 기사   | 미디어 스크림 **카드** 3열                                          | 컴팩트 **리스트** 행(좌 텍스트+우 정사각 썸네일)            |
| 댓글        | 웹 `CommentThread`(답글 접기 토글)                                  | 모바일 `CommentThread`(답글 인라인)                         |

`CommentThread`가 앱별로 갈린 선례(ADR 0004·0009)와 같은 판단: **구성은 같아도 스케일·터치·레이아웃이
갈리면 앱별 컴포넌트가 관용**이다.

## 5. 피그마 → 토큰 매핑 (스케일 0.55)

피그마 S1 아트보드는 **0.55 스케일 프리뷰**였다(실측 = 피그마 / 0.55). 아바타로 교차검증:
피그마 17.6px → 32px = `size-8`, 답글 14.3px → 26px = `size-6.5` — 기존 모바일 `CommentThread`와
정확히 일치해 스케일을 확정했다.

- 본문 컬럼은 피그마 `flex flex-col gap-[7.7px]`(=14px) **균일 간격** → `gap-3.5` 한 컬럼으로 재현
  (웹의 `mt-3/4/5` 개별 마진 대신). 문단·댓글도 같은 컬럼에 흘려 14px 리듬을 맞췄다.
- 제목 12.65→23px(`text-headline`), 본문 8.25→15px(`text-body-lg` + `leading-body-lg`(1.75) + `tracking-snug`),
  섹션 헤딩 9.35→17px(`text-title` + `tracking-heading`). 추천 썸네일 47.3→86px ≈ `size-20`.

## 6. 라우팅 변경 — 홈 소식 리스트 → 기사 세부

- `(home)/_components/NewsItem`: `/reels/[postId]` → **`/articles/[postId]`** 로 변경.
  "지금 올라온 소식"은 읽는 기사 목록이므로 세부로 보내는 게 티켓 의도에 맞다.
- **핫이슈 캐러셀(`HotHeroCard`)은 릴스(`/reels`) 유지.** 앱 콘셉트가 "릴스형으로 넘겨보는" 것이라
  핫이슈 히어로는 릴스 진입점으로 남긴다(ADR 0002에서 의도한 동선). 릴스는 탭바로도 접근 가능.
  → 필요하면 핫이슈도 세부로 돌릴 수 있으나, 이번 스코프는 소식 리스트만 전환.

## 7. 검증

- `pnpm --filter mobile build` 클린 빌드 통과.
- 로컬 dev(:3001) 모바일 뷰포트로 피그마 대조(간격·정렬·타이포), 다크/라이트 토글, 홈→세부 이동 확인.
