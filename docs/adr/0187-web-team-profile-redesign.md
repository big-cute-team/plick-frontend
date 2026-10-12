# 0187. 웹 팀 프로필을 새 팀 API 넷으로 다시 짰다 (KAN-599)

에픽 KAN-586(팀, 선수 프로필 개편)의 웹 팀 프로필 화면이다. 전에 있던 웹 팀 프로필(KAN-507, KAN-567)은
머리, 숫자 4칸, 선수단 칩 트랙, "기본 정보" 카드가 전부였다. 페이지 주석에 "최근 5경기 카드와 관련 이슈 표는 팀 단위
API가 없어 뺐다", "감독, 홈구장, 창단도 API에 없어"라고 적혀 있었는데, BE가 KAN-588, 591, 592, 593으로 그 API를
다 만들어 dev에 올려 둔 상태였다. 이번 일은 디자인 핸드오프 7절의 팀 프로필(탭: 개요, 경기, 선수단, 기록 + 우측 레일)을
그 API로 채우는 것이었다.

## 시작할 때 확인한 것

먼저 BE가 정말 있는지 봤다. BE 저장소(`~/Documents/plick-backend`) develop의 `docs/PROGRESS.md`에 Phase 57(팀 프로필)이
"PR #161 develop 머지, dev 배포 완료, 스키마 변경 없음"으로 적혀 있었고, `TeamProfileController`에 `/summary`, `/fixtures`,
`/season-stats`가, `MatchController`에 확장된 `/squad`가 있었다. 응답 모양은 DTO 레코드(`TeamSummaryResponse` 등)를 직접 읽어
확인했다. 스웨거 문서보다 레코드 주석이 더 정확했다. 예를 들어 `goalsFor`와 `goalsAgainst`가 "옛 캐시면 null"이라는 건
레코드 주석에만 있었다.

그다음 dev에 실제로 쳐 봤다. 배포된 웹의 `/be` rewrite가 BE로 그대로 넘기는 프록시라 `https://dev.plick.co.kr/be/api/v1/teams/1/summary`를
curl하면 익명 GET이 읽힌다. 네 엔드포인트가 전부 502 `MATCH_UPSTREAM_ERROR`였고 원래 있던 `/standings`도 502였다.
티켓에 적힌 대로 API-Football이 일시 중지 상태다. 엔드포인트는 배포됐지만 외부 데이터가 막혀 있어서, 실데이터로 화면을
만드는 건 불가능했다.

그래서 BE를 mock 프로필로 로컬에 띄웠다. mock 프로필은 DataSource와 JPA 자동설정을 빼고 `Mock*Controller`가 고정 더미를
주는 모드라 DB 없이 뜬다. 공유 Supabase가 10월 초부터 안 붙는 상태라(메모에 남겨 둔 사실) DB가 필요 없다는 게 중요했다.

```
./gradlew bootRun --args='--spring.profiles.active=mock --server.port=8081 --management.server.port=9467'
```

`MockMatchController`에 팀 프로필 네 엔드포인트가 다 있었고, 빅6 밖 id(99)는 404 `TEAM_NOT_FOUND`를 줬다. 다만 인물 사전
`GET /api/v1/teams/{teamId}`(전 화면이 팀 이름을 받던 곳)는 mock에 없었다. 새 화면은 이름을 요약 응답에서 받으므로 그 의존을
아예 끊었다.

## 경로는 바꾸지 않았다

핸드오프 IMPLEMENTATION.md와 티켓은 신규 `apps/web/app/teams/[teamId]`를 말한다. 그런데 웹에는 이미 팀 허브
`app/(home)/teams/[slug]`가 있다. 라우트 그룹 `(home)`은 URL에 안 나오므로 둘 다 `/teams/<동적>` 자리다. Next App Router는
같은 깊이에 이름이 다른 동적 세그먼트(`[slug]`와 `[teamId]`)를 두면 빌드에서 거부한다("You cannot use different slug names for
the same dynamic path"). 허브를 옮기지 않는 한 `[teamId]`는 불가능하다.

게다가 `/teams/<slug>/profile`은 이미 색인되고 공유된 주소고, 모든 팀 링크가 `teamProfilePath(code)` 하나로 이 경로를 가리킨다.
옛 `/live/teams/[teamId]`도 여기로 308을 건다. 그래서 경로는 그대로 두고 페이지 안을 갈아엎었다. slug에서 레지스트리
`TEAM_IDS`로 서비스 teamId를 얻어 API를 부르는 흐름이다.

## 데이터 계층: domain에 타입과 계산, core에 fetcher

모바일 팀 프로필도 같은 응답을 쓰게 되므로 앱 레이어가 아니라 패키지에 뒀다(ADR 0011 게이트 C, 라이브 스코어와 같은 판단).

- `packages/domain/src/team-profile.ts`: 화면이 보는 타입(`TeamSummary`, `TeamFixture`, `TeamCompetitionStats`, `TeamSquadMember`)과
  FE가 계산해야 하는 순수 함수.
- `packages/core/src/team-profile.ts`: BE 응답 타입(파일 로컬)과 fetcher 넷, 경계 변환.

경계 변환에서 팀 참조는 라이브 스코어의 `toLiveTeam`을 그대로 탔다. BE의 `Side`는 빅6만 `teamId`가 있고 상대 팀은 null인데,
`toLiveTeam`이 `TEAM_CODES[teamId]`로 `code`를 붙여 준다. 이 `code`가 있느냐가 곧 "팀 프로필로 링크할 수 있느냐"라서,
티켓의 링크 규칙("teamId가 null인 팀은 링크하지 않는다")이 기존 `TeamProfileLink`(code가 null이면 `<span>`)로 공짜로 지켜진다.
그러려고 `core/live.ts`의 `toLiveTeam`, `parseRating`, `toForm`, `SideResponse`를 export로 열었다.

선수단은 기존 `getTeamSquad`와 같은 엔드포인트지만 그 함수는 라이브 다이얼로그용으로 확장 필드를 버린다. 모바일이 아직 그걸
쓰고 있어 건드리지 않고, 확장 필드까지 읽는 `getTeamSquadTable`을 따로 만들었다. 포지션은 BE가 이미 `positionCode`(GK, DF, MF, FW,
모르면 null)로 정규화해 주므로 옛 `toPosition`(영문 포지션 첫 글자 추측)을 쓰지 않고 그 값을 그대로 검증만 했다. 기존 함수는 모르는
포지션을 MF로 밀어 넣는데, 티켓은 "null인 선수는 마지막에 둔다"고 해서 의미가 달랐다.

fetcher의 캐시 수명은 60초로 줬다. `apiFetch`는 토큰 없는 GET을 Next 데이터 캐시에 넣는데(`next: { revalidate }`), 라이브
목록은 20초를 쓴다. 팀 프로필 값은 BE가 분 단위로 캐시하는 외부 데이터라 20초로 줄일 이유가 없었다.

FE가 계산해야 하는 것은 domain 순수 함수로 빼서 `tests/unit/team-profile.test.mjs`에 경계를 박았다.

- `roundLabel`: BE `round` 원문이 `Regular Season - 7` 같은 API-Football 문자열이라 화면 문구("7R")를 FE가 만든다. 컵대회는
  `Round of 16`(16강), `Quarter-finals`(8강), `3rd Round`(3R) 같은 변형이 있다. 모르는 형식은 null을 돌려 칸을 비운다.
  "결승"을 오판하지 않게 `^final$`만 결승으로 본다. `Semi-finals`가 `final`을 품고 있어서다.
- `standingsWindow`: 레일 순위 5팀. 이 팀을 가운데 두되 1위나 20위면 한쪽으로 치우쳐 5행을 채운다. 시작 인덱스를
  `max(0, min(len - 5, idx - 2))`로 잡으면 양 끝 처리가 한 줄로 끝난다. 이 팀 행이 없으면(승격, 강등으로 레지스트리와 순위표가
  어긋난 시즌) 빈 배열이다.
- `teamLeaders`: 서버가 팀 내 순위를 주지 않는다. 선택된 대회의 `goals`, `assists`로 정렬해 상위 3명. 0이나 기록 없음은 뺀다.
  `Array.prototype.sort`는 안정 정렬이라 동률이면 서버 순서가 지켜진다.
- `groupSquadByPosition`: GK, DF, MF, FW, null 순 묶음, 묶음 안은 등번호순(번호 없음은 뒤).
- `profileRatingTone`: 시안의 평점 색은 7.5 이상 강조, 6.8 이상 본문, 그 아래 흐린 회색 세 단계다. 라이브의 `ratingTone`(두 단계,
  7.5 미만은 warn)과 규칙이 달라 따로 뒀다.

`playedDateLabel`은 `Intl.DateTimeFormat`에 `timeZone: "Asia/Seoul"`을 박았다. 서버(UTC일 수 있음)와 브라우저가 다른 날짜를
찍으면 하이드레이션이 어긋나기 때문이다. 테스트에 `2026-10-03T16:00:00Z`가 "10월 4일"로 나오는 줄을 넣어 이걸 고정했다.

## 화면 구성과 서버, 클라 경계

페이지(서버 컴포넌트)가 요약, 경기, 기록, 선수단, 순위표, 팀 이슈 여섯 개를 `Promise.allSettled`로 한 번에 받는다. `all`이 아니라
`allSettled`인 이유는 하나가 502여도 나머지를 그려야 해서다. 실패는 `console.error`를 남기고 null로 바꿔 그 영역만 실패를 그린다.

탭과 대회 선택은 상태가 필요해 클라 컴포넌트(`TeamProfileView`)가 갖는다. 여기서 고민한 게 무엇을 클라로 넘기느냐였다.
개요(이슈, 최근 경기)와 경기 탭, 레일의 순위, 구단 정보, 부상자는 대회와 무관하다. 이건 서버에서 다 그린 React 노드를
`overview`, `matches`, `railTop`, `railBottom` prop으로 넘겼다. 서버 컴포넌트가 만든 JSX는 직렬화된 RSC 페이로드로 클라 컴포넌트의
children/prop 자리에 꽂히므로, 클라는 탭 전환 때 보였다 숨겼다만 하고 그 내용을 다시 렌더할 코드를 번들에 싣지 않는다.
대회 선택을 따라 바뀌어야 하는 선수단 표, 기록 탭, 레일의 팀 내 순위만 데이터를 prop으로 받아 클라 쪽에서 그린다.

탭은 URL에 올리지 않았다. 시안이 "탭은 프로필을 열 때마다 개요로 초기화"라서 컴포넌트 상태가 맞다. 팀 A 프로필에서 상대 팀
B를 눌러 같은 라우트로 이동하면 App Router가 같은 레이아웃 트리를 재사용하면서 상태가 남을 수 있어 `key={slug}`를 걸어
팀이 바뀌면 새로 마운트되게 했다.

대회 선택은 KAN-597이 정할 몫이다. 이 티켓은 "선택된 대회 값을 받아 그리는 쪽"이라, 선택값은 `TeamProfileView`가 갖고 UI는
`CompetitionPicker`라는 제어형 텍스트 버튼 줄 하나로 떼어 뒀다. KAN-597은 이 컴포넌트만 갈아 끼우면 된다. 기본값은
프리미어리그(league id 39)이고 선택지는 기록 응답의 대회 순서(EPL 먼저)에 선수단에만 있는 대회를 뒤에 붙인 것이다.
숫자 띠의 순위와 승점은 대회와 무관하게 EPL 순위표 기준이라 선택을 따르지 않는다.

관련 이슈는 티켓대로 "기존 이슈 행 규칙 그대로" 홈의 `PostListItem`에 `filter={code}`를 줘 엠블럼을 이 팀으로 고정했다.

새로 그린 조각은 시안 수치를 토큰으로 옮겼다. 무 칸 `#c9ced3`은 `muted`, 패 칸 `#eceef0`은 `form-loss`, 부상 `#a86f00`은 `warn`,
레일 이 팀 행 `rgba(10,107,66,.08)`은 `bg-accent/8`이다. 선수 사진은 시안이 정사각 + 칩 면(`#f2f4f5`)이라 `@plick/ui`의
`PlayerPhoto`에 `square` 옵션을 더했다. 기존 원형 호출부는 그대로다.

선수 링크는 `playerProfilePath(playerId)`(`/players/<id>`)로 만들고, `PlayerLink`가 id가 null이면 `<span>`으로 떨어진다. 도착 화면은
KAN-600이 만든다. 지금 웹에는 `/players` 라우트가 없어서 KAN-600이 먼저 들어가지 않으면 이 링크는 404다.

## 실패 경로: 502를 화면 전체 실패로 두지 않았다

처음엔 요약이 실패하면(404 말고) 레지스트리 이름과 "다시 시도"만 보여 주게 짰다. 요약이 머리를 그리니까 그게 자연스러워 보였다.
그런데 실제 dev(`API_BASE_URL=https://dev.plick.co.kr/be`)로 띄워 보니 문제가 보였다. 지금 dev는 요약이 늘 502라 화면이 통째로
"경기 정보를 불러오지 못했어요" 한 줄이 된다. 같은 순간 팀 이슈(`/articles?teamId=`)는 우리 DB라 멀쩡히 오고 있었다. 외부
장애 하나 때문에 살아 있는 데이터까지 가리는 꼴이었다.

그래서 요약 실패를 "보조 블록이 다 null로 온 요약"과 같은 길로 보냈다. 이름은 레지스트리 한글명, 부제는 "프리미어리그", 숫자 띠는
전부 "-", 구단 정보와 부상자 카드는 빠진다. 탭은 그대로 살아 있고 각 영역이 자기 실패를 그린다. 티켓의 "요약의 `info`, `nextFixture`,
`standing`은 일부만 실패해도 null로 온다"는 부분 실패 처리와 코드 경로가 하나로 합쳐져서 오히려 단순해졌다. 404만은 여전히
`notFound()`다.

## 검증

실패 경로를 손으로 만들기 어려워서 mock BE 앞에 20줄짜리 node 프록시(8083 → 8081)를 두고 팀 id마다 다른 고장을 넣었다.

- 1(맨유): 요약 502
- 2(맨시티): 요약의 `info`, `nextFixture`, `standing` null, 부상자 빈 배열, 경기, 기록, 선수단 502
- 3(리버풀): 경기 빈 배열, 기록은 대회 하나에 `home`과 지표 일부 null, 선수단 확장 필드 전부 null과 GK의 `positionCode` null,
  요약의 득점, 실점, form null과 구단 정보 일부 null
- 4(아스널): 요약 404

`.claude/launch.json`에 `web-dev-8083`(dev 서버 3043, API 8083)을 더해 띄우고 각 팀을 확인했다.

- 토트넘(정상 mock): 머리, 다음 경기(원정 Aston Villa), 숫자 띠(3위, 7, 2승 1무 0패, +4, 6득점 2실점, 승무승), 네 탭, 레일
  순위 5팀(이 팀 강조), 팀 내 순위, 구단 정보(토트넘 홋스퍼 스타디움, 62,850석, 런던), 부상자(M. Tel, Hamstring Injury)가 다 나왔다.
  대회를 리그컵으로 바꾸면 선수단 표(손흥민 1경기 1골 7.8, 비카리오는 "-"), 기록 탭(2경기 2승), 팀 내 순위(득점 1명)가 함께 바뀌었다.
  링크는 빅6 팀(`/teams/<slug>/profile`)과 `playerId`가 있는 선수(`/players/5001`)만 걸리고 Everton, Hull City는 링크가 아니었다.
- 맨유: 레지스트리 이름, 숫자 띠 "-", 탭과 이슈는 정상, 경기 영역은 다시 시도.
- 맨시티: 숫자 띠 "-", 다음 경기와 구단 정보 없음, 최근 경기와 선수단, 기록은 다시 시도, 팀 내 순위 카드 없음.
- 리버풀: 경기 탭 "남은 경기가 없어요", "아직 치른 경기가 없어요". 대회가 하나라 선택 UI 대신 제목 옆에 대회명. 홈 성적 줄 "-",
  클린시트, 최다 연승, 주 포메이션 "-". 선수단은 나이부터 평점까지 "-", GK는 "기타" 묶음으로 맨 뒤. 득점, 실점 null은 "-득점 -실점".
- 아스널과 모르는 slug: 404 화면.
- 실제 dev: 요약 502 상태에서 실제 팀 이슈 6건이 뜨고 나머지는 "-"와 다시 시도로 남았다.

브라우저 패널이 숨겨진 상태라 스크린숏이 클릭보다 한 박자 늦게 찍혔다. 경기 탭을 누르고 찍은 사진에 기록 탭이 활성으로 나와서
처음엔 탭 상태가 꼬인 줄 알았다. DOM에서 `aria-selected`와 `tabpanel` 텍스트를 읽어 보니 정상이었다. 그 뒤로 탭 검증은
`javascript_tool`로 탭을 차례로 눌러 패널 텍스트를 뽑는 식으로 했다.

좁은 폭(340px)에서 두 군데가 깨졌다. 숫자 띠가 두 칸씩 접히면서 "2승 1무 0패"가 옆 칸 "+4"와 붙었다. 전적 칸만 `max-md:col-span-2`로
한 줄을 다 쓰게 했다. 그리고 선수단 표(고정 열 합이 약 21rem), 경기 행, 성적 표, 시간대 막대는 고정 폭 열 때문에 340px 화면보다
넓다. 웹 지침이 "모바일에서 요소를 숨길지는 사용자에게 묻는다"라서 열을 숨기지 않고 표마다 `overflow-x-auto` 안에 `min-w`를 줘
그 표만 가로로 넘기게 했다. 네 탭 모두 `document.documentElement.scrollWidth`가 뷰포트 폭(340)과 같아 페이지 전체 가로 스크롤은 없다.

CI와 같은 명령(format:check, test:hooks 40, test:unit 57, lint, check-types, build)을 로컬에서 돌려 통과했다.

## 남은 것

- 선수 프로필 화면(KAN-600)이 들어오기 전까지 `/players/<id>` 링크는 404다. 릴리스 순서를 맞춰야 한다.
- 티켓 링크 규칙 중 경기 상세(득점자, 타임라인, 결장자, 라인업)와 기사 태그 인물의 `apiPlayerId` 링크는 이 화면 밖이라 손대지 않았다.
- 대회 선택 UI와 기본값은 KAN-597이 `CompetitionPicker` 자리를 갈아 끼운다.
- 시안의 선수단 영문명 줄은 BE `name`이 한 가지(사전 한글, 미등재 영문)뿐이라 넣지 않았다.
- 시간대 구간 라벨은 시안 "1-15분"이 아니라 BE 원문 "0-15분"을 그대로 쓴다.
- API-Football이 재개되면 dev 실데이터로 한 번 더 본다. mock의 팀명은 경기 쪽이 영문이라 실제 사전 한글 표기 폭은 아직 못 봤다.
