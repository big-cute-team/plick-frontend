# 0055. web 릴스 피드 API 이식 (KAN-323)

`GET /api/v1/reels`를 데스크톱 웹에 붙였다. 모바일은 KAN-276에서 이미 붙였으니(ADR 0032) 계약을 새로
캐낼 일은 없었고, 이번 세션의 본편은 두 가지였다. 하나는 릴스 계약 조각을 어디까지 패키지로 올릴지,
다른 하나는 사진이 전건 null인 릴을 web에서 무엇으로 채울지였다.

작업 중에 사용자 피드백을 두 번 받아 세부 패널 구조를 두 번 고쳤다. 그것도 아래에 이어 적는다.

## 무엇을 했나

web 릴스 화면은 퍼블리싱만 끝난 상태였다. `app/reels/page.tsx`가 `_mocks/posts.ts`의 `POSTS`를
`ReelsWorkspace`에 넘기고, 그 아래 `ReelViewer` → `ReelCard` → `ReelActionRail`, 그리고 오른쪽
`ReelDetailPanel`이 전부 `FeedPost`를 받아 그리고 있었다. 이걸 실계약으로 갈아탔다.

- 릴스 계약 타입 셋(`ReelCard`·`ReelFeedPage`·`InitialReelFeed`)을 모바일 `_types/reels.ts`에서
  `@plick/domain/types`로 승격
- fetcher `getReels`와 페이지 크기 상수를 모바일 `_services/reels.ts`에서 `@plick/core/reels`로 승격
- 쿼리키 `reelKeys`를 모바일 `_queries/reelKeys.ts`에서 `@plick/core/reelKeys`로 승격
- web에 `useReelsFeed` 훅을 복제하고, 서버 컴포넌트가 첫 페이지를 받아 씨앗으로 내려주는 구조를 이식
- web에 원문 트윗 임베드를 이식 (`TweetEmbed`, `/api/tweet/[id]` 프록시, `_utils/tweet.ts`, globals.css)
- `ReelCard.tsx`를 `ReelItem.tsx`로 개명하고 카드 배경을 팀 컬러 그라데이션에서 릴 공용 단색으로 통일
- 지금 보고 있는 릴을 추적하는 `useActiveReel` 훅을 새로 만들고, 그걸로 프리페치 시점과 세부 패널 내용을 정함
- 로딩(스켈레톤)·에러·빈 상태를 붙임

## 계약은 다시 캐지 않았다

`/web-wire-api` 스킬의 `web-wiring.md` §1이 말하는 그대로다. 모바일을 붙일 때는 스웨거를 못 믿어
`be-verify` 서브에이전트가 실제로 때려 봤고, 그 결과가 지금 모바일 코드에 굳어 있다. `ReelsCardResponse`
인터페이스, `toReelCard` 경계 변환, `STAGE_BY_BE_VALUE`·`TEAM_CODES` 매핑이 검증된 계약이다.
이번엔 `be-verify`를 부르지 않았다. 새 엔드포인트도 아니고 BE가 바뀐 정황도 없고 뮤테이션도 아니라
§1의 세 조건 중 어디에도 안 걸린다.

대신 모바일 코드를 그대로 읽고 옮겼다. 옮기면서 확인한 계약의 함정은 이렇다.

- 커서 페이지네이션인데 `hasNext`도 총 건수도 없다. `nextCursor`가 null인지로만 끝을 판단한다.
  마지막 페이지도 items가 꽉 차서 올 수 있어 건수로 판정하면 안 된다.
- `getNextPageParam`이 null을 그대로 돌려주면 RQ는 "커서가 null인 페이지가 더 있다"로 읽어 첫 페이지를
  무한히 다시 받는다. `?? undefined`로 바꿔 줘야 마지막 페이지로 인식한다. 모바일이 이미 겪은 함정이라
  그대로 가져왔다.
- 익명 허용 API인데 토큰이 있으면 싣는다. `likedByMe`가 토큰이 있을 때만 그 유저 기준으로 계산되기
  때문이다(KAN-308). 만료 토큰으로 401을 맞을 걱정은 없다 — access 쿠키 수명이 곧 토큰 수명이라
  만료되면 쿠키째 사라져 익명으로 부르게 된다.
- 잘못된 파라미터도 상한 커서도 똑같이 400 `COMMON_INVALID_PARAM`으로 온다. 둘을 구분할 수 없어서,
  다음 페이지에서 400을 받으면 커서를 버리고 첫 페이지부터 다시 받는다. 같은 커서로 재시도해 봐야
  계속 400이다. 대신 보던 자리를 잃는다.

## 승격 판단 (ADR 0011 게이트)

web이 두 번째 실사용처라 이번 PR이 게이트 C가 서는 시점이다. 릴스가 쓰는 조각을 하나씩 봤다.

### 올린 것

**계약 타입 셋 → `@plick/domain/types`.** `ReelCard`, `ReelFeedPage`, `InitialReelFeed`.
게이트 A(앱 역참조 없음)는 타입이라 자명하게 통과한다. 게이트 B(동일성)도 통과다 — BE가 주는 모양이
표면마다 달라질 리 없다. 게이트 C도 web이 지금 두 번째로 쓰니 통과다. `ArticleCard`가 KAN-321에서
간 자리와 같다.

옮기면서 `reporter` 필드 타입만 손봤다. 모바일에선 `{ name: string; tier: number | null } | null`로
인라인이었는데, `@plick/domain`에 이미 구조가 같은 `ArticleReporter`가 있어 그걸 쓰게 했다. 구조가
같은 인라인 타입 둘을 도메인 패키지 한 파일 안에 나란히 두는 건 그냥 중복이다.

**fetcher `getReels` → `@plick/core/reels`.** 게이트 A가 걸릴 게 없다. `apiFetch`(같은 패키지)와
`@plick/domain`만 보고 앱 내부를 전혀 참조하지 않는다. `getArticles`가 KAN-321에 간 자리와 같은 파일
이웃이다.

**쿼리키 `reelKeys` → `@plick/core/reelKeys`.** `articleKeys`가 간 이유와 같다. 키 문자열이 앱마다
갈리면 무효화 규약이 조용히 어긋난다. 지금 web은 무효화를 안 쓰지만(뮤테이션이 아직 없다) 키를 두
벌 두면 나중에 좋아요를 붙일 때 반드시 어긋난다.

### 안 올린 것

**훅 `useReelsFeed`.** `web-wiring.md`가 훅은 승격 후보에서 빼 두었고 이번에도 그대로 따랐다.
React 훅이라 core의 순수 모듈 경계 밖이고, 승격분(fetcher·쿼리키·타입)을 다 걷어내고 나면 남는 건
`useInfiniteQuery` 설정 덩어리뿐이라 복제가 싸다. `useArticleFeed`가 KAN-321에서 같은 판단을 받았다.

**캐시 정책 상수 `FEED_FRESH_MS`·`FEED_MAX_RETRIES`.** 표면별 정책이라 앱별로 둔다. web에 이미
`_constants/feed.ts`가 있어 릴스도 그걸 같이 쓴다.

**모바일 `_constants/reels.ts` 대부분.** Embla 캐러셀 옵션, 바텀시트 높이 비율, 드래그 임계값,
`REELS_REMEASURE_EPSILON` 같은 것들은 모바일 제스처 구현의 상수다. web 릴스는 CSS scroll-snap
뷰어라 쓸 자리 자체가 없다. 프리페치 시점(`REELS_PREFETCH_AHEAD = 3`)만 표면과 무관해서 web에도
같은 값으로 복제했다.

**모션 타입 `ReelDetailMotion`·`TitleMotion`.** 모바일 `_types/reels.ts`에 남겼다. 포인터 제스처
상태라 오른쪽에서 미끄러지는 web 패널과 공유할 것이 없다.

**`TweetEmbed`.** 두 번째 사용처가 생겼으니 `@plick/ui` 후보이긴 한데 이번엔 안 올렸다. 이유는
아래 임베드 절에 적었다.

`_types/reels.ts`는 계약 셋이 빠져 나가면서 파일 성격이 바뀌었다. 릴스 데이터 타입 파일이 아니라
릴스 화면 제스처 상태 파일이 됐고, 파일 헤더 주석을 그렇게 다시 썼다.

## 사진이 전건 null인 릴을 무엇으로 채울까

이번 세션에서 제일 크게 갈린 결정이다.

릴스 응답의 `reelsImageUrl`이 지금 발행 데이터 전건에서 null이다. 모바일은 이 자리를 원문 트윗
임베드로 채우기로 했고(KAN-296, ADR 0037), web에는 그 임베드가 없었다. web의 기존 퍼블리싱은
`MediaThumb`의 팀 컬러 그라데이션 placeholder였는데, 실데이터로 갈아타면 릴 열 장이 전부 색만 있는
빈 카드가 된다.

사용자에게 물었고 "트윗 임베드도 이번 PR에서 이식"으로 정해졌다. 그래서 옮긴 것들.

- `app/api/tweet/[id]/route.ts` — react-tweet의 기본 클라 엔드포인트(react-tweet.vercel.app)는
  공용 rate limit을 타므로, 트위터 신디케이션 API를 우리 서버가 직접 받아 같은 `{ data }` 모양으로
  돌려준다. 모바일과 완전히 같은 파일이다.
- `app/_utils/tweet.ts` — `sourceUrl`에서 status ID를 뽑는 정규식. 도메인 앞 경계를 시작·`/`·`.`만
  허용해 `fakex.com` 같은 걸 거른다.
- `app/_components/TweetEmbed.tsx` — 모바일의 축소판이다.
- `globals.css`에 react-tweet 테마 오버라이드.
- 의존성 `react-tweet@^3.3.1`.

### 임베드를 통째로 복사하지 않고 줄인 이유

모바일 `TweetEmbed`는 `fill`·`flow`·`reel` 세 레이아웃을 갖고, `useTweetFit` 훅과 `withoutMedia`
헬퍼를 달고 있다. 이건 홈 캐러셀과 기사 세부처럼 임베드를 고정 박스에 가둬야 하는 자리 때문이다.
X Display Requirements가 본문 수정·말줄임을 금지해서, 카드가 박스보다 크면 텍스트 대신 미디어를 빼고,
그래도 안 들어가면 transform scale로 줄인다. 그 판정을 `useTweetFit`이 ResizeObserver로 한다.

web에서 임베드가 필요한 자리는 릴 하나뿐이고, 릴은 `reel` 레이아웃만 쓴다. `reel`은 미디어를 숨기지도
축소하지도 자르지도 않고 자연 높이·전폭으로 그냥 세운다 — 원문을 사진째 보여주는 게 목적이라
flow/fill과 정반대 정책이다. 그래서 web `TweetEmbed`는 `EmbeddedTweet`을 한 번 그리는 게 전부고,
`useTweetFit`과 `withoutMedia`는 아예 안 가져왔다. 쓰지도 않을 코드를 복제해 두면 나중에 읽는 사람이
"web에도 fit 로직이 있네"라고 오해한다.

`@plick/ui` 승격을 안 한 것도 여기에 걸린다. 두 앱의 `TweetEmbed`가 지금 같은 컴포넌트가 아니다.
모바일은 세 레이아웃 + fit 로직이고 web은 한 레이아웃이다. 게이트 B(동일성)를 못 넘긴다. 게다가
데이터를 앱 라우트(`/api/tweet/[id]`)에서 받으므로 패키지로 올리면 앱 라우트 역참조가 생겨 게이트 A도
걸린다(엔드포인트를 prop으로 주입하면 끊을 수는 있다). web 임베드가 릴스 말고 다른 자리에도 쓰이게
되고 모양이 굳으면 그때 다시 본다. ADR 0011 §7 열린 후보로 남긴다.

### 임베드 영역을 재는 방식

모바일 `ReelItem`이 하던 걸 그대로 옮겼다. 임베드는 카드 맨 위부터 제목(헤드라인) 윗선까지를 영역으로
삼는다. 카드가 그 영역보다 작으면 세로 가운데에 서고(`justify-content: safe center`), 크면 위에
붙고 자기 높이만큼 그대로 서서 제목 뒤로 겹친다. 배지 줄까지는 영역에 포함돼 임베드가 그 뒤로 겹치고,
아래선은 제목 윗선을 재서 잡으므로 제목이 1~3줄로 자라면 영역이 그만큼 줄어든다.

제목 윗선은 `getBoundingClientRect`로 재고 `ResizeObserver`로 카드와 제목 둘 다 관찰한다. web에는
모바일에 있던 조건이 하나 빠졌다 — 모바일은 시트가 떠서 제목이 `translateY`로 올라가 있는 동안은
재지 않는다(`getBoundingClientRect`가 transform을 잡아서 값이 틀어진다). web 패널은 릴의 제목을
움직이지 않고 옆에서 폭만 나눠 가지므로 그 조건이 필요 없다. 대신 패널이 열려 카드 폭이 줄면 RO가
알아서 다시 잰다.

### 카드 배경을 통일했다

임베드를 넣으면서 카드 배경을 팀 컬러 그라데이션(`MediaThumb`)에서 릴 공용 단색(`bg-reel-bg`)으로
바꿨다. 선택이 아니라 사실상 강제였다. `globals.css`의 `.reel-embed .react-tweet-theme`이 트윗 카드
배경을 `--plk-reel-bg`로 물리는데, 그 뒤 바탕이 팀 컬러 그라데이션이면 트윗 카드가 배경 위에 네모로
떠 보인다. 모바일이 KAN-296에서 정확히 같은 이유로 그라데이션을 걷어냈다.

그래서 web `ReelItem`은 `MediaThumb`을 안 쓴다. 사진이 있으면 `<img>`로 카드를 덮고, 없으면 임베드가
자리를 대신한다 — 모바일 `ReelItem`과 같은 구조다.

## 화면을 실계약에 맞추며 깨진 것들

`FeedPost`가 전제하던 필드가 실계약에 없어 하나씩 고쳤다.

- `post.team` 단일 → `reel.teams[0]`. 다중이고 아예 없을 수 있어 첫 팀만 대표로 쓰고, 없으면 로고를
  뺀다. `TEAMS[post.team]`처럼 무조건 인덱싱하던 자리가 전부 null 분기가 됐다.
- `PostChips`(텍스트 칩) → `PostBadges`(구단 로고 + 알약 없는 단계 글자). 모바일 릴이 KAN-299에서
  바꾼 표시이고 web 기사 세부도 KAN-322에서 따라갔다. 릴만 텍스트 칩으로 남아 있을 이유가 없다.
- `post.timeLabel`("2분 전" 문자열) → `formatRelativeTime(reel.publishedAt)`. 서버·클라 렌더 시각이
  달라 hydration 경고가 뜨므로 `suppressHydrationWarning`을 단다.
- `post.reporter`가 항상 있다는 전제 → null 가능. 없으면 기자 이름·티어 배지를 빼고 발행 시각만 남는다.
- `post.tags` → `reel.hashtags`.
- `post.saved` → 계약에 없다. 액션 레일의 저장 버튼을 뺐다(모바일 KAN-299와 같은 판단).
- `post.comments` → 계약에 없다. 댓글은 별도 엔드포인트라 카운트와 빈 상태만 둔다. 기사 세부가
  KAN-322에서 한 처리와 같다.

좋아요는 응답값을 그리기만 한다. 누르는 동작은 뮤테이션 이식 티켓 몫이다.

### 컴포넌트 이름 충돌

web의 릴 한 장짜리 컴포넌트 파일명이 `ReelCard.tsx`였는데 도메인 계약 타입 이름도 `ReelCard`다.
`ReelViewer`가 컴포넌트와 타입을 둘 다 import해야 해서 정면으로 부딪혔다. 타입에 별칭을 붙이는 것도
방법이지만 다섯 파일에 별칭이 퍼지면 그게 더 헷갈린다. 모바일은 컴포넌트가 `ReelItem`, 타입이
`ReelCard`로 이미 갈라져 있어서 web도 같은 이름으로 맞췄다. `git mv`로 개명해 히스토리를 살렸다.

## 프리페치를 어떻게 걸까 — 두 번 갈아엎었다

모바일은 Embla 캐러셀이 "지금 몇 번째 슬라이드"를 알려주므로, 지금 보고 있는 릴 뒤로 세 장 남으면
다음 페이지를 당긴다. web은 CSS scroll-snap 뷰어라 그 정보가 없다.

처음엔 web에 이미 있는 `useInfiniteScroll`(IntersectionObserver 감시 요소)을 재활용했다. 그런데
리스트와 달리 릴 한 장이 뷰어를 통째로 채워서, 감시 요소를 리스트 끝에 두면 마지막 릴에 도착해서야
요청이 나간다. 그래서 끝에서 세 장 앞선 섹션 안에 감시 요소를 심는 식으로 우회했다. 돌긴 도는데
"몇 번째 릴에 감시 요소를 심는다"는 계산이 컴포넌트에 노출돼 읽기가 나빴다.

두 번째 피드백(아래)을 받고 어차피 활성 릴을 알아야 하게 되면서 갈아엎었다. `useActiveReel` 훅이
각 릴 섹션을 `IntersectionObserver`로 관찰해 화면을 60% 이상 차지하는 릴을 활성으로 잡는다. 그러면
프리페치도 모바일과 똑같이 `remaining <= REELS_PREFETCH_AHEAD`로 쓸 수 있어서 감시 요소가 통째로
사라졌다. 결과적으로 web 릴스가 모바일 `ReelsFeed`와 같은 모양이 됐다.

훅에서 한 가지 짚어 둘 것은 인덱스를 ref 콜백 인자로 넘기지 않고 `data-reel-index`로 넘긴 것이다.
`ref={(el) => register(i, el)}`처럼 인덱스를 클로저로 묶으면 릴마다 매 렌더 새 콜백이 생기고,
React는 ref 함수가 바뀌면 이전 ref를 떼고 새로 붙인다. 그때마다 `unobserve` → `observe`가 돌아
관찰이 계속 새로 걸린다. 콜백 하나를 `useCallback([])`으로 고정해 두고 인덱스는 DOM에서 읽으면
그 churn이 없다.

## 세션 중 피드백 두 건

### 1. 세부 패널 구조를 모바일과 맞춰 달라

댓글 입력바 왼쪽의 사람 아이콘 아바타와 "팬 반응 남기기…" placeholder를 없애 달라는 요청이었다.

web `CommentComposer`는 `withAvatar` prop으로 아바타 원을 켤 수 있었고 릴 세부 패널이 그걸 켜고
있었다. 모바일은 아바타가 아예 없고 placeholder도 KAN-307에서 없앴다. prop을 남겨 두면 아무도 안 켜는
분기만 남으므로 `withAvatar`를 통째로 지웠다. placeholder를 지우면서 인풋에 `aria-label="댓글 입력"`을
달았다 — placeholder가 접근성 이름 역할도 겸하고 있었어서 그냥 지우면 스크린리더가 읽을 이름이 없어진다.

같이 정리한 게 하나 더 있다. 기존 패널은 댓글 입력바를 하단 고정 바(`border-t bg-nav`)로 두고 본문만
스크롤시켰는데, 모바일 시트는 입력바를 댓글 헤더 바로 밑에 두고 본문과 같이 스크롤시킨다(KAN-307).
패널도 그 순서로 바꿨다 — 본문 → 태그·출처 → 댓글 헤더 → 입력바 → 목록.

### 2. 패널을 켜 둔 채 다음 릴로 넘기면 패널 내용이 안 바뀐다

맞는 지적이었다. 원래 구현은 `activePost` 상태에 열 때 고른 릴 객체를 통째로 담았다. 릴을 넘겨도
그 객체는 그대로라 패널만 이전 릴에 머문다. 화면의 릴과 패널이 어긋난 채 남는 건 명백히 버그다.

고친 방향은 상태를 "무엇을 보여줄까"에서 "열려 있나"로 줄이는 것이다. 패널 소유자는 `detailOpen`
불리언만 들고, 무엇을 그릴지는 `useActiveReel`이 잡은 활성 릴이 정한다.

```tsx
<ReelDetailPanel
  reel={detailOpen ? (reels[activeIndex] ?? null) : null}
  onClose={() => setDetailOpen(false)}
/>
```

릴 객체를 상태로 붙들지 않으니 어긋날 자리가 없다. `ReelItem`의 `onOpenDetail`도 인자가 없어졌다 —
클릭은 어차피 보이는 릴에서만 일어나므로 어떤 릴인지 알려줄 필요가 없다.

패널 안쪽의 `rendered` 상태는 그대로 뒀다. 이건 다른 목적이다. 닫힘 애니메이션이 도는 300ms 동안
내용이 사라지면 빈 카드가 접히는 게 보이므로, 마지막 릴을 붙들어 둔다.

## 검증

계약은 모바일과 같은 코드를 쓰는 것으로 갈음했다(`web-wiring.md` §1). 화면은 dev(:3000) + 로컬
BE(:8080)로 직접 밟았다.

- 성공: 릴 열 장이 실데이터로 뜨고 트윗 임베드가 미디어 자리를 채운다. 배지(MUN 로고 + OFFICIAL),
  제목, 기자·상대 시각, 레일 카운트가 응답값 그대로다.
- 세부 패널: 제목 클릭 → 오른쪽에서 열림. 기자 줄·조회수·요약·해시태그·출처 원문 링크·댓글 카운트가
  실데이터다. 패널을 켜 둔 채 다음 릴로 넘기니 내용이 따라 바뀐다(피드백 2 확인).
- 페이지네이션: 8번째 릴로 이동하니 섹션이 10 → 20으로 늘었다. 프리페치가 걸린다.
- 에러: `size=999`(BE 상한 30 초과 → 400)로 임시 조작해 "릴스를 불러오지 못했어요." + 다시 시도
  버튼을 확인하고 되돌렸다.
- 빈 상태: queryFn이 빈 페이지를 돌려주게 임시 조작해 "아직 올라온 릴스가 없어요."를 확인하고 되돌렸다.
- 반응형: 1280 데스크톱에서 카드 + 카드 밖 레일, 330px에서 카드가 폭을 꽉 채우고 레일이 카드 안
  오버레이로 들어가며 패널이 전체 화면 오버레이로 뜬다.

로딩 스켈레톤은 화면으로 못 밟았다. 서버가 첫 페이지를 씨앗으로 심어 주는 게 정상 경로라 `isPending`이
사실상 서버 fetch 실패 + 클라 재요청 중일 때만 서고, 로컬 BE가 빨라서 그 순간을 잡지 못했다.

패키지를 건드렸으므로 `pnpm --filter web build`와 `pnpm --filter mobile build`를 둘 다 돌려 통과시켰고
`check-types`, `lint`, `format:check`도 통과했다.

## 남은 것

- `POSTS` 목데이터를 못 지웠다. 릴스는 떠났지만 홈 핫이슈(`HOT_POSTS`)와 사이드바 실시간 인기
  (`TRENDING_POSTS`)가 아직 그걸 슬라이싱해 쓴다. `articles/hot`을 붙이는 티켓에서 같이 지운다.
  그때 `FeedPost`와 부속(`Comment`, `Debate`)도 마지막 소비자가 사라지면 `@plick/domain`에서 뺀다.
- web `CommentThread`가 소비자를 잃었다. 릴 세부 패널이 유일한 사용처였는데 댓글 목록을 빈 상태로
  바꾸면서 아무도 안 쓴다. 지우지 않고 뒀다 — 댓글 API 이식 티켓이 곧 이 자리를 채우는데, 그때
  모바일 `CommentList`처럼 실계약 타입으로 다시 쓰게 된다.
- 좋아요·공유·조회수 기록은 전부 뮤테이션이라 이번에 안 붙였다. 레일 버튼은 표시 전용이다.
- 모바일에 있는 릴 조회 기록(`useArticleView`)도 안 붙였다. 조회수 API 이식 티켓 몫이다.
- `TweetEmbed`의 `@plick/ui` 승격은 보류. 위 임베드 절에 이유가 있다.

## 참고

- [ADR 0032](0032-mobile-reels-feed-api.md): 모바일 릴스 피드 API 연결(계약 원본)
- [ADR 0037](0037-reels-final-embed-strategy.md): 릴스 트윗 임베드 전략
- [ADR 0011](0011-shared-code-boundary.md): 공용 경계 게이트
- [ADR 0053](0053-web-articles-feed-api.md), [ADR 0054](0054-web-article-detail-api.md): 앞선 web 이식
