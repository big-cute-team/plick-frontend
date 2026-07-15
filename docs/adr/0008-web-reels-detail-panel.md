# 0008 · 데스크톱 웹 릴스 세부 패널 (KAN-219)

> 상태: 반영됨 · 관련: [ADR 0007](0007-web-reels-screen.md)(웹 릴스 화면),
> [ADR 0004](0004-reel-detail-sheet-and-code-organization.md)(모바일 세부 시트),
> `web-publishing` 스킬

## 무엇을

피그마 **W2 기사 세부**(node 219-2)를 `apps/web/app/reels/`에 얹었다. 릴에서 **제목 영역**이나
**댓글 버튼**을 누르면 오른쪽에서 세부 패널이 미끄러져 들어온다(기자 줄 · 본문 · 해시태그 ·
출처 링크 · 댓글 · 입력바). 모바일 `ReelDetailSheet`(아래→위 바텀시트)의 데스크톱 대응 —
방향만 오른쪽→왼쪽이고 담는 내용은 같다.

## 어떻게 · 왜

### 레이아웃 — 뷰어·패널을 가로로 나누고, 릴 카드는 `w-auto`라 알아서 줄어든다

릴스 페이지는 KAN-218에서 `100dvh` 고정 + 내부 스크롤이었다(ADR 0007). 여기에 패널을 더하려고
`ReelsWorkspace`(client)를 새로 두고 헤더 아래를 `flex min-h-0 flex-1`로 감싼 뒤 **뷰어(flex-1) +
패널(shrink-0)**을 가로로 배치했다. 패널이 열리면 뷰어가 폭을 나눠 주는데, 릴 카드가 이미
`h-full w-auto max-w-full`(9:16 고정, 높이 기준)이라 **폭 계산 없이 좁아진 공간에 맞춰 저절로 축소**된다 —
카드 크기 로직을 새로 짤 필요가 없었다.

### 개폐 애니메이션 — 마지막 게시물을 붙잡아 두는 mount/leave 패턴

패널 상태는 `ReelsWorkspace`가 `activePost: FeedPost | null`로 소유하고, 제목·댓글 클릭이
`setActivePost(post)`를 부른다. 패널(`ReelDetailPanel`)은 `post`가 `null`이 되어도 **퇴장 슬라이드가
끝날 때까지 마지막 게시물을 `rendered` 상태로 붙잡고**, `transform: translateX(shown ? 0 : 100%)`를
transition으로 애니메이트한 뒤 `onTransitionEnd`에서 언마운트한다. 진입은 `rendered` 세팅 →
`requestAnimationFrame`으로 `shown=true` 플립(모바일 세부 시트의 `shown`/`onTransitionEnd`
motion과 같은 아이디어를 오른쪽 슬라이드로 단순화). `Escape`로도 닫힌다.

- 데스크톱에서 패널은 flex 슬롯을 즉시 차지(뷰어가 바로 축소)하고 그 슬롯 **안으로** 슬라이드해 들어온다 —
  "밀기 + 미끄러짐"이 자연스럽게 겹친다.

### 모바일 뷰(<lg) — 나란히 못 두니 전체 화면 오버레이

330px에선 릴과 패널을 가로로 나란히 둘 수 없다. 그래서 패널을 `fixed inset-0 z-50 lg:static`으로 두어
**모바일에선 릴 위를 덮는 전체 화면**, 데스크톱에선 인라인 카드가 된다. 요소를 **숨기는 게 아니라** 같은
패널을 폭에 맞게 펼치는 것(바텀시트가 전체 화면 시트가 되는 것과 같은 무너짐 방지 조정)이라 별도 확인 없이
진행. 카드 테두리·라운드는 `lg:`에서만 붙여 모바일은 풀블리드. 가로 오버플로 0(`scrollWidth==innerWidth`)
실측 확인.

### 재사용 — 댓글은 왜 웹 전용으로 뒀나 (승격 안 함)

모바일 `CommentThread`는 답글을 **항상 인라인**으로 펼치는 순수 서버 컴포넌트다. 반면 W2 데스크톱은
"**답글 N개 ⌄**" 토글로 답글을 **여닫는다**(client 상태 필요) + 데스크톱이라 `hover:` 상태가 붙는다.
인터랙션 모델 자체가 달라(서버 정적 vs 클라이언트 접이식) 공유 컴포넌트로 묶으면 모바일까지 client로
끌어내려야 한다 — 그래서 `@plick/ui`로 승격하지 않고 웹 `reels/_components/CommentThread.tsx`를 따로 뒀다.
`CommentItem` 프레젠테이션은 모바일과 사실상 같으니(아바타·작성자·본문·좋아요/답글 줄) **향후 통합 후보**로 남긴다.

- 이미 승격돼 있던 `ReporterTierBadge`·`icons`(`CloseIcon`·`LinkOutIcon`·`SendMiniIcon`·`HeartMiniIcon`·
  `ChevronMiniIcon`·`UserRoundIcon`)는 그대로 `@plick/ui`에서 가져다 썼다. `@plick/ui`·tokens는 **안 건드림**
  → 모바일 빌드 회귀 없음(웹 빌드만 검증).

### 목데이터·타입 — 모바일과 모양 맞춤

웹 `_lib/types.ts`에 `Comment`(+ `FeedPost.comments?`)를 모바일과 **동일 형태**로 추가하고,
`_lib/format.ts`에 `avatarInitials`를 더했다(모바일과 같은 구현 — 수동 동기화 유지). 댓글 목데이터는
피그마 W2 카피 그대로 `_lib/mock.ts`의 `SAMPLE_COMMENTS`로 만들어 대표 게시물(h1)에 붙였다.

## 막힌 곳 · 교훈

- 다른 세션의 dev 서버가 3000을 점유 중이라 `pnpm --filter web build` 후 **web-prod(3100)**로 띄워 검증했다.
- 릴스 스테이지 배경(`bg-media-stage`)은 다크 고정이라 라이트에서도 릴 무대는 어둡고 패널만
  `bg-bg`로 밝아진다 — 미디어 뷰잉 표면의 의도된 동작(토큰 그대로), 대비 양호.

## 파일

- 새로: `reels/_components/ReelsWorkspace.tsx`(패널 상태·가로 배치, client),
  `ReelDetailPanel.tsx`(오른쪽 슬라이드 패널, client), `reels/_components/CommentThread.tsx`(접이식 답글, client)
- 수정: `reels/page.tsx`(→ Workspace), `ReelViewer`·`ReelCard`·`ReelActionRail`(제목·댓글 클릭 콜백 전달, client화),
  `_lib/{types,format,mock}.ts`(Comment 타입·avatarInitials·댓글 목데이터)
