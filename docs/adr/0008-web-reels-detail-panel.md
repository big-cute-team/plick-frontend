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
패널(shrink-0)**을 가로로 배치했다.

### 개폐 애니메이션 — 패널을 항상 마운트, 데스크톱은 "폭"을 애니메이트해 릴을 같이 민다

패널 상태는 `ReelsWorkspace`가 `activePost: FeedPost | null`로 소유하고, 제목·댓글 클릭이
`setActivePost(post)`를 부른다. `open = post != null`.

- **왜 항상 마운트?** 처음엔 `post`가 null이면 언마운트하고 `requestAnimationFrame`으로 `shown`을
  플립해 진입을 그렸는데, **여는 애니메이션이 종종 스킵**됐다(마운트→rAF 사이 페인트가 끼면
  초기 오프셋을 브라우저가 못 보고 바로 최종값으로 점프 — 전형적인 enter-transition 레이스). 그래서
  패널을 **항상 DOM에 두고 `open` 클래스만 토글**한다 → 열 때·닫을 때 **둘 다** transition이 확실히 탄다.
  닫힘 동안 내용이 사라지지 않게 마지막 게시물은 `rendered`로 유지(언마운트 안 함), `Escape`로도 닫힌다.
- **왜 폭 애니메이션?** "패널이 열고 닫힐 때 릴도 같이 움직이게" 하려면 릴 이동이 애니메이트돼야 한다.
  패널을 마운트/언마운트하거나 `translateX`만 하면 flex 슬롯이 **즉시** 잡혀 릴이 툭 점프했다. 대신
  데스크톱은 패널 **폭 `0 ↔ 29.5rem`(카드 27.5rem + `pr-gutter`)을 transition**한다. flex 형제인
  릴 뷰어(`flex-1`)가 프레임마다 남은 폭을 갖고, 가운데 정렬된 릴 카드가 **부드럽게 밀린다**
  (패널폭+뷰어폭 = 일정, 실측 472+808 ↔ 0+1280). 안쪽 카드는 `lg:w-[29.5rem]` **고정폭**이라 폭 애니 중
  리플로우 없이 `overflow-hidden`으로 드러난다. `min-width:auto`가 0으로 풀리는 것도 `overflow-hidden` 덕.
- **모바일(<lg)**은 폭 애니가 아니라 `translateX(100%↔0)`로 미끄러진다(전체 화면 오버레이라 폭은 항상 full).
  `transition-[width,transform]` 하나로 데스크톱=폭 / 모바일=이동을 같이 커버한다.

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
