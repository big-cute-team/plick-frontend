# 0129. 라이브 스코어 껍데기에 실제 API 6종을 붙였다 (KAN-452)

## 배경

KAN-446(ADR 0127)에서 라이브 스코어 지면을 웹·모바일 양쪽에 목데이터로 다 깔아 뒀다. 이번 세션의 일은 그 껍데기에 BE 라이브 스코어 API 6종을 붙이는 것이었다. 사용자가 "백엔드가 약간 수정된 게 있으니 백엔드 코드부터 다 확인하고 계획을 세우라"고 했고, 계획을 승인받은 뒤 한 PR로 전부 배선했다.

원래 ADR 0126 핸드오프는 스토리 5개(PR 5개)로 쪼개 `/wire-api`를 돌리는 계획이었다. 사용자가 PR 하나로 묶자고 해서 그렇게 갔다. 껍데기 PR도 하나였고, fetcher가 `@plick/core` 한 파일이라 나누면 오히려 중간 상태(반은 목, 반은 실데이터)를 여러 번 리뷰하게 된다.

## BE에서 무엇이 바뀌었나

BE 저장소(`~/Documents/plick-backend`)의 최근 커밋을 봤더니 라이브 스코어 관련 phase가 18부터 22까지 다섯 개 들어와 있었다.

- 18 (KAN-434) 경기 목록: API-Football을 Valkey read-through 캐시로 중계한다. 팀별 시즌 fixtures 6키(1시간) 위에 `fixtures?live=all` 라이브 오버레이(20초)를 덮는다. DB엔 아무것도 안 쌓는다.
- 19 (KAN-442) 경기 상세: events·lineups·statistics 세 콜을 `match:detail:{id}` 한 키로 묶고(라이브 20초, 종료 1일), 킥오프 전엔 preview 키(1시간)로 결장자·상대전적·순위·직전 선발을 조립한다. 각 블록은 실패하면 그 블록만 null이다.
- 20 (KAN-443) 스쿼드·순위표·시즌 스탯: 24시간 캐시. 무출전 선수는 404가 아니라 빈 배열.
- 21 (KAN-444) 갱신 락: 키 만료 순간 동시 미스가 외부 호출을 50배로 증폭시키는 걸 재현하고 SETNX 락으로 1회로 고정했다.
- 22 (KAN-445) soft TTL: 캐시 값에 논리 만료를 넣어 낡은 값은 즉시 주고 갱신은 백그라운드 1회로 돌린다. 응답 avg 652ms가 12ms로 떨어진 측정 기록이 있다.

FE 입장에서 21·22는 응답 형식이 안 바뀌어 배선에 영향이 없다. 다만 "20초 폴링"의 의미가 조금 달라진다. soft TTL 덕에 만료 순간에도 요청이 옛값으로 즉답하고 뒤에서 갱신되므로, FE 폴링 간격이 BE TTL(20초)보다 짧아도 요청마다 새 값을 받는 게 아니라 옛값을 받을 뿐 비용은 안 는다. 그래서 폴링은 20초로 맞췄다.

계약의 정본은 컨플루언스 명세가 아니라 BE DTO 코드로 잡았다. 스웨거(`/v3/api-docs`)는 nullable도 enum도 안 나와서 `MatchCardResponse`·`MatchDetailResponse`·`PlayerMatchStatsResponse`·`StandingsResponse`·`SquadResponse`·`PlayerSeasonStatsResponse` 레코드와 조립 서비스(`MatchListService`·`MatchDetailService`·`MatchTeamService`)를 직접 읽었다.

## 로컬 BE가 전부 502였다

계획을 세우려고 로컬 BE(8080)에 여섯 엔드포인트를 curl로 때렸더니 전부 `MATCH_UPSTREAM_ERROR`였다. 404·400 매핑은 정상인데 외부 API 호출만 죽는 상황.

원인은 `FOOTBALL_API_KEY`가 BE `.env`에 없어서였다. `application-local.yml`은 `api-key: ${FOOTBALL_API_KEY}`이고, `FootballApiClient` 생성자는 "키가 비면 기동 실패"로 방어해 뒀는데, Spring Boot의 `@ConfigurationProperties` 바인더는 못 푼 플레이스홀더를 문자열 그대로 남긴다. 그래서 apiKey가 `${FOOTBALL_API_KEY}`라는 리터럴이 되어 "비어 있음" 검사를 통과하고, API-Football에 그 문자열을 헤더로 보내 키 오류를 받고, BE가 502로 바꿔 준 것이다. API-Football `/status`를 키 없이 직접 찔러 "Missing application key"를 확인했다.

키는 시크릿이라 내가 넣을 수 없고, 사용자가 "꼭 키가 필요하냐, 데이터 타입에 맞춰 만들면 되지 않느냐"고 물었다. 맞다. 코딩에는 BE DTO만 있으면 되고, 검증은 BE `mock` 프로필로 대신할 수 있다. `MockMatchController`가 경기 900001(종료)·900002(라이브)·900003(예정 프리뷰), 선수 5001·5002, 스쿼드 teamId 1~6, 순위표 6행을 고정으로 준다. 그래서 순서를 BE 코드 기준 구현 → mock 프로필 검증 → 키가 들어오면 실응답 대조로 정했다.

mock 프로필은 DB·env 없이 뜬다(`application-mock.yml`이 DataSource·JPA·Security 자동설정을 뺀다). 사용자 BE가 8080에 떠 있으니 `SPRING_PROFILES_ACTIVE=mock ./gradlew bootRun --args='--server.port=8081'`로 8081에 따로 띄웠다.

## 계약 차이 — 껍데기 타입은 명세 기준이라 BE와 여러 곳이 달랐다

`packages/domain/src/live.ts`는 KAN-446 때 컨플루언스 명세를 보고 만든 것이라 BE 실제 DTO와 여기저기 달랐다. 전부 fetcher 경계에서 흡수하고 화면 타입은 필요한 만큼만 고쳤다.

- 카드·헤더: BE는 `matchId`·`league{id,name,logo}`·`home/away{teamId,name,logo}`이고 라운드가 없다. `round`는 타입에서 뺐고 상세 상단바 제목은 대회명만 남겼다(사용자 결정). `code`는 `TEAM_CODES[teamId]`로 되찾고 `shortName`은 팀명에서 만들며(`teamShortName`, 알려진 EPL 14팀은 표, 그 밖은 앞 세 글자), `logo`를 새로 담았다. `statusDetail`은 API-Football 세부 코드(`1H`·`HT`·`FT`·`PEN`·`TBD`)라 `matchStatusLabel`이 코드별로 접는다.
- 상세: `goals[]` 득점 요약이 따로 온다(BE가 선수 null인 취소 골을 이미 뺀 것). 껍데기는 events에서 골을 골라 쓰고 있었는데 BE 요약으로 바꿨다. 다만 원본 type이 Goal인 "Missed Penalty"가 요약에 섞여 오길래 FE에서 걸렀다. events는 minute·extraMinute 정수라 `"45+2'"`로 조립하고, 시간순으로 오는 걸 타임라인용으로 뒤집었다. 교체는 원본이 player=들어오는 선수, assist=나가는 선수라 "X 아웃"으로 붙였다. 카드는 Yellow/Red를 갈라 `RED_CARD` 타입을 추가했다(칩 색이 달라야 해서). lineups는 side별 배열이라 `{home, away}`로 재배치하고, 킥오프 20~40분 전까지 빈 배열로 오는 걸 null로 접어 "라인업은 킥오프 20~40분 전에 공개돼요"로 그린다. stats는 side별 `{type,value}` 배열을 type으로 zip하고 한글 라벨 표(13종)를 붙였다. 표에 없는 type은 원문 라벨로 뒤에 붙는다.
- 프리뷰: 결장자 `kind`는 reason에 "suspen"이 있으면 징계, 아니면 부상. 상대전적은 이 경기 홈 팀 이름과 대조해 승무패를 FE가 계산하고, 아직 안 치른 경기(골 null)는 뺀다. form 문자열("WWDLW")은 배열로.
- 선수 경기 스탯: BE는 `Pair{main,sub}` 7종(슈팅 전체/유효, 골/도움, 태클/차단, 듀얼 전체/승리, 드리블 시도/성공, 파울 얻음/범함, 경고/퇴장)과 passes다. 시트가 쓰는 `{label,value}[]` 아홉 칸은 FE가 조립한다. 팀명이 응답에 없어 눌린 자리의 팀을 같이 들고 간다 — `LineupPitch`·`BenchList`의 탭 콜백이 `(playerId, team)`으로 바뀌었다.
- 시즌 스탯: 응답이 `playerId`와 `competitions[]`뿐이다. 이름·포지션·시즌은 시트가 탭한 스쿼드 행에서 받고 시즌 라벨은 `LIVE_SEASON_LABEL` 상수다. 출전·골·도움이 nullable이라 "-" 처리.
- 순위표: `zone`이 없어 `UCL_ZONE_MAX_RANK`(4위) 상수로 FE가 판정한다(사용자 결정).
- 스쿼드: 응답에 팀명이 없다. 페이지가 `TEAM_CODES`로 빅6를 걸러 404를 내고, 팀명은 `TEAMS` 레지스트리의 한글 축약명을 넘긴다. 순위표는 BE 영문명이라 화면 안에서 표기가 섞이는데, 스쿼드 헤더는 우리 제품의 팀 이름이 맞다고 봤다.

## 데이터 레이어 — 처음부터 `@plick/core`

fetcher 6개는 `packages/core/src/live.ts`, 쿼리키는 `liveKeys.ts`에 뒀다. 토론(`debates.ts`)과 같은 판단이다. web·mobile이 처음부터 함께 쓰는 기능이라 앱 폴더를 거쳐 승격할 이유가 없다(ADR 0011 게이트 C). 서버 컴포넌트와 클라 훅이 함께 부르므로 서버 액션이 아니라 평범한 모듈이고, 전부 익명 공개 API라 토큰을 싣지 않는다.

BE 응답 인터페이스는 fetcher 파일 로컬에 두고(BE 레코드 그대로), 화면이 쓰는 도메인 타입으로 거기서 접는다. 목록·상세는 `next: { revalidate: 20 }`을 넘긴다. `apiFetch`의 익명 GET 기본 캐시가 60초인데 라이브 스코어에는 길고, BE 라이브 오버레이 TTL이 20초라 거기 맞췄다. 브라우저 fetch에서는 무시되는 옵션이라 클라 폴링엔 영향이 없다.

페칭 도구는 ADR 0126 계획 그대로다.

- 목록·상세: TanStack Query. 서버 컴포넌트가 첫 응답을 씨앗(`initialData` + `initialDataUpdatedAt`)으로 심고 클라 훅이 이어받는다(토론 `DebatesScreen` 패턴). 폴링은 조건부다. 목록은 응답에 LIVE 경기가 있을 때만, 상세는 `header.status === "LIVE"`일 때만 20초. `refetchInterval`에 함수를 넘기면 매번 최신 데이터를 보고 판정하므로, 라이브가 끝나면 다음 응답부터 폴링이 스스로 꺼진다.
- 순위표·스쿼드: 서버 컴포넌트 fetch. 폴링이 없는 단발 읽기다.
- 시트·모달 둘: 열릴 때만. 모바일은 시트 본문이 열릴 때 마운트되는 suspense 쿼리라 `enabled` 스위치가 필요 없고, 웹은 `enabled: playerId !== null`이다.

모바일은 KAN-447(ADR 0128)의 `useSuspenseQuery` + `QueryBoundary`로 갔다. 목록 화면은 날짜 스트립과 서브탭을 경계 밖에 두어 목록이 실패해도 다른 날짜로 이동할 수 있게 했고, 상세는 상단바 제목이 응답(대회명)에서 오므로 상단바까지 경계 안에 넣었다. 웹은 아직 경계 인프라가 없어 기존 `useQuery` + `isPending`·`isError` 분기 관례를 유지했다(사용자 결정, 범위 밖).

에러 매핑은 셋이다. 400(`date` 형식)은 `isDateKey`로 미리 막아 오늘로 떨어뜨리고, 404(`MATCH_NOT_FOUND`·`TEAM_NOT_FOUND`)는 서버에서 `ApiError.status === 404`를 잡아 `notFound()`, 502(`MATCH_UPSTREAM_ERROR`)와 순단은 씨앗 없이 내려보내 클라가 다시 받고 그것도 실패하면 기존 `LiveLoadError` 지면이 경계의 retry를 받는다. `?demo=error` 훅은 지웠다.

## 날짜와 시각은 전부 KST Intl로

껍데기의 `MOCK_TODAY`와 정규식 시각 추출을 `todayDateKeyKst`·`kickoffTimeLabel`·`kickoffDateLabel`(Intl `Asia/Seoul`)로 바꿨다. 오늘 날짜는 페이지(서버)가 계산해 `DateStrip`에 prop으로 내린다. 스트립 안에서 다시 계산하면 서버와 기기의 시각이 자정을 사이에 두고 갈릴 때 하이드레이션이 어긋난다.

## 이미지 — CDN은 일반 img에 폴백

빅6 밖 팀 로고와 선수 사진은 API-Football CDN URL을 그대로 쓴다. `TeamCrest`·`MediaThumb`처럼 `next/image` 없이 일반 img로 그리고(호스트가 외부라 remotePatterns 관리가 불필요), 로드 실패는 `onError`로 잡아 이니셜 제네릭 원형(`LiveCrest`)이나 아바타 배경 원(`PlayerPhoto`)으로 떨어뜨린다. 실패 상태 때문에 둘 다 클라 컴포넌트가 됐다.

## 빌드 로그에서 잡은 것 — 순위표 라우트의 정적 프리렌더

`pnpm build` 로그에 `[live] 순위표 로드 실패`가 찍혔다. 모바일 `/live/standings`는 쿼리도 쿠키도 없어 Next가 빌드 시점에 정적 프리렌더를 시도하고, 그때 BE(8080, 키 없음)가 502를 준 것이다. 로컬이라 그렇지만 CI 러너엔 BE 자체가 없으니 배포마다 에러 지면이 HTML로 굳어 나가고, ISR 재검증(60초)이 돌 때까지 첫 방문자가 그걸 본다. sitemap과 같은 이유로 `export const dynamic = "force-dynamic"`을 붙였다. 안의 fetch는 `apiFetch`가 revalidate를 명시하므로 데이터 캐시는 그대로 산다. `/live`(searchParams)와 상세·스쿼드(동적 세그먼트)는 원래 요청 시 렌더라 해당이 없다.

## 검증 — dev 서버 lock 때문에 prod 빌드로

브라우저 검증을 하려고 `preview_start`로 mock BE를 가리키는 dev 서버를 띄웠더니 Next 16이 "Another next dev server is already running"으로 거부했다. 사용자가 몇 분 전에 `pnpm dev`로 3000·3001을 띄워 둔 상태였고, 그건 8080(키 없는 BE)을 본다. 사용자 프로세스를 죽이는 대신 ADR 0128 때처럼 prod 빌드로 갔다. `API_BASE_URL=http://localhost:8081 pnpm build`로 `/be` 프록시 목적지를 8081로 굳히고, `next start`에도 같은 env를 실어 서버 컴포넌트 fetch가 8081을 보게 했다. `next dev`와 `next start`는 lock을 공유하지 않는다. `.claude/launch.json`에 `mobile-mock`·`web-mock`(3011·3010)으로 남겨 뒀다.

## 검증 결과

`pnpm build`(web+mobile), `pnpm lint`, `pnpm check-types`, `format:check` 통과. mock BE(8081) 기준으로 브라우저에서 밟은 지면은 이렇다.

- 모바일: 목록(종료·라이브·예정 카드, 빅6 로컬 크레스트, 빅6 밖은 CDN 로고), 상세 900002 라이브(득점·타임라인·"라인업은 킥오프 전 공개" 빈 안내), 900001 종료(라인업 피치·평점 배지·벤치, 선수 시트의 스탯 9칸, 스탯 탭 비교 막대), 900003 프리뷰(결장자·상대전적 승무패·리그 순위 폼 점·직전 선발과 명세 요구 문구), 순위표(챔스권 4위 강조), 스쿼드 6번 + 시즌 스탯 시트(출전 있음·무출전 빈 상태), 404 두 종(`/live/teams/9`, `/live/matches/1`).
- 웹: 대시보드(목록 + 순위표 레일), 상세 900001·900002·900003, 스쿼드 + 시즌 스탯 모달, 선수 경기 스탯 모달, 404.
- 폴링: 브라우저 패널은 `document.visibilityState`가 hidden이라 TanStack이 설계대로 인터벌을 멈춘다(`refetchIntervalInBackground` 기본 false). 그래서 저장소의 playwright-core(`scripts/store-shots`)로 보이는 헤드리스 페이지를 띄워 46초 동안 `/be` 프록시 요청을 셌다. 라이브가 있는 목록 2회, 라이브 상세 2회, 종료 상세 0회. 조건부 폴링이 의도대로 돈다.

타임라인 표기를 보다가 하나 고쳤다. 카드 이벤트가 칩 "경고" 아래 부제도 "경고"로 두 번 나왔다. 칩이 이미 경고·퇴장을 말하니 부제는 경고 누적 퇴장일 때만 "경고 누적"으로 남기고 나머지는 비웠다.

에러 지면은 mock BE를 내려서 확인했다. 그런데 이미 한 번 받은 URL은 BE가 죽어도 멀쩡하게 떴다. Next 서버 데이터 캐시가 만료 후에도 재검증 실패면 옛값을 계속 주는(stale-while-revalidate) 구조라, ADR 0128 때 홈이 캐시로 살아 있던 것과 같은 현상이다. 캐시에 없는 새 URL(다른 날짜, 안 본 경기 id, 안 본 팀)로 들어가니 모바일 목록·상세, 웹 목록, 스쿼드 전부 에러 지면이 섰다. 이어서 BE를 다시 띄우고 "다시 시도"를 누르니 목록이 돌아왔다(모바일은 경계 reset → refetch, 웹은 `refetch`). 이 시나리오는 브라우저 패널이 hidden이라 경계 복구 렌더를 미루는 탓에 역시 playwright로 했다. 스크립트가 8081 리스너를 내리고, 페이지를 열어 에러를 확인하고, gradle을 다시 띄워 200이 올 때까지 기다린 뒤 버튼을 누른다.

## 남긴 것

- 실데이터 대조. `FOOTBALL_API_KEY`가 들어오면 be-verify로 6개 응답을 한 번 더 본다. 특히 이벤트 선수명 null 행, 18종 스탯 type의 실제 이름(라벨 표 보강), 빅6 밖 팀 CDN 로고, 라인업 `position` 문자열, 페널티 실축 이벤트가 goals 요약에 섞이는지.
- 타임라인 이벤트 type의 소문자·대문자 표기(`Goal`·`subst`·`Var`)는 PoC 관찰값이라 실응답에서 다시 본다. 변환은 소문자로 비교해 둬서 표기가 흔들려도 버틴다.
- 마이팀 강조는 여전히 리버풀 고정이다(프로필 연동은 별도 티켓). 탭 재탭 리프레시용 `ScreenKey`에 `"live"` 추가, 시트 드래그 개폐도 그대로 미뤄 둔다.
- 웹의 에러 경계(`QueryBoundary`) 승격은 이번 범위 밖으로 뒀다. 웹 라이브 훅은 `useQuery` 분기형이라 모바일과 훅 구현이 갈라져 있다.
- `.next`는 검증 때문에 8081 리라이트로 빌드했다가 마지막에 평범한 `pnpm build`로 되돌렸다.
