# 0230. 투표 화면에 승부예측 시즌 랭킹 탭을 붙인다 (KAN-701, 웹과 모바일 함께)

## 티켓

KAN-701은 "[FE] 웹 예측 랭킹 화면 연동"이다. 투표 탭 아래 랭킹 탭을 만들고 `GET /predictions/rankings`로 시즌
랭킹과 내 순위를 보여 준다. 완료 조건은 투표 탭 하위 랭킹 탭 신설, 1~3위 강조와 무한 스크롤, 하단 고정 내
순위(비로그인은 `me: null`이라 숨김), `qualified: false`면 "n경기 더 예측하면 랭킹에 올라요"(`remaining`),
`qualified: true`인데 `rank: null`이면 집계 중 표시(정산 직후 잠깐), 정산 결과 배너와 홈 헤더, MY에서 진입,
dev API 검증이다. 참고에 "`scope`는 네 자리 연도나 `ALL`만 받고 생략하면 이번 시즌", "정산 5경기가 쌓이기
전에는 목록이 비어 있어 빈 상태 화면이 필요하다"가 있다.

KAN-700까지 끝난 상태에서 사용자가 "KAN-701 보고 웹, 모바일 모두 진행해"라고 했고 시안 폴더를 다시 줬다.
브랜치는 develop에서 새로 땄다. 시안 가이드 §2 R1과 §5.7이 이 화면의 규칙이고, 앱 v2 시안 1350-1388행과
홈 v2 시안 1427-1458행이 마크업 원본이다.

## 무엇이 이미 있었나

KAN-695가 랭킹 타입(`PredictionRankRow`, `MyPredictionRank`, `PredictionRanking`)과 fetcher
`getPredictionRankings`, 쿼리 키 `rankings(scope)`, 신선도 상수 `PREDICTION_RANKING_STALE_MS`(10분)를 깔아
뒀다. 적중 `19/25` 표기 `formatPredictionHits`도 있었다. 홈 제목 줄의 `128위`(KAN-700)와 예측 탭 상태 줄은
"랭킹 화면이 생기면 링크로 바꾼다"고 주석에 남겨 둔 자리였다. 그러니 이번 일은 화면 하나와 진입점 셋이다.

## 어디에 무엇을 두었나

- `@plick/domain/prediction`: 자격 기준 `PREDICTION_RANKING_MIN_SETTLED`(5), 시즌 라벨 `predictionSeasonLabel`
  (`2026` → `2026-27 시즌`, `ALL` → `통산`), 연속 칸 `predictionStreakLabel`(3 이상만 숫자), 강조 판정
  `isPredictionTopRank`, 내 순위 칸 `predictionMyRankCell`(`3/5`, `-`, `128`), 내 순위 안내
  `predictionRankingNotice`. 테스트 `tests/unit/prediction-ranking.test.mjs` 5건.
- `@plick/core/predictions`: `getPredictionRankings`의 `scope` 기본값 `"2026"`을 지웠다. 비우면 쿼리를 안 붙여
  BE가 이번 시즌을 고른다. 쿼리 키도 `rankings()`가 `season`으로 접힌다.
- 두 앱의 투표 탭 타입을 `DebateListTab`("open" | "closed")과 `DebateTab`(거기에 "rank")으로 갈랐다. 목록을
  가르는 상수(`DEBATE_LIST_HEADING`, `DEBATE_EMPTY_COPY`)는 `DebateListTab`만 받고 탭 줄(`DEBATE_TABS`)과
  URL 변환(`debateTabFrom`, `debateTabPath`)만 "rank"를 안다.
- 앱마다 훅 `usePredictionRankings`(무한 쿼리)와 컴포넌트 `debates/_components/PredictionRanking`.
- 진입점 셋. 홈 승부예측 제목 줄의 `128위 >`(비로그인은 `랭킹 >`)가 `Link`가 됐고, 예측 탭 상태 줄에 SETTLED면
  `랭킹 >`이 붙고, 모바일 MY에 `예측 랭킹  128위 >` 줄(`MePredictionRankRow`)이 계정 줄 위에 섰다.

## 왜 연도를 코드에 박지 않았나

fetcher 기본값이 `"2026"`이었다. 이대로 두면 내년 8월에 누군가 이 숫자를 고쳐야 하고, 안 고치면 랭킹이
지난 시즌에 멈춘다. 티켓 참고가 "생략하면 이번 시즌"이라 했으니 FE는 scope를 보내지 않는 게 맞다. 응답에
`scope`가 실려 오니 시즌 라벨(`2026-27 시즌`)은 거기서 만든다. 쿼리 키는 문자열이 있어야 해서 `season`으로
접었다. 통산(`ALL`)은 시안에 토글이 없어 이번에는 길만 열어 두고 화면에 두지 않았다.

## 표는 왜 `<table>`이 아닌가

시안이 고정 높이(앱 48, 웹 44)의 그리드 행이고 머리글과 내 순위 줄이 같은 칸 구성이다. 웹은 내 순위 줄이
표에서 14px 떨어져 붙고 앱은 아예 화면 하단에 고정이라, `<table>`로 만들면 내 순위 줄을 표 밖으로 꺼내는 순간
칸 폭이 어긋난다. 그래서 같은 `grid-template-columns` 문자열(`GRID`)을 머리글, 행, 내 순위 줄이 나눠 쓰는
그리드로 갔고 `role="table"`, `role="row"`, `role="columnheader"`, `role="cell"`을 달아 보조기술이 표로 읽게
했다. 칸 폭은 시안 px를 rem으로 옮겼다(`html { font-size: 110% }` 배율을 따라야 해서다. apps/CLAUDE.md).

웹은 330px 최소 기준선이 걸렸다. 시안 폭(48, 90, 90, 70에 간격 10)을 그대로 두면 `PageContainer` 거터 56px을
뺀 274px에 숫자 칸만 372px이라 닉네임 칸이 0으로 접히고 가로 스크롤이 생겼다. `sm` 아래에서는 숫자 칸을
2rem, 3rem, 3rem, 2rem에 간격 6px로 좁혔다. 닉네임이 `축…`까지 줄지만 칸을 빼지는 않았고 `scrollWidth`가
`innerWidth`와 같은 330이다. 머리글 `닉네임`이 두 줄로 꺾이는 것도 봐서 머리글 칸에 `whitespace-nowrap`을
줬다.

## 하단 고정 내 순위 줄

앱 시안은 내 순위 줄이 탭 바 위에 붙어 있다. 투표 화면은 `AppShell` 안에 `ScrollArea`(스크롤 컨테이너)가
있고 그 안에 탭 줄과 목록이 산다. 탭 상태는 `DebatesFeed`가 `useDebateTab`으로 URL에서 읽는데, 이 훅은
인스턴스마다 자기 상태를 들고 `selectTab`이 다른 인스턴스에 알리지 않는다. 내 순위 줄을 `ScrollArea` 밖
(`DebatesScreen`)에 두려면 탭 상태를 스토어로 올려야 한다.

그 대신 `sticky bottom-0`을 썼다. sticky는 가장 가까운 스크롤 컨테이너의 스크롤포트 가장자리에 붙으니
`ScrollArea` 안 마지막 자식에 두면 목록을 내리는 동안 탭 바 위에 붙어 있다. 그래서 `DebatesFeed`에서 랭킹
탭일 때는 `px-edge` 섹션 밖에 `PredictionRanking`을 바로 두고, 컴포넌트가 목록 섹션과 내 순위 줄을 형제로
돌려준다. 목록이 짧으면(지금 mock은 6명) sticky 요소가 제 자리, 즉 목록 끝에 놓인다. 시안의 "고정"과 다른
순간이지만 실서비스에서 50명 한 페이지가 차면 늘 하단이다. 비로그인은 `me: null`이라 줄이 없다.

## 집계 중을 어떻게 보이나

티켓은 `qualified: true`에 `rank: null`이면 "집계 중"이라 했다. 앱 순위 칸이 28px이라 세 글자가 안 들어간다.
칸에는 `-`만 두고 안내 한 줄(`순위를 집계하고 있어요`)을 내 순위 줄에 붙였다. 자격 미달도 같은 자리다. 시안
가이드 §5.7이 순위 칸에 `3/5`처럼 채운 정도를 적으라 하고 티켓은 `remaining`으로 "n경기 더 예측하면 랭킹에
올라요"를 적으라 해서 둘 다 했다. 칸은 `5 - remaining`을 분자로 쓴다. `record.settled`와 같아야 하지만 BE가
`remaining`을 기준으로 자격을 판정하니 그쪽을 믿는 게 안전하다. 앱은 줄 위에 안내, 웹은 표 아래 오른쪽
정렬로 둔다.

시안의 내 순위 줄에는 마이팀 엠블럼이 있는데 `me` 응답에 `favoriteTeamId`가 없다. 프로필에서 끌어올 수는
있지만 랭킹 행과 다른 출처를 섞는 셈이라 뺐다. BE가 `me`에 팀을 실어 주면 행과 같은 `TeamCrest`로 붙이면 된다.

## 왜 서버 씨앗이 없나

투표 화면은 익명 ISR(60초)이다. 랭킹은 기본 탭이 아니라 서버 HTML에 실을 이유가 없고, `me`는 사람마다 달라
실으면 안 된다. 훅은 브라우저에서만 받고 `/be` 프록시가 HttpOnly 쿠키의 토큰을 Bearer로 실어 주니 소셜
계정이면 첫 페이지에 `me`가 온다(홈 카드 KAN-700, 예측 요약 KAN-696과 같은 길). BE가 10분 캐시하는 값이라
`staleTime`도 10분이고 정산 뒤 무효화(`invalidateAfterPredictionWrite`)는 랭킹을 건드리지 않는다. 등록이나
취소로 순위가 바뀌지 않기 때문이다. `prediction-sync` 테스트가 그걸 이미 못 박아 두고 있었다.

## 진입점

홈 제목 줄은 KAN-700이 글자만 두고 간 자리다. `predictionRankLabel`이 소셜 계정에 순위가 있으면 `128위`,
아니면 `랭킹`을 주니 그 글자에 꺾쇠를 붙여 `/debates?tab=rank`로 보냈다. 비로그인도 이제 `랭킹 >`이 보인다
(가이드 §2). 앱은 글자가 작아 `py-3 -my-3`으로 터치 목표만 44px로 넓혔다. 시안 마크업(`padding:12px 0;
margin:-12px 0`) 그대로다. 예측 탭 상태 줄은 SETTLED일 때만 적중 표기 옆에 같은 링크를 둔다. MY는 앱에만
줄을 붙였다. 웹 MY 진입점은 시안이 기록 띠(적중률, 적중, 시즌 순위, 예측 수)라 KAN-702가 그 띠를 만들
때 함께 간다.

## 검증

mock BE(8081)의 `GET /api/v1/predictions/rankings`는 첫 페이지 5명에 `nextCursor`를 주고 두 번째 페이지가
1명, 세 번째는 빈 배열이다. 토큰이 없으면 `me: null`, 아무 Bearer나 실으면 `me`가 128위다. 다른 세션이 같은
작업 트리로 띄워 둔 dev-mock 서버(web 3030, mobile 3031)가 브랜치 코드를 그대로 서빙해서 브라우저 패널로
거기 접속했다.

웹 `/debates?tab=rank`는 6명이 한 번에 찼다(첫 페이지 뒤 감시 요소가 바로 보여 두 번째 페이지를 이어 받았다).
1~3위 초록 900, 닉네임 뒤 엠블럼, 적중률 700, 표 아래 내 순위 줄 128이 시안과 같았다. 네트워크에는
`/be/api/v1/predictions/rankings?size=50` 하나였다(scope 없음). 홈 제목 줄 `128위`와 경기 900001(정산, 적중)
예측 탭 상태 줄 `랭킹`이 둘 다 `href="/debates?tab=rank"`였다. 330px에서는 처음 가로 스크롤이 생겨 칸을
좁혔고, 다시 재서 `scrollWidth == innerWidth == 330`을 확인했다.

모바일 402x874에서는 랭킹 탭 목록과 내 순위 줄, 홈 `128위` 링크, MY `예측 랭킹  128위 >` 줄, 경기 900001 예측
탭의 `랭킹 >`을 봤다. MY 콘솔의 "활동 초기 로드 실패"와 "차단 목록 조회 실패"는 mock에 그 API가 없어서고
전부터 같다. 빈 상태(`아직 랭킹이 없어요`), 자격 미달 `3/5`, 집계 중은 mock이 주지 않아 도메인 헬퍼
테스트로만 봤다. dev BE는 정산 5경기가 쌓인 사용자가 아직 없을 가능성이 커 배포 뒤 빈 상태가 먼저 보일
것이다.

`pnpm lint`, `check-types`, `test:unit`(260건), `format:check`, `build`를 로컬에서 돌렸다.

## 헤드리스 리뷰가 잡은 것

`./scripts/review/pr-review.sh`는 커밋된 브랜치와 `origin/develop`의 diff를 본다. 스테이징만 하고 돌리니
"변경 파일이 없다"고 끝나서 먼저 커밋하고 다시 돌렸다. CRITICAL 0, WARN 3, INFO 3이었다.

행 key를 `userId`만 쓰면 페이지를 받는 사이 집계가 바뀌어 같은 사용자가 두 페이지에 나올 때 React가 중복
key로 경고한다는 지적은 맞아서 `rank-userId`로 바꿨다. 탭 변환(`debateTabFrom`, `debateTabPath`)에 테스트가
없다는 지적도 받아 두 앱을 함께 도는 `tests/unit/debate-tab.test.mjs` 4건을 더했다. 이 변환이 깨지면 랭킹
진입 링크 전부가 기본 탭으로 떨어지니 잡을 장치가 있어야 한다. fetcher가 scope를 생략하는지는 `apiFetch`를
막아야 해서 이번에는 브라우저 네트워크 목록으로만 봤다. 모바일 고정 줄과 탭 바가 겹치는지는 구조상 탭 바가
`ScrollArea` 밖이라 겹칠 수 없지만, 50명이 넘는 긴 목록에서 sticky가 실제로 붙는 모습은 mock 6명으로는 못
봤다. dev에 사람이 쌓이면 한 번 보면 된다. 자격 기준 5가 FE와 BE 이중 관리라는 INFO는 상수 주석에 남겼고,
두 앱의 훅과 상수가 바이트 단위로 같다는 INFO는 승부예측 훅 전부가 같은 처지라 KAN-702 뒤에 한꺼번에
승격을 판단한다.
