# 0188. 웹 선수 프로필을 만들고 선수 링크를 경기 상세와 인물 칩까지 이었다 (KAN-600)

KAN-599(웹 팀 프로필, [ADR 0187](0187-web-team-profile-redesign.md))에서 선수 이름에 `/players/<playerId>` 링크를 걸어 두고
"도착 화면은 KAN-600"이라고 남겼다. 이번 세션은 그 도착 화면을 만들고, 티켓의 링크 규칙에 적힌 나머지 자리(경기 상세의 득점자,
타임라인, 결장자, 라인업과 기사에 태그된 인물)까지 선수 프로필로 잇는 일이었다. 팀 프로필이 develop에 머지된 직후라 그 위에서
시작했다.

## BE와 시안 확인

BE 저장소의 `PlayerProfileController`에 세 엔드포인트가 있었다. `GET /players/{id}`(머리말과 대회별 시즌 기록),
`/matches`(소속팀 종료 경기마다 이 선수의 출전 기록), `/seasons`(최근 시즌별 기록)다. DTO 레코드 주석에서 화면에 직접 걸리는
사실을 몇 가지 건졌다.

- 프로필의 `competitions[]`는 국가대표 대회까지 전부 들어 있고 서버가 합산하지 않는다. 각 항목이 자기 `team`을 품는다.
- `ratingRank`(팀 내 평점 순위)는 소속팀 대회 항목에만 있고 실패하면 null이다.
- 경기 응답의 `score`는 "원본 홈 기준"이다. 이 선수 팀 기준으로 뒤집는 건 FE 몫이다.
- 경기마다 `participation`이 STARTED, SUB, ABSENT, UNKNOWN이고 ABSENT나 UNKNOWN이면 숫자 필드가 다 null이다.
- 경기 응답의 `cleanSheets`는 "선발이고 팀 무실점인 경기 수"인데 대회 구분 없는 시즌 합계다.
- 빅6 소속이 아닌 선수는 세 엔드포인트 모두 404 `PLAYER_NOT_FOUND`다.

dev는 여전히 API-Football 정지로 502라 mock 프로필 BE(8081)로 만들었다. mock에는 손흥민(5001, FW)과 비카리오(5003, GK) 두 명만
있어 필드 선수와 골키퍼 분기를 둘 다 볼 수 있었다.

## 팀 프로필 조각을 공용으로 올렸다

선수 화면은 팀 프로필과 같은 틀(경로 표시, 머리, 숫자 띠, 탭, 본문 + 레일 300)이다. 팀 프로필 라우트 안에 두었던
`ProfileSection`, `RailCard`, `PlayerLink`, `CompetitionPicker`를 `apps/web/app/_components/`로 `git mv`했다. 레이어 규칙상
`_components/`는 두 화면 이상이 쓰는 컴포넌트 자리이고, 이제 정확히 두 화면이 쓴다. 팀 프로필 뷰 안에 인라인으로 있던 탭 줄도
`ProfileTabBar`로 뺐다. 탭 키 타입이 화면마다 달라(`overview|matches|squad|stats`와 `overview|stats|matches`) 제네릭
`ProfileTabBar<K extends string>`으로 만들어 `onSelect`가 그 화면의 키 타입을 그대로 받게 했다.

평점 세 단계 색(`profileRatingTone` → 글자색 클래스)도 팀 선수단 표에 로컬 상수로 있던 걸 `_constants/profile.ts`의
`RATING_TONE_CLASS`로 올렸다. 개요 탭 이슈 6건, 최근 경기 5건 상수는 이름이 `TEAM_PROFILE_*`였는데 두 화면 공통이 돼
`PROFILE_ISSUE_COUNT`, `PROFILE_RECENT_COUNT`로 바꿨다. `RailCard`에는 머리 앞에 엠블럼을 둘 `icon` 자리를 더했다. 레일
"토트넘 선수" 카드가 시안상 엠블럼 18을 머리에 둔다.

## 도메인과 fetcher

팀 프로필과 같은 분리다. `@plick/domain/player-profile`에 화면 타입과 FE 계산을, `@plick/core/player-profile`에 BE 응답 타입과
fetcher 셋을 뒀다. 포지션 코드 검증(`toPositionCode`)은 팀 프로필 core에 이미 있어 export로 열어 같이 쓴다.

BE의 대회 항목은 `games`, `shots`, `goals` 같은 묶음 객체가 통째로 null일 수 있는 모양이라, 경계 변환에서 `c.games?.minutes ?? null`
식으로 평평한 필드 서른 개 남짓으로 폈다. 화면이 `stats.shots?.on` 같은 옵셔널 체이닝을 들고 다니지 않게 하려는 것이다. 퇴장은
`cards.red`와 `cards.yellowRed`(경고 누적 퇴장)를 더한 값인데, 둘 다 null이면 0이 아니라 null로 둔다. 0으로 접으면 "기록 없음"이
"퇴장 0"으로 바뀌어 빈 값 규칙이 깨진다.

국가대표 대회는 프로필과 시즌별 기록 둘 다에서 뺐다. 라이브 시즌 스탯 시트가 KAN-459에서 정한 `HIDDEN_SEASON_COMPETITION`
(`/world cup|friendlies/i`) 기준이 이미 있어서 그대로 썼다. 클럽 앱이라 대회 선택에 월드컵 예선이 섞이면 이상해서다. 대회 선택
UI와 기본값은 KAN-597이 다시 정한다.

FE가 계산하는 것은 순수 함수로 두고 `tests/unit/player-profile.test.mjs` 8건으로 경계를 잡았다.

- `per90(total, minutes)`: 합계 / 출전 분 x 90, 소수 첫째 자리. 출전 분이 null이거나 0이면 "-". 0분 나눗셈이 `Infinity`나
  `NaN`을 화면에 찍지 않게 `!minutes` 하나로 둘 다 막는다.
- `playerStatGroups(stats, isKeeper, cleanSheets)`: 기록 탭 묶음. 필드 선수는 공격, 패스, 드리블과 경합, 수비, 규율이고
  골키퍼는 골키핑, 패스, 규율이다. 패스 성공률처럼 비율인 행과 클린시트는 90분당을 비운다. "출전했는데 기록이 없는 골, 도움은 0"
  규칙(API_MAPPING 빈 값 처리의 예외)은 `appearances`가 있을 때만 null을 0으로 바꾸는 식으로 넣었다. 출전이 없으면 그대로 "-"다.
- `cleanSheetsIn(matches, competitionId)`: 골키퍼 숫자 띠의 클린시트. 처음엔 경기 응답의 `cleanSheets`를 그대로 쓰려 했는데,
  그 값은 전 대회 합계라 숫자 띠의 다른 칸(선택 대회의 실점)과 범위가 어긋난다. 리그컵을 고르면 실점은 리그컵 것인데 클린시트는
  시즌 전체가 되는 식이다. 경기 기록의 경기마다 `cleanSheet`가 있으니 선택 대회 경기만 세는 쪽으로 바꿨다. 경기 기록을 못 받으면
  null이라 "-"다.
- `usageCounts`: 레일 출전 막대. STARTED, SUB, ABSENT를 세고 UNKNOWN(그 경기 기록 조회 실패)은 뺀다. 결장으로 세면 실패가
  결장으로 둔갑한다.
- `matchResultLabel`: "승 2-1". 원본 홈 기준 스코어를 `isHome`으로 뒤집는다.
- `birthLabel`, `teammates`(본인 빼고 포지션 순, 번호 순 8명).

## 화면

페이지(서버 컴포넌트)는 두 번에 나눠 받는다. 먼저 프로필, 경기, 시즌을 `Promise.allSettled`로 함께 받고, 프로필에서 나온 소속팀
id로 선수단(같은 팀 선수)을, 연결 인물 `figureId`로 관련 이슈를 이어서 받는다. 두 번째 묶음이 첫 번째 결과에 의존해서 한 번에
못 묶는다. 경로 id는 정수 정규식(`^\d{1,10}$`)으로 거르고 아니면 not-found다.

`generateMetadata`도 프로필을 부른다. 본문과 같은 URL, 같은 `next.revalidate` 옵션의 fetch라 Next 데이터 캐시에서 한 번만
BE로 나간다. 메타데이터에서 실패하면 빈 메타데이터를 돌려주고 본문이 404, 502를 처리한다. 모바일에 선수 화면이 없어 alternate는
선언하지 않았다.

실패 처리는 팀 프로필과 한 군데가 다르다. 팀은 요약이 502여도 레지스트리 이름으로 머리를 그리고 이슈를 살렸는데([ADR 0187](0187-web-team-profile-redesign.md)),
선수는 이름을 대신할 레지스트리가 없다. 그래서 프로필 502는 경로 표시와 "선수 정보를 불러오지 못했어요, 다시 시도"만 보여 준다.
`LiveLoadError` 문구가 "경기 정보를…"으로 박혀 있어 `message` prop을 더했다. 경기, 시즌, 선수단, 이슈는 실패해도 그 영역만
다시 시도다.

클라 컴포넌트 `PlayerProfileView`가 탭과 대회 선택을 갖는다. 대회 선택을 따르는 건 숫자 띠와 기록 탭 묶음뿐이라 그 둘만 클라에서
그리고, 개요, 경기 탭, 시즌별 기록, 레일은 서버에서 그린 노드로 받는다(팀 프로필과 같은 경계). 숫자 띠가 탭 위에 있어서 대회
선택은 띠 바로 위 오른쪽에 뒀다. 대회가 하나뿐이면 그리지 않는다. `key={playerId}`로 선수가 바뀌면 탭이 개요로 돌아간다.

시안 대비 바꾼 곳이 둘 있다. 경기 탭 표 맨 앞에 라운드 열을 더했다. 티켓이 경기 표에 `round`를 넣으라고 했고, 컵대회가 섞이면
날짜만으로는 어느 대회 경기인지 모른다(날짜 칸 `title`에 대회명도 넣었다). 시즌별 기록은 시즌 x 대회 한 줄이라 팀 이름 옆에
대회명을 작게 붙였다. 시안은 대회가 하나인 가정의 표다.

부상 상태는 "부상, {injuryReason}"으로 썼다. 티켓은 `injuryType`과 `injuryReason`을 말하지만 mock과 API-Football 원본에서
`type`은 "Missing Fixture", "Questionable" 같은 결장 분류라 부위가 아니다.

## 선수 링크를 이은 자리

티켓 링크 규칙의 나머지 자리는 BE가 KAN-590에서 응답에 id를 이미 실어 두었는데 FE 경계 변환이 버리고 있었다.

| 자리                 | BE 필드                         | FE에 더한 것                               |
| -------------------- | ------------------------------- | ------------------------------------------ |
| 경기 상세 득점 요약  | `goals[].playerId`              | `MatchGoal.playerId`                       |
| 타임라인             | `events[].playerId`, `assistId` | `MatchEvent.playerId`, `MatchEvent.assist` |
| 프리뷰 결장자        | `preview.absences[].playerId`   | `Absentee.playerId`                        |
| 기사, 릴스 인물 태그 | `figures[].apiPlayerId`         | `FigureTag.apiPlayerId`                    |
| 인물 프로필          | `apiPlayerId`                   | `FigureProfile.apiPlayerId`                |

BE 응답 타입에는 이 필드들을 optional(`playerId?: number | null`)로 넣고 `?? null`로 접었다. FE가 BE보다 먼저 배포되거나 옛 BE에
붙어도 화면이 죽지 않게 하려는 것이다(라이브 `shortName` 폴백과 같은 이유).

타임라인이 제일 까다로웠다. 원래 `MatchEvent.detail`은 "J. Maddison 도움", "X 아웃" 같은 완성된 문자열이었다. 도움 선수 이름만
링크하려면 문자열을 다시 쪼개야 하는데, 문자열 파싱은 이름에 공백이 있거나 사전 한글명이 붙으면 깨진다. 그래서 경계 변환에서
`assist: { id, name, suffix }`를 따로 실었다. `detail`이 도움이나 아웃일 때만 값이 있고, 자책골이나 페널티 같은 다른 부가 설명이면
null이다. 모바일은 여전히 `detail` 문자열만 쓰므로 바뀌지 않는다. 웹 타임라인은 `assist`가 있으면 이름만 `PlayerLink`로, 뒤의
"도움"과 "아웃"은 평문으로 그린다.

라인업은 판단이 갈렸다. 티켓은 라인업 선수도 선수 프로필로 링크하라고 했는데, 당시 웹 라인업은 선수를 누르면 그 경기 스탯
다이얼로그(`PlayerMatchStatsModal`)가 열렸다. 처음엔 경기 중에 이번 경기 기록을 보던 흐름을 지키려고 클릭은 그대로 두고 다이얼로그
머리의 이름만 프로필 링크로 만들었다. 리뷰 단계에서 사용자가 라인업 클릭도 곧장 프로필로 가게 해 달라고 해서 바꿨다. 다른 자리는
전부 이름을 누르면 프로필인데 라인업만 한 단계를 더 거치는 게 어긋났다.

피치와 벤치의 `<button onClick>`을 `<Link href={playerProfilePath(id)}>`로 바꾸자 `LineupCard`에 상태가 남지 않아 `"use client"`도
뗐다(부모 `MatchDetailScreen`이 클라라 여전히 클라 번들에 들어가지만 이 파일 자체는 상태가 없다). 그 결과 경기 스탯 다이얼로그를
부르는 곳이 없어져 `PlayerMatchStatsModal`과 `usePlayerMatchStats`를 지웠다. 지우다 보니 `SeasonStatsModal`(옛 팀 선수단 칩이
열던 시즌 스탯 창)이 그 파일에서 `RetryMessage`를 빌려 쓰고 있었다. 확인해 보니 `SeasonStatsModal` 자체도 KAN-599에서 옛 선수단
칩을 지운 뒤로 부르는 곳이 없었고, 그 둘이 쓰던 `LiveModal`, `usePlayerSeasonStats`도 마찬가지였다. 넷을 같이 지웠다. core의
`getPlayerMatchStats`, `getPlayerSeasonStats`는 모바일 시트가 쓰므로 그대로다.

인물 태그는 `figureHref(figure)`(format)를 만들어 `apiPlayerId`가 있으면 `/players/<id>`, 없으면 지금처럼 `/figures/<id>`로 보낸다.
웹 기사 상세와 릴스 패널 두 곳이 쓴다. 모바일 `EntityChips`는 모바일에 선수 화면이 없어 손대지 않았다. 웹 인물 프로필 머리에는
`apiPlayerId`가 있으면 "선수 프로필" 링크를 더했다.

`PlayerLink`에는 `linkClassName`을 더했다. hover 색 같은 "누를 수 있음" 표시는 링크일 때만 붙어야 한다. id가 null이라 `<span>`으로
떨어진 이름이 hover에 초록으로 변하면 눌릴 것처럼 보인다.

## 검증

mock BE(8081) 앞에 다시 고장 주입 프록시(8083)를 뒀다. mock에 선수가 둘뿐이라 가상 id 9001~9004를 5001로 넘기면서 고장을 넣었다.

- 5001(FW): 머리(7, 공격수, 손흥민, 토트넘 링크, 1992.07.08 (34세), 183cm, 78kg), 숫자 띠(6 선발 6, 520분, 4, 2, 7.6 팀 내 2위).
  기록 탭 골 4에 90분당 0.7(4/520x90=0.69), 패스 성공률 78%에 90분당 빈칸. 리그컵을 고르면 숫자 띠(1경기 90분 1골 7.8 팀 내 1위)와
  기록 탭(90분당 1.0)이 함께 바뀐다. 경기 탭은 라운드 7R, 6R, 5R에 결장 경기는 "결장"과 나머지 "-". 레일 출전 1, 1, 1과 같은 팀
  선수(비카리오, 텔). 링크는 토트넘 팀 프로필과 `/players/5003`, `/players/5004`만.
- 5003(GK): 숫자 띠가 실점 5, 클린시트 1로 바뀌고 기록 탭이 골키핑(선방 18, 실점 5, 클린시트 1, 페널티 선방 1), 패스, 규율. 연결
  인물이 없어(`figureId` null) 관련 이슈는 빈 상태.
- 9001(프로필 502): 경로 표시와 "선수 정보를 불러오지 못했어요, 다시 시도".
- 9002(경기, 시즌 502, 보조 블록 null, 부상, 소속팀 2의 선수단 502): 키, 몸무게 "-", 생년월일 자리에 "34세", 상태 "부상, Knee Injury",
  출전 시간 "-", 팀 내 순위 줄 없음, 기록 탭 90분당 전부 "-", 최근 경기와 출전 카드는 다시 시도, 같은 팀 선수 카드는 빠짐, 소속팀은
  맨체스터 시티 팀 프로필로 링크.
- 9003(기록 없음, 소속팀 null): 숫자 띠 전부 "-", 기록 탭 "기록이 없어요", 시즌 "시즌 기록이 없어요", 같은 팀 선수 카드 없음.
- 9004(첫 경기 UNKNOWN): 그 행만 출전부터 평점까지 "-", 출전 막대에서 빠져 선발 0, 교체 1, 결장 1.
- 1(mock 404)과 `abc`: not-found.
- 링크: 경기 상세(mock 900001)에서 득점자, 타임라인 득점과 도움(Maddison, Mbeumo), 경고 선수가 `/players/<id>`, 프리뷰(900003)
  결장자 Saliba가 `/players/5006`. 라인업 피치 셋과 벤치 하나가 모두 `/players/<id>` 링크이고 손흥민을 누르면 선수 프로필로
  이동한다. mock 기사에는 인물이 없어 프록시가 기사 상세에 인물 둘을 넣었다. `apiPlayerId` 있는 손흥민은 `/players/5001`, 없는
  감독은 `/figures/102`.
- 340px: 세 탭 모두 페이지 가로 스크롤 없음. 경기 표와 시즌 표는 자기 안에서만 넘어간다.
- 팀 프로필 회귀: 네 탭, 레일 카드 넷, 선수 링크 정상.
- format:check, test:hooks(40), test:unit(66, 선수 8건 추가), lint, check-types, web·mobile build 통과.

## 남은 것

- dev가 API-Football 정지로 502라 실데이터는 못 봤다. 재개되면 국가대표 대회 필터와 대회명 표기, 실제 사진, 부상 사유 문구를 확인한다.
- 대회 선택 UI와 기본값은 KAN-597이 `CompetitionPicker` 자리를 교체한다. 국가대표 대회를 선택지에 넣을지도 그때 다시 본다.
- 모바일 선수 화면이 없어 모바일 인물 칩, 경기 상세는 여전히 선수 프로필로 가지 않는다. 모바일 선수 프로필 티켓 몫이다.
- 선수 프로필은 sitemap에 넣지 않았다. 선수 id 목록을 얻을 엔드포인트가 없다.
