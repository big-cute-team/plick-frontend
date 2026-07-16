# 0009 — 데스크톱 웹 기사 세부 페이지 (KAN-233)

> 홈·기사 목록에서 기사를 선택하면 진입하는 데스크톱 기사 세부 화면.
> 피그마 W11(node 293-2). 라우트 `/articles/[postId]`.

## 무엇을

- `apps/web/app/articles/[postId]/` 신설 — 동적 라우트로 `postId`를 받아 `POSTS`에서 기사를 찾아 렌더.
  - `page.tsx` — GNB(`SiteHeader`) + `PageContainer`(max-w-page) + 본문/사이드바 2열 그리드 + 하단 추천 행.
  - `_components/ArticleMain.tsx` — 칩·제목·기자 라인·대표 이미지·본문 문단·태그·액션·댓글.
  - `_components/ArticleSidebar.tsx` — 관련 기사 + 실시간 인기(우측 sticky).
  - `_components/SuggestedArticles.tsx` + `SuggestedArticleCard.tsx` — "함께 보면 좋은 기사" 3열 미디어 카드 행.
- `packages/tokens/theme.css` — 기사 읽기 스케일 토큰 2개 추가: `text-read-title`(32px, 제목)·`text-read-body`(16.5px, 본문).
- `FeedPost`에 `body?: string[]`(본문 문단) 추가 — 웹·모바일 `types.ts` 양쪽 동기화. 웹 mock `h1`에 3문단 채움.

## 어떻게 · 왜

- **피그마 0.45 배율.** 데스크톱 프레임 값은 전부 ÷0.45로 실측을 구했다(헤더 컨테이너 540→1200=max-w-page,
  px 14.4→32=px-gutter로 교차검증). 대부분 값이 기존 토큰에 정확히 맞았고(nav 14.5=text-gnb,
  섹션 20=text-section, 본문 문단 자간 -0.1=tracking-snug, 행간 1.75=leading-body-lg), **딱 두 값만**
  기존 스케일 밖이었다 — 제목 32px·본문 16.5px. 이 둘은 "기사 읽기" 전용 시맨틱 값이고
  (max-w-read·leading-body-lg가 이미 기사 본문을 겨냥해 만들어져 있었다) 반복되므로,
  임의 `text-[..px]` 대신 **theme.css 토큰으로 승격**했다(스킬 §1). 공유 토큰이라 모바일 빌드도 함께 확인.
- **재사용 우선 — 새로 만든 건 최소.** 화면을 쪼개 기존 구현부터 뒤졌다:
  - `SiteHeader`·`PageContainer`(KAN-200), `MediaThumb`·`ReporterTierBadge`(@plick/ui),
    `CommentThread`(웹 릴 세부, KAN-219), `formatCount`, `TEAMS` 레지스트리를 그대로 가져왔다.
  - **댓글은 `@/reels/_components/CommentThread`를 그대로 재사용.** 피그마는 답글을 펼친 상태로 그렸지만,
    이 컴포넌트는 "답글 N개" 토글로 접는 **웹 확정 패턴**(KAN-219, [ADR 0008](0008-web-reels-detail-panel.md))이라
    그 결정을 따랐다(근사 재현이 아니라 이미 내려진 UX 결정 승계).
  - 관련 기사·실시간 인기 랭킹은 홈 `HomeSidebar`의 마크업 패턴을 따르되, 조합(관련+인기)이 달라
    라우트 전용 `ArticleSidebar`로 뒀다.
- **아이콘 새로 안 만듦.** "공유" 글리프를 피그마 노드(293:117)에서 SVG로 뽑아보니 **종이비행기 = 기존
  `SendIcon`과 동일 벡터**(선굵기 비율 0.079 일치)였다. 근사 대체가 아니라 같은 벡터임을 확인하고 재사용
  (아이콘 벡터 규칙 준수). 하트=`HeartMiniIcon`, 저장=`SaveIcon`(북마크), 원문 링크=`LinkOutIcon`.
- **레이아웃.** 본문(1fr) + 사이드바(320px) 2열, `lg`(1024) 미만은 사이드바 `hidden lg:flex`로 숨기고
  1열 스택 — 홈과 같은 규칙. 사이드바를 감출지는 **사용자에게 확인**하고 진행(스킬 §3 경고). 하단
  "함께 보면 좋은 기사"가 모바일에서 관련 콘텐츠를 대신 제공하므로 사이드바 숨김이 중복도 줄인다.
- **데이터 주도.** 관련·추천·인기 목록은 하드코딩이 아니라 `POSTS`에서 현재 기사를 뺀 나머지를 슬라이스
  (어떤 기사로 들어와도 동작). 좋아요 수는 mock의 `likeCount`를 그대로 표시(피그마 카피 1.2K는 시안 값).

## 검증

- 클린 빌드: `pnpm --filter web build` + (공유 토큰·타입 건드려) `pnpm --filter mobile build` 둘 다 통과.
- 데스크톱(1280) 스크린샷으로 피그마 대조 — 간격·타이포·정렬 일치. 다크/라이트 토글 토큰 정상 전환.
- 모바일 330px: 가로 오버플로 0(`scrollWidth==innerWidth`), 사이드바 숨김, 추천 카드 1열 확인.
  (스크롤 후 프리뷰 스크린샷이 검게 나오는 이슈는 뷰포트를 문서 높이로 키워 1샷 촬영 + `getComputedStyle`
  수치 병행으로 우회 — [ADR 0005](0005-web-home-and-ui-promotion.md) §7.)

## 후속 — 진입 링크 연결

기사 세부 페이지 신설 뒤, **홈·기사 목록에서 기사를 클릭하면 기사 세부로 가야 한다**는 요구에 맞춰
진입 링크를 `/reels/[postId]` 딥링크 → `/articles/[postId]`로 전부 교체했다:
`HotCard`(핫이슈)·`PostListItem`(홈 소식·기사 목록 공용)·`HomeSidebar` 실시간 인기 랭킹.
(`/reels`는 릴스 전용으로 남고, 기사 카드 클릭은 이제 세부 기사로 간다.) 홈에서 클릭 → `/articles/h2`
등 정상 이동 확인.

## 후속 — 라이트 모드 릴 뷰어 배경 버그 (같은 세션 발견)

릴스 화면을 라이트로 두면 뷰어 레터박스가 검은 밴드로 남아 "높이가 안 채워지고 배경이 안 맞는다"는
제보. 원인은 **`--plk-media-stage`에 `[data-theme="light"]` 오버라이드가 없어** `:root` 다크값
(`#0b101d`)으로 폴백된 것(이번 브랜치와 무관한 KAN-218 잔여 이슈). 9:16 릴 카드가 세로를 못 채우는
자리를 이 stage가 메우는데, 라이트에서 그게 어두우니 검은 띠로 보였다. 다크에서 stage가 media-bg와
같은 값인 관계를 라이트에도 적용(`#dfe4ec`)해 해소. 다크값은 그대로. 공유 토큰이라 모바일 빌드도 확인.

추가로 **큰 화면에서 릴 카드가 세로를 못 채우던 문제**도 제보 — `ReelCard`의 MediaThumb에 걸린
`max-h-[760px]` 캡 때문에 가용 높이가 760을 넘는 화면(예: 1920×1080)에선 카드가 760에 멈추고
`items-end`로 하단 정렬돼 위쪽에 빈 stage가 남았다. 캡을 제거해 `h-full`이 가용 높이를 그대로 채우게
했다(1920×1080 기준 760→935). 높이가 760 미만인 일반 뷰포트·폭 제약이 걸리는 모바일은 영향 없음.

## 관련

- 재사용/승격 절차·데스크톱 토큰 → `web-publishing` 스킬, [ADR 0005](0005-web-home-and-ui-promotion.md)
- 기사 목록(진입 출발점) → [ADR 0006](0006-web-articles-page.md)
- 댓글 스레드 패턴 → [ADR 0008](0008-web-reels-detail-panel.md)
