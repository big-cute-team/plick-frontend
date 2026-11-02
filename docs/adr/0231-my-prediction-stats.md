# 0231. MY에 승부예측 기록 상자와 예측 탭을 붙인다 (KAN-702, 웹과 모바일 함께)

## 티켓

KAN-702는 "[FE] 웹 MY 내 예측 기록과 적중률 연동"이다. MY 화면에 내 적중률과 순위, 예측 기록을 보여 준다.
`GET /me/prediction-stats`와 `GET /me/predictions`를 붙이고, 완료 조건은 시즌 적중률, 적중 수, 연속, 최고
연속, 순위, 통산 기록 표시, 예측 기록 목록과 무한 스크롤에 서버 순서 유지(결과 대기 먼저, 그다음 킥오프
역순), 정산 경기는 스코어와 적중 표시에 항목을 누르면 경기 상세로 이동, 랭킹 진입점, 비로그인 안내와
게스트의 빈 기록 처리, dev API 검증이다. 참고에 "두 API 모두 로그인 필요, 게스트 포함. 비로그인은 401"이
있다.

KAN-701까지 끝난 상태에서 사용자가 "KAN-702 ㄱㄱ 웹 모바일 둘다 해야해"라고 했고 시안 폴더를 다시 줬다.
브랜치는 develop에서 새로 땄다. 시안 가이드 §2 MY와 §5.8이 이 화면의 규칙이고, 앱 v2 시안 1423-1459행과
홈 v2 시안 650-676행이 마크업 원본이다. 승부예측 에픽(KAN-685)의 마지막 화면이다.

## 무엇이 이미 있었나

KAN-695가 타입(`MyPredictionStats`, `MyPredictionEntry`, `MyPredictionPage`)과 fetcher
(`getMyPredictionStats`, `getMyPredictions`), 쿼리 키(`myStats`, `myList`와 상위 키 `mine`)를 깔아 뒀고,
예측 등록·취소 뒤 무효화(`invalidateAfterPredictionWrite`)가 `mine`을 이미 다시 받는다. 훅
`useMyPredictionStats`는 KAN-700이 홈 제목 줄의 `128위`를 위해 두 앱에 만들어 뒀고, KAN-701이 모바일
MY에 `예측 랭킹  128위 >` 줄(`MePredictionRankRow`)을 세우면서 "기록 상자와 내 예측 탭은 KAN-702가
붙인다"고 주석에 남겨 뒀다. 그러니 이번 일은 기록 상자 하나, 활동 탭 하나, 그 탭의 목록이다.

## 어디에 무엇을 두었나

- `@plick/domain/prediction`: 팀 표기 `predictionTeamLabel`(빅6는 레지스트리의 짧은 이름, 그 밖은 서버
  이름. 홈 카드 `PredictionHomeCard`의 로컬 `teamLabel`을 여기로 올려 둘이 같이 쓴다), 기록 상자 네 칸
  `buildMyPredictionStatCells`, 보조 줄 `myPredictionStatsCaption`, 기록 행의 제목 `myPredictionTitle`
  (`맨유 1 - 2 맨시티` 또는 `맨유 vs 맨시티`), 둘째 줄 `myPredictionPickLine`(`내 예측 맨시티 승`), 결과 칸
  `myPredictionResultLabel`(`적중`, `빗나감`, `기록 제외`, `킥오프 전`, `경기 중`, `집계 중`). 테스트
  `tests/unit/prediction-me.test.mjs` 7건.
- 두 앱의 활동 탭 타입 `ActivityTab`에 `predictions`를 더했다. 탭 줄(`ACTIVITY_TABS`), 빈 문구
  (`ACTIVITY_EMPTY_COPY`), URL 변환(`activityTabFrom`), 서버 씨앗(`InitialActivity.predictions`)이 따라갔다.
  라벨은 시안대로 앱이 `예측`, 웹이 `내 예측`이고 둘 다 맨 끝이다.
- 앱마다 훅 `useMyPredictions`(무한 쿼리)와 컴포넌트 `me/_components/MePredictionStats`(기록 상자, 띠),
  `MyPredictionsList`, `MyPredictionRow`, `MyPredictionRowSkeleton`.
- MY 페이지(`me/(main)/page.tsx`)가 머리 아래 기록 상자를 두고, 예측 탭을 보고 있으면 서버에서
  `getMyPredictions` 첫 페이지를 씨앗으로 받는다. 모바일 `MeActivityFeed`가 탭을 가른다.

## 네 칸과 티켓의 여섯 값

티켓은 시즌 적중률, 적중 수, 연속, 최고 연속, 순위, 통산 기록을 보이라 한다. 시안의 상자는 적중률, 적중
`7/12`, 시즌 순위, 예측 수 네 칸뿐이고 연속과 통산은 자리가 없다. 가이드가 "이 문서와 시안이 다르면
시안을 따른다"라 상자는 시안 그대로 두고, 연속 적중과 최고 연속, 통산 기록을 상자 아래 보조 한 줄
(`연속 적중 1, 최고 4, 통산 31전 17적중 55%`)로 받았다. 통산은 의견 행과 같은 `formatPredictionRecord`
표기라 정산 0이면 `통산 첫 예측`이 된다. 상자를 다섯 칸, 여섯 칸으로 늘리면 앱 폭(402)에서 글자가 서로
붙는다. 보조 줄은 받은 뒤에만 그리고 상자는 받기 전에도 라벨에 `-`를 두어 높이가 흔들리지 않게 했다.

순위 칸은 `rank: null`(정산 5경기 미만)이면 `-`다. 랭킹 탭(KAN-701)은 `3/5`처럼 채운 정도를 적지만 여기는
`GET /me/prediction-stats` 응답에 `remaining`이 없어 같은 표기를 만들 수 없다. 상자를 누르면 랭킹 탭이고
거기에 안내가 있으니 상자에서는 `-`로 두었다.

## 값은 왜 브라우저에서만 받나

기록 상자의 값은 서버 씨앗 없이 브라우저가 받는다. 홈 제목 줄(KAN-700)과 예측 랭킹 줄(KAN-701)이 같은
쿼리 키(`myStats`)를 쓰니 MY에 들어오면 한 번만 가고 셋이 나눠 쓴다. MY 페이지는 토큰을 실어 서버에서
활동 개수를 받고 있어 기록도 같이 받을 수는 있었다. 안 한 이유는 두 가지다. 홈과 랭킹 줄이 이미 브라우저
경로라 MY만 서버 씨앗을 두면 같은 숫자가 두 출처를 갖게 되고, 기록은 정산 때만 바뀌어 `staleTime` 1분
동안 캐시에 남아 있으면 두 번째 방문부터는 어차피 서버 값이 쓰이지 않는다. 대신 목록은 내 댓글 탭과 같은
씨앗 규약(`useFreshSeed`, `initialData`)을 따랐다. 목록은 등록, 취소로 자주 바뀌고 첫 화면이 서버 HTML에
실리는 게 활동 탭 전체의 약속이기 때문이다.

## 게스트와 비로그인

티켓은 "게스트는 빈 기록 처리"다. BE는 게스트 토큰에도 빈 목록을 주지만, 게스트는 예측을 못 하니(작성
시트가 연동 안내로 막는다, KAN-696) 기록이 있을 수 없고 API를 부를 이유가 없다. 모바일 `MeActivityFeed`가
`useAuth`의 `isGuest`로 가르고 예측 탭에 바로 빈 상태(`아직 예측한 경기가 없어요`)를 둔다. 기록 상자는
소셜 계정일 때만 그린다. 예측 랭킹 줄과 같은 조건이고 게스트에게 `-` 네 칸을 보여 줄 이유가 없다. 웹 MY는
비로그인과 게스트를 페이지가 먼저 걸러(`LoginPromptCard`, `GuestLinkCard`) 띠와 탭까지 오지 않는다.
비로그인은 모바일이 모든 탭에 `ActivityLoginPrompt`를 두니 예측 탭도 같다.

## 기록 행과 진입

행은 전부 그 경기 상세의 예측 탭(`matchPredictionPath`, `?tab=prediction`)으로 가는 링크다. 가이드 §5.8은
"진행 중 행을 누르면 예측 탭"이고 티켓은 "정산 경기는 ... 항목을 누르면 경기 상세로 이동"이라 정산 행도
연다. 정산된 경기 상세도 예측 탭이 맨 끝에 있어(§3) 같은 경로면 된다. 시안의 `PR_HISTORY` 행이 `cursor:
default`인 건 경기 id가 없는 가짜 이력이라서다.

결과 칸은 적중 여부(`result`)가 먼저고, 무효는 `기록 제외`, 그 밖은 경기 상태로 적는다. 정산됐는데
`result`가 아직 PENDING인 틈(정산 배치 5분 사이)은 시안에 없어 `집계 중`으로 두었다. 빗나감은 가이드
§6대로 빨강이 아니라 `text-4` 회색이다.

웹 행은 시안 그리드(40, 1fr, 160, 80)를 rem으로 옮겼다. 330px에서는 네 칸이 한 줄에 못 서서 `sm` 아래는
내 예측 줄을 제목 아래로 내려 두 줄로 접고 엠블럼이 두 줄을 차지한다(`row-span-2`). 기록 띠도 처음엔 네
칸을 한 줄에 두고 패딩만 줄였는데 330px 스크린샷에서 `128위`와 `14`가 붙어 보여 `sm` 아래는 2x2로
접었다. 가로 스크롤은 둘 다 `scrollWidth == innerWidth == 330`이다.

## 검증

mock BE(8081)의 `GET /api/v1/me/prediction-stats`는 아무 Bearer나 시즌 12전 7적중 58%, 연속 1, 최고 4, 128위,
통산 31전 17적중 55%, 예측 14를 주고, `GET /api/v1/me/predictions`는 OPEN(토트넘 vs 브라이턴, AWAY),
LOCKED(맨시티 vs 코번트리), SETTLED 적중(토트넘 2 - 1 맨유), VOID(리버풀 vs 첼시, 무승부) 네 행에
`nextCursor: null`이다. 토큰이 없으면 둘 다 401이다. 다른 세션이 같은 작업 트리로 띄워 둔 dev-mock 서버
(web 3030, mobile 3031)가 브랜치 코드를 그대로 서빙해서 브라우저 패널로 거기 접속했다. 패널 세션에 이미
소셜 토큰 쿠키(HttpOnly)가 있어 `document.cookie`로 덮으려던 건 조용히 무시됐고 그냥 그 세션을 썼다.

모바일 402x874 `/me?tab=predictions`는 기록 상자 `58% / 7/12 / 128위(초록) / 14`, 보조 줄, 예측 랭킹 줄,
탭 네 개, 행 네 개가 시안과 같았다. 결과 칸은 `킥오프 전`, `경기 중`, `적중`(초록), `기록 제외`였다. 행
링크는 `/live/matches/900001?tab=prediction` 같은 예측 탭 경로였고 정산 행을 누르니 경기 900001 예측 탭
(`결과 2 - 1 Tottenham 승`, `적중`)이 열렸다. 상자의 링크는 `/debates?tab=rank`다. 콘솔의 "활동 초기
로드 실패"와 "차단 목록 조회 실패"는 mock에 `/users/me/activity`, `/users/me/blocks`가 없어서고 전부터
같다. 그 실패 때문에 `Promise.all`로 묶인 서버 씨앗이 통째로 비어, 예측 탭 첫 페이지가 서버 HTML에 실리는
길은 mock으로 못 봤다. 브라우저 조회(`/be/api/v1/me/predictions?size=20`)로 목록이 떴다.

웹 1024에서 띠는 라벨 위 값 아래 네 칸, 그 아래 보조 줄, 탭 `내 예측`, 그리드 행 네 개였다. 330px에서 띠는
2x2, 행은 두 줄로 접혔고 가로 스크롤이 없었다. 무한 스크롤은 mock이 한 페이지라 다음 페이지를 못 봤다.
게스트 빈 상태와 비로그인 안내는 mock `/users/me`가 누구에게나 `isGuest: false`라 코드로만 확인했다.

`pnpm lint`, `check-types`, `test:unit`(271건), `format:check`, `test:hooks`, `build`를 로컬에서 돌렸다.

## 헤드리스 리뷰가 잡은 것

`./scripts/review/pr-review.sh`는 CRITICAL 0, WARN 4, INFO 3이었다. 모바일 서버 씨앗이 게스트에게도
`GET /me/predictions`를 부른다는 지적은 맞았다. 화면은 게스트면 API 없이 빈 상태를 그리는데 서버만 한 번
더 부르는 셈이라 `loadInitialActivity`에 `isSocial`을 넘겨 게스트는 개수만 받게 했다. 두 앱 `ActivityTabs`
주석이 탭 셋으로 남아 있던 것과 웹 MY JSDoc의 긴 줄도 고쳤다. 모바일 탭이 넷이 되어 가로 넘침 대비가
없다는 지적은 330px에서 네 탭 오른쪽 끝이 230px이라 넘치지 않아 주석으로만 남겼다. INFO 셋은 두 앱 훅과
목록이 같은 구현이라는 것인데, 승부예측 훅 전부가 같은 처지라 에픽이 끝난 지금 한꺼번에 승격을 판단할
차례다. 이번 PR에서는 하지 않았다.
