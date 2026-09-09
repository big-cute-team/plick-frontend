# 0134. 라이브 지면 2차 다듬기 — 웹 상세를 네이버 스포츠식 탭·채팅 패널로, 모바일엔 스와이프와 당겨서 새로고침 (KAN-462)

2026-09-09. 브랜치 `feature/KAN-462-live-tabs-swipe`.
관련: [ADR 0127](0127-livescore-shell-web-mobile.md) 라이브 껍데기, [ADR 0131](0131-live-match-chat.md) 채팅,
[ADR 0132](0132-live-polish-today-tag-absentee-groups.md) 1차 다듬기, KAN-388 팀 스와이프(홈·기사), KAN-314 당겨서 새로고침.

## 뭘 받았나

라이브 지면을 실제로 며칠 써 본 뒤 온 두 번째 피드백 티켓이다. 일곱 줄인데 한 브랜치에서 한 번에
하라고 했다.

1. 웹 라이브 지면도 모바일처럼 탭으로 나눌 것. 지금은 아래로 너무 길다
2. 웹 라이브에 들어간 요소(선수 이름, 사진, 전부)가 너무 작다. 다 키울 것
3. 모바일 라이브 탭에서 좌우 스와이프로 날짜를 바꿀 수 있게
4. 경기 하나에 들어가서도 요약·라인업·스탯을 좌우 스와이프로 오갈 수 있게
5. 모바일 라이브 탭에서 아래로 당기면 새로고침(홈처럼)
6. 웹은 그 경기의 채팅을 항상 우측 패널에 두고 나머지만 탭으로. 탭을 옮겨도 채팅은 새로고침
   없이 계속 상호작용 가능한 상태
7. 웹 배치는 첨부한 네이버 스포츠 화면과 최대한 똑같이

첨부 이미지는 네이버 스포츠의 테니스 경기 상세였다. 왼쪽 넓은 컬럼에 파란 스코어 헤더, 그 아래
같은 날 다른 경기들의 작은 카드 줄, 그 아래 전력/중계/뉴스/영상/기록 탭과 탭 본문이 세로로
이어지고, 오른쪽 좁은 컬럼에 응원 투표 위젯과 "응원 오픈톡" 채팅 패널이 있다.

시작하기 전에 갈리는 지점 세 개를 물었다. 1번 범위는 상세만인지 대시보드(경기 목록 + 순위표)까지인지,
7번에서 같은 날 경기 스트립도 넣을지, 4번 스와이프에 채팅 탭도 포함할지. 답은 상세만, 넣는다,
포함한다였다. 대시보드는 이미 2컬럼이라 길지 않고, 광고와 응원 투표 위젯은 우리 기능이 아니라
뺐다.

## 모바일: 스와이프 페이저를 팀 탭 밖으로 꺼냈다

KAN-388에서 만든 `useTeamSwipePager`·`TeamSwipePager`가 이미 있었다. 홈과 기사 페이지의 팀
리스트를 좌우로 끌면 이웃 팀으로 넘어가는 제스처인데, 축 판정과 iOS 뒤로가기 가장자리 회피,
플릭 속도 창, 커밋 뒤 한 프레임 깜빡임 방지(`value` prop이 바뀐 뒤 `useLayoutEffect`에서 transform을
걷는 것)까지 실기기에서 다듬은 것이라 새로 만들 이유가 없었다.

문제는 이 훅이 `Filter` 타입과 `FILTER_ORDER` 배열에 묶여 있었다는 것이다. 이웃 판정을 훅 안에서
`FILTER_ORDER.indexOf(filter) + dir`로 하고 있었다. 날짜(양쪽으로 끝이 없다)와 상세 탭(상태별로
배열이 다르다)에 쓰려면 이 두 가지를 밖에서 주입받아야 했다.

그래서 훅을 제네릭으로 바꿨다. `useSwipePager<T extends string>`에 `value: T`와
`neighborOf: (value, dir) => T | null`을 받는다. `dir`이 1이면 왼쪽으로 끌 때 오른쪽에서 들어오는
다음 값, -1이면 이전 값이고, null이면 그쪽은 끝이라 감쇠 저항만 준다. 나머지 로직은 한 줄도 안
바꿨다. 파일은 `useSwipePager.ts`·`SwipePager.tsx`·`_constants/swipe-pager.ts`로 이름을 바꿨고,
홈·기사는 `_constants/team-filter.ts`에 새로 둔 `neighborFilter`를 넘기게 고쳤다. 팀 순서 배열은
그대로 그 파일에 있으니 탭 나열과 스와이프 이웃이 어긋날 일도 없다.

`SwipePager`에는 `className`·`trackClassName`을 하나 더 열었다. 채팅 패널처럼 남는 높이를 다
차지해야 하는 페인은 컨테이너와 트랙이 `flex min-h-0 flex-1 flex-col`이어야 해서다.

### 3번, 날짜 스와이프

경기 목록 페이지는 서버 컴포넌트다. `searchParams`의 `date`를 읽어 `getMatches(date)`로 씨앗을
받고 `LiveMatchesFeed`에 내려준다. 날짜의 정본은 URL이고(ADR 0127), 날짜 스트립의 칸은 전부
`<Link href="/live?date=…">`다.

스와이프 커밋도 같은 경로를 타게 했다. `LiveDatePager`가 `SwipePager`를 감싸고 `onCommit`에서
`router.push("/live?date=…")`를 부른다. 이건 리로드가 아니라 소프트 내비게이션이다. Next가 같은
라우트의 RSC 페이로드를 새 `searchParams`로 다시 요청해 서버 컴포넌트 트리만 갈아 끼우고, 클라
컴포넌트 인스턴스(페이저, 스크롤 영역)는 자리가 같으니 상태째 남는다. 서버가 새 씨앗을 내려
`date` prop이 바뀌는 순간 페이저의 `useLayoutEffect`가 transform을 걷는다.

홈은 `history.replaceState`로 URL만 바꾸고 서버를 안 거치는데 여기는 왜 push인가. 홈은 필터가
클라 상태로 파생되고 서버 씨앗은 첫 렌더에만 쓰인다. 라이브 목록도 그렇긴 한데, 이미 스트립의
Link가 push로 서버를 거치고 있어서 스와이프만 다른 경로를 타면 뒤로가기 감각이 두 갈래가 된다.
탭을 눌러 간 날짜는 히스토리에 남는데 스와이프로 간 날짜는 안 남으면 이상하다. 같은 경로로
맞췄다.

서버 왕복 동안 빈 화면이 아닌 이유는 미리보기 페인이다. 드래그가 시작되면 `renderPreview`가
이웃 날짜로 `<LiveMatchesFeed date={이웃} />`를 그린다. 씨앗 없이 들어오니 `useMatches`가 클라에서
그 날짜를 받아 스켈레톤 뒤에 목록을 그린다. 손을 떼고 스냅이 끝나면 트랙은 화면 폭만큼 밀린
채 미리보기를 보여주고 있고, 서버가 새 씨앗을 내려주면 진짜 페인이 같은 쿼리 캐시를 읽어 같은
픽셀로 교체된다. `useSuspenseQuery`는 캐시에 데이터가 있으면 `initialData`를 무시하니 서버
씨앗과 클라 캐시가 다투지 않는다.

이웃 판정은 `@plick/domain/live`에 `shiftDateKey(dateKey, delta)`를 두고 `dir`을 그대로 넘긴다.
월·연 경계는 `Date.setDate`가 넘겨 준다.

### 4번, 상세 탭 스와이프

상세는 레이아웃이 둘이다(KAN-458). 채팅 탭은 입력바를 하단에 고정해야 해서 `ScrollArea` 밖의
고정 flex 컬럼에 서고, 나머지 탭은 `ScrollArea` 안에서 헤더·탭 줄과 함께 흘러간다. 페이저를
하나로 두려면 두 레이아웃을 합쳐야 하는데, 그러면 헤더가 스크롤에서 빠지는 UX 변화가 생긴다.
합치지 않고 레이아웃마다 페이저를 하나씩 뒀다.

그러면 채팅 경계를 넘는 커밋(스탯 → 채팅)에서는 무슨 일이 생기나. `onCommit`이 `setSelected("chat")`을
부르면 React가 스크롤 레이아웃을 내리고 채팅 레이아웃을 올린다. 옛 페이저는 언마운트 정리에서
트랙 transform을 비우고 사라지고, 새 페이저는 처음부터 transform 없이 제자리에 선다. 사용자
눈에는 스냅이 끝나 화면을 가득 채운 미리보기가 진짜 채팅 패널로 갈아 끼워지는 것이다. 홈에서
미리보기가 진짜 페인으로 바뀌는 것과 같은 픽셀 교체라 튀지 않는다.

채팅 이웃의 미리보기는 진짜 `MatchChatPanel`을 쓰지 않는다. 그 컴포넌트는 마운트되는 순간
세션 URL을 받고 웹소켓을 여는데(ADR 0131), 드래그하다 말고 돌아오는 미리보기마다 접속을 열었다
닫으면 서버가 킥오프 부하 분산용으로 흩어 준 재접속 간격이 헛돈다. `MatchChatPreview`라는 메시지
줄·입력바 실루엣 스켈레톤을 대신 그린다. 소켓은 손을 떼고 확정된 뒤 진짜 패널이 붙을 때만 열린다.

채팅 레이아웃의 페이저는 `className="flex min-h-0 flex-1 flex-col"`로 남는 높이를 채운다. 안의
메시지 목록이 `overflow-y-auto`라 세로 스크롤은 그 안에서 돌고, 컨테이너의 `touch-pan-y`가 세로
팬만 브라우저에 허락하니 가로로 끌면 페이저가 가져간다.

### 5번, 당겨서 새로고침

`ScrollArea`에 `onRefresh`를 주면 되는 구조는 KAN-314 그대로다. 걸리는 건 서버 컴포넌트가 함수를
클라에 못 넘긴다는 것뿐이라 홈의 `HomeScrollArea`처럼 `LiveScrollArea`라는 클라 경계를 하나
뒀다.

경기 목록은 화면이 전부 `useMatches` 쿼리 데이터라 그 날짜 쿼리를 `refetchQueries`로 다시 받으면
끝이다. `router.refresh()`는 안 부른다. 홈은 서버 컴포넌트가 그리는 핫이슈 캐러셀이 있어 같이
갱신했지만 라이브 목록은 서버 씨앗이 첫 렌더에만 쓰인다. `refetchQueries`는 캐시를 비우지
않고 제자리에서 갱신하므로 옛 목록이 보이다 새 값으로 바뀐다. `resetQueries`였으면 씨앗이 다시
심겨 옛 목록이 스치는 KAN-379의 함정이 그대로 재현됐을 것이다.

순위표는 반대다. 서버 컴포넌트 fetch라 클라 쿼리가 없고 `router.refresh()`를 불러야 하는데,
이건 프로미스를 안 돌려준다. 스피너를 언제 멈출지 알 수 없다. `useServerRefresh` 훅에서 React
`useTransition` 안에서 `router.refresh()`를 부르고, 새 RSC 페이로드가 커밋돼 `isPending`이
내려가는 순간 대기 중인 프로미스를 풀어 준다. Next 라우터 동작이 트랜지션 안에서 불리면
완료까지 pending으로 남는 성질을 쓴 것이다. 같은 갱신이 도는 동안 다시 부르면 트랜지션만 한
번 더 걸리고 두 프로미스가 같은 커밋에서 함께 풀린다.

## 웹: 상세를 네이버 스포츠 배치로

### 1·6번, 탭과 우측 채팅 패널

예전 웹 상세는 `MatchViewTabs`로 "경기 / 채팅" 둘을 갈랐다. 경기 보기는 좌측에 득점·타임라인·라인업을
세로로 쌓고 우측 320px 레일에 스탯을 두는 2컬럼이었다. 라인업 피치 하나만 해도 세로가 길어서
페이지가 한참 내려갔고, 채팅은 탭 뒤에 숨어 경기 보기와 동시에 볼 수 없었다.

새 배치는 `lg:grid-cols-[minmax(0,1fr)_360px]` 그리드다. 좌측 컬럼에 헤더 카드 → 같은 날 경기
스트립 → 탭 줄 → 탭 본문, 우측 컬럼에 채팅 패널. 탭은 모바일과 같은 `MatchTabKey`
(`preview | summary | lineups | stats`)로 맞추고 `MATCH_TABS_BY_STATUS`도 모바일과 같게 두되
채팅만 뺐다. 채팅은 탭이 아니라 패널이니까. 탭 본문은 `MatchDetailTabs`가 그리고, 예정 경기는
프리뷰 하나뿐이라 탭 줄 없이 본문만 보여준다. 탭 하나짜리 탭 줄은 누를 게 없어 어색했다.

6번의 "패널을 옮겨도 채팅이 새로고침되지 않는다"는 별도 장치 없이 React 구조로 해결된다.
`MatchChatPanel`은 그리드의 두 번째 자식으로 늘 같은 자리에 있고, 탭 상태는 첫 번째 자식 안에서만
쓰인다. 탭을 바꿔도 채팅 패널의 element 타입과 위치가 같으니 React는 같은 인스턴스를 유지하고
소켓·메시지·입력 중인 글이 그대로 남는다. 리마운트가 없다는 뜻이다. 패널은 `lg:sticky lg:top-22`로
GNB 아래 붙어 좌측을 길게 내려도 따라온다. 높이는 `min(calc(100dvh - 7rem), 820px)`로 뷰포트에
맞추되 너무 큰 화면에서는 상한을 둔다.

연기·취소 경기는 예전엔 탭 자체가 없어 채팅도 없었는데, 패널이 상시라 자리를 비울 수 없다.
`header.status`를 보고 "연기된 경기라 채팅방이 열리지 않아요" 안내로 채운다. 패널 상단에는
네이버의 "응원 오픈톡" 헤더처럼 제목 줄을 달았다.

### 7번, 같은 날 경기 스트립

헤더 아래 작은 카드 줄은 `SameDayMatchesStrip`이다. 지금 경기의 킥오프에서 KST 날짜 키를 뽑아
(`kickoffDateKey`, 도메인에 추가) 대시보드와 같은 `useMatches` 쿼리로 그날 목록을 받는다.
대시보드에서 들어왔으면 캐시가 있어 즉시 그려지고, 아니면 스켈레톤 줄 뒤에 온다. 씨앗은 안
심었다. 상세 응답이 와야 날짜를 아는데 서버에서 상세 뒤에 목록을 직렬로 한 번 더 기다리는 건
첫 페인트를 늦추는 값이다. 그날 경기가 이 경기뿐이거나 실패하면 줄을 접는다. 지금 경기는
네이버의 빨간 테두리 대신 accent 테두리다.

### 2번, 다 키우기

수치 근거를 어디서 가져올지가 애매했다. 네이버 화면은 흰 배경 1153px 폭이고 우리는 다크 토큰이라
그대로 옮길 수 없다. 기존 값을 기준으로 한두 단계씩 올렸다. 타입 스케일은 `text-micro(10)` →
`text-label/body(12·13.5)`, `text-label` → `text-body`, `text-body` → `text-body-lg(15)`,
`text-body-lg` → `text-title(17)`, 카드 제목 `text-body` → `text-title`, 헤더 스코어
`text-read-title(32)` → `text-display(44)`. 아이콘·사진은 크레스트 20 → 28(목록), 36 → 72(헤더),
피치 선수 원 40 → 56, 결장자 사진 28 → 40, 스쿼드 사진 36 → 48, 모달 사진 48 → 64. 피치 선수 칸
폭은 80 → 112px로 넓혀 이름이 `text-body`로도 잘리지 않게 했다. 스탯 막대도 4 → 8px.

대시보드(목록 카드·날짜 스트립·순위표)도 같은 기준으로 키웠고 순위표 레일은 320 → 360px로 상세
채팅 패널과 폭을 맞췄다.

## 어디에 뭘 뒀나

- `packages/domain/src/live.ts`: `shiftDateKey`, `kickoffDateKey` 추가
- 모바일
  - `_hooks/useSwipePager.ts`, `_components/SwipePager.tsx`, `_constants/swipe-pager.ts`: 팀 스와이프를
    제네릭으로 일반화(이름 변경). `_constants/team-filter.ts`에 `neighborFilter`
  - `_hooks/useLiveRefresh.ts`(목록 쿼리 refetch), `_hooks/useServerRefresh.ts`(트랜지션으로 기다리는
    `router.refresh`)
  - `live/_components/LiveScrollArea.tsx`, `LiveDatePager.tsx`, `MatchChatPreview.tsx`
  - `live/page.tsx`, `live/standings/page.tsx`, `live/_components/MatchDetailScreen.tsx`
- 웹
  - `_types/live.ts`(`MatchTabKey`), `_constants/live.ts`(`MATCH_TABS_BY_STATUS`·`MATCH_TAB_LABEL`)
  - `live/_components/MatchTabBar.tsx`(MatchViewTabs에서), `StatsCard.tsx`(StatsRail에서),
    `MatchDetailTabs.tsx`, `SameDayMatchesStrip.tsx`
  - `MatchDetailScreen.tsx` 재배치, `MatchChatPanel.tsx` 우측 상시 패널화, 나머지 라이브 컴포넌트
    크기 조정

## 어떻게 확인했나

로컬 BE는 `FOOTBALL_API_KEY`가 없어 라이브 API가 전부 502라(ADR 0129 때와 같다) BE mock 프로필
(8081)과 저장소의 채팅 mock(8090)으로 확인했다. `API_BASE_URL=http://localhost:8081 pnpm build` 뒤
`.claude/launch.json`의 `web-chat`(3020)·`mobile-chat`(3021)으로 띄웠다. mock 고정 데이터는 900001 종료,
900002 라이브, 900003 예정이다.

웹은 실제 크롬 창에서 봤다(인앱 패널은 hidden이라 하이드레이션이 안 된다). 라이브 경기 상세에서
채팅 입력창에 글을 써 두고 요약 → 라인업 → 스탯을 눌러 봤다. 채팅 `section` 엘리먼트가 같은
DOM 노드로 남아 있고(`===` 비교) 입력값이 그대로였다. `position: sticky`로 GNB 아래 붙는 것, 같은
날 경기 스트립에 세 경기가 나오고 지금 경기에 accent 테두리가 가는 것, 예정 경기가 탭 줄 없이
프리뷰 2열로 뜨는 것, 종료 경기의 라인업 피치 확대까지 확인했다.

모바일 제스처는 iOS 시뮬레이터(iPhone 17 Pro)로 봤다. 목록에서 왼쪽으로 끌면 10일로, 오른쪽으로
끌면 9일로 돌아왔고 사파리 뒤로가기가 활성화돼 push 히스토리도 쌓였다. 상세에서는 요약 → 라인업
→ 스탯 → 채팅까지 왼쪽으로 세 번, 채팅에서 오른쪽으로 끌어 스탯으로 돌아오는 것까지 됐다. 채팅
레이아웃 경계를 넘는 두 방향 모두 튀는 프레임 없이 갈아 끼워졌다.

당겨서 새로고침은 시뮬레이터 스크린샷이 손을 뗀 뒤에만 찍혀 스피너를 못 잡는다. 크롬에서
합성 `TouchEvent`로 같은 제스처를 흘려 넣고 값을 읽었다. 목록은 끌리는 동안 `translateY(85px)`,
떼면 `translateY(56px)`에서 스피너가 돌고, `fetch`를 감싸 세어 보니 `/be/api/v1/matches?date=…`가
한 번 나갔으며 그 쿼리의 `dataUpdatedAt`이 갱신된 뒤 제자리로 돌아왔다. 순위표는 같은 제스처에
`/live/standings?_rsc=…` RSC 요청이 한 번 나가고 트랜지션이 끝나자 스피너가 멈췄다.

## 막힌 것과 남은 것

- 크롬 백그라운드 탭에서 `performance.getEntriesByType("resource")`에 fetch가 안 잡혔다. 요청 수는
  `window.fetch`를 감싸 세는 게 확실하다. 그리고 `memoizedProps.client`로 처음 잡히는 QueryClient는
  캐시가 빈 다른 인스턴스일 수 있다. 목록 링크 엘리먼트의 fiber에서 위로 올라가 잡아야 훅이 쓰는
  클라이언트가 나온다.
- 상세 탭 스와이프에서 채팅 경계를 넘을 때 페이저 인스턴스가 바뀌는 구조는 동작은 하지만,
  나중에 헤더를 고정하는 쪽으로 상세 레이아웃을 합치면 페이저 하나로 정리할 수 있다.
- 웹 크기 조정은 mock 데이터(라인업 3명)로만 봤다. 실데이터 11명 피치에서 `w-28` 칸이 좌측
  컬럼(약 800px)에 다 들어가는지는 키가 들어온 뒤 한 번 더 봐야 한다. 5명 줄이면 560px라 여유는 있다.
- 같은 날 경기 스트립은 상세 응답 뒤 클라가 받는다. 대시보드를 거치지 않고 링크로 바로 들어오면
  스켈레톤 한 줄이 잠깐 보인다.
