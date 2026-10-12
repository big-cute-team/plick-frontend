# 0191. 라이브 스코어 API가 죽은 동안 의존 화면을 준비중으로 닫았다 (KAN-644)

## 어떻게 시작됐나

develop에 쌓인 KAN-599·600·602·604(웹·모바일 팀 프로필 재구성, 선수 프로필, 탭 스트리밍)를 main으로 올려도 되는지 확인하다가 시작했다. 코드 쪽 위험부터 봤다. main과 develop 차이는 머지 PR 다섯 개, 커밋 열일곱 개였고, 설정 파일은 `proxy.ts` 두 개의 주석과 `issueGuest`의 1.5초 타임아웃 말고는 바뀐 게 없었다. CI와 dev 배포 후 E2E도 전부 초록이었다.

새 화면이 부르는 BE API 일곱 개가 prod BE에 있는지가 남았다. `/api/v1/teams/{id}/summary·fixtures·season-stats·squad`, `/api/v1/players/{id}`, `/matches`, `/seasons`다. prod `https://plick.co.kr/be`에 직접 curl을 쳤다. 처음 결과는 전부 502여서 아직 배포가 안 된 줄 알았는데, 응답 본문이 `MATCH_UPSTREAM_ERROR`였다. 라우트가 없으면 이 BE는 인증 필터가 먼저 잡아 `AUTH_REQUIRED` 401을 준다(일부러 없는 경로를 쳐서 확인했다). 그리고 TEAM_IDS에 없는 팀 42를 넣으니 `TEAM_NOT_FOUND` 404가 왔다. 라우트는 있고 핸들러까지 들어갔다는 뜻이다. 502는 BE가 외부 축구 데이터 API를 부르다 실패했다는 신호였고, main이 이미 쓰는 `/matches`와 `/standings`도 같은 502였다. 즉 배포를 막을 문제는 프론트 쪽에 없고, 지금 prod의 라이브 스코어 화면은 이미 깨져 있는 상태였다.

팀 기본 정보(`/teams/{id}`)와 인물(`/figures`)은 축구 데이터 상류를 타지 않아 200이었다. 죽은 건 경기, 순위, 팀 시즌 계열, 선수 계열이었다.

그래서 사용자 요청이 바뀌었다. main에 올리면서 라이브 스코어 API를 쓰는 화면, 그러니까 지금 오류가 나는 화면을 전부 "준비 중"으로 잠시 닫자는 것이었다.

## 무엇을 닫아야 하나

`@plick/core/live`, `team-profile`, `player-profile`을 import하는 앱 파일을 전부 뽑았다.

- 라우트: 모바일 `/live`, `/live/matches/[id]`, `/live/standings`, `/players/[id]`, `/teams/[slug]/profile`. 웹은 `/live`, `/live/matches/[id]`, `/players/[id]`, `/teams/[slug]/profile`.
- `/live/teams/[teamId]`는 옛 주소라 팀 프로필로 영구 리다이렉트만 한다. 리다이렉트 도착지가 닫히니 따로 손대지 않았다.
- `/live/chat`은 채팅 API라 열어 뒀다. 다만 LIVE 목록의 채팅방 배너가 사라지니 입구는 직접 주소뿐이다.
- 끼어 있는 조각: 웹 `LiveStrip`(헤더 아래 오늘 경기 띠, 홈·기사·투표·스토리에 다 붙는다)과 모바일 홈의 `HomeBanners`(오늘 경기 LIVE 띠).

조각 두 개는 원래 실패를 빈 배열로 접어서 띠를 안 그리게 돼 있었다. 그래서 화면은 안 깨지지만, 매 요청마다 죽은 상류를 한 번씩 두드리고 있었다. KAN-602에서 잰 바로는 경기 조회가 BE 호출 중 가장 느린 축(p90 5초 이상)이라 실패하는 데도 시간이 든다. 닫아 둔 동안은 아예 부르지 않게 했다.

## 페이지마다 고칠까, 프록시에서 돌릴까

처음 떠오른 건 페이지 아홉 개 맨 위에 `if (PAUSED) return <Paused />`를 넣는 방식이었다. 막상 보니 걸리는 게 있었다. 이 페이지들은 대부분 `generateMetadata`에서도 같은 API를 부른다. 페이지 본문만 막으면 메타데이터 단계에서 여전히 죽은 상류를 때리고, 그것까지 막으려면 파일마다 두 군데씩 손대야 한다. 되돌릴 때도 아홉 파일을 다시 열어야 한다.

두 번째 안은 Next의 `proxy.ts`(Next 16에서 middleware가 이 이름으로 바뀌었다. 라우트 렌더 전에 요청마다 도는 코드다)에서 경로를 보고 준비중 라우트로 rewrite하는 것이었다. rewrite는 redirect와 다르다. redirect는 브라우저에 3xx를 돌려 주소창을 바꾸게 하지만, rewrite는 서버 안에서만 "이 요청은 저 라우트로 렌더하라"고 바꿔 끼운다. 주소창은 `/live` 그대로 남고, 렌더되는 건 `/live-paused`다. 그래서 탭바의 LIVE 탭은 계속 켜진 채로 보이고, 공유된 링크나 즐겨찾기도 복구 뒤에 그대로 살아난다. 원래 페이지 컴포넌트와 `generateMetadata`는 아예 실행되지 않는다.

이게 클라이언트 내비게이션에서도 먹는지가 궁금했다. 앱 안에서 `<Link href="/live">`를 누르면 브라우저는 전체 문서가 아니라 RSC 페이로드(서버 컴포넌트 렌더 결과를 직렬화한 것)를 `/live`로 fetch한다. proxy는 이 요청에도 돈다. matcher가 `_next/static` 같은 정적 자산만 빼고 페이지 경로를 다 잡기 때문이다. rewrite된 RSC 응답이 오면 라우터는 그걸 `/live`의 내용으로 그린다. 실제로 홈에서 LIVE 탭을 눌러 확인했고, 주소는 `/live`, 제목은 "LIVE 준비 중 | 해축이모"였다.

## proxy 어디에 끼울까

proxy에는 이미 갈래가 많다. access 쿠키가 살아 있으면 통과, 토큰이 없는 첫 진입이면 게스트 발급(KAN-514), refresh만 남았으면 재발급(KAN-379)과 401 재시도. `proxy()` 맨 앞에서 바로 rewrite를 돌려주면 간단하지만 이 흐름을 전부 건너뛴다. 첫 진입이 `/live`인 사람은 게스트를 못 받고, access가 막 만료된 사람은 재발급 없이 다음 화면으로 넘어간다. 크게 망가지진 않아도 닫힌 화면 하나 때문에 세션 흐름이 달라지는 건 싫었다.

갈래를 다시 보니 페이지 요청이 통과하는 출구는 하나였다. 모든 갈래가 마지막에 `forward()`를 불러 `NextResponse.next({ request: { headers } })`를 만든다(분석 헤더와 토큰을 다운스트림에 실어 보내는 함수다). 게스트 발급 성공도, 실패도, 재발급도 결국 `forward()`가 만든 응답에 쿠키를 얹는다. 그래서 `forward()` 안에서만 분기했다. 닫힌 경로면 `next` 대신 `NextResponse.rewrite(new URL("/live-paused", request.url), { request: { headers } })`를 돌려준다. rewrite에도 같은 `request.headers` 옵션이 있어서 다운스트림이 보는 헤더는 똑같고, 바깥 갈래가 그 응답에 Set-Cookie를 얹는 것도 똑같이 된다. 바뀌는 건 렌더 대상뿐이다. `/be/*` 프록시 요청도 `forward()`를 지나지만 경로가 `/be`로 시작해 판정에 안 걸린다.

## 깃발과 경로 판정은 한 곳에

두 앱이 같은 판정을 써야 하니 `@plick/domain/live-pause`에 뒀다(ADR 0018, 공용 상수와 순수 함수의 단일 출처). 내용은 셋이다.

- `LIVE_SCORE_PAUSED`: 닫아 두는지. 복구되면 이것만 false로 돌린다. 타입을 `boolean`으로 넓혀 적었다. 리터럴 `true`로 추론되면 TS가 `if (LIVE_SCORE_PAUSED) return null` 뒤를 좁혀 버려 나중에 false로 바꿀 때 엉뚱한 타입 에러가 날 수 있어서다.
- `LIVE_PAUSED_PATH`: `/live-paused`.
- `isLiveScorePath(pathname)`: 정규식 하나로 `/live`, `/live/matches/*`, `/live/standings`, `/players/*`, `/teams/*/profile`만 잡는다.

proxy는 edge 번들에 실리므로 이 파일은 아무것도 import하지 않게 했다. barrel 금지 규칙(apps/CLAUDE.md)과 같은 이유로, 번들에 딸려 들어가는 게 없어야 한다.

경계 테스트를 `tests/unit/live-pause.test.mjs`에 붙였다. 잡아야 할 여섯 경로와, 놓아둬야 할 `/live/chat`, `/live/chat/session`, `/live-paused` 자기 자신(rewrite 루프 방지), `/lives`, `/teams/arsenal`, `/figures/12`, `/articles/1`을 확인한다.

## 준비중 화면

두 앱 모두 전역 404와 같은 톤으로 만들었다. 강조색 작은 라벨 `LIVE`, 제목 "경기 정보를 준비 중이에요", 안내 "더 나은 모습으로 곧 다시 열게요", 홈으로 버튼. 모바일은 `TopBar`와 `TabBar`를 그대로 둬서 다른 탭으로 바로 갈 수 있고, 웹은 `SiteHeader`와 `SiteFooter` 사이에 넣었다. 빨강(`danger`)은 LIVE 표식에 쓰는 색이지만, 여기 라벨은 "지금 진행 중"이 아니라 섹션 이름이라 강조색으로 뒀다.

## 확인

prod BE를 붙인 dev 서버(모바일 3001, 웹 3000)에 경로별로 curl을 쳤다. 닫을 경로는 두 앱 모두 200에 준비중 문구가 나왔고, `?date=` 쿼리가 붙어도 같았다. `/live/chat`(모바일), `/teams/arsenal`, 홈은 원래 화면이었다. 웹에는 `/live/standings` 라우트가 원래 없는데 이제 404 대신 준비중이 뜬다. 해가 없어서 정규식을 앱별로 쪼개지 않았다.

화면 캡처에서 한 번 헛걸음을 했다. 브라우저 패널이 가려져 있어 헤드리스 크롬으로 390px 창을 찍었더니 본문이 오른쪽으로 쏠려 보였다. 레이아웃 문제인 줄 알고 `AppShell`을 열어 봤는데, 실제 원인은 헤드리스 크롬 창의 최소폭이었다. 뷰포트가 500px로 잡혀 480px 셸이 가운데 정렬되며 10px 밀렸고, 스크린샷만 390px로 잘린 것이다. 패널의 375px 에뮬레이션에서 버튼 중심을 재 보니 187.5로 정중앙이었다.

E2E 시나리오 중 이 경로를 밟는 건 모바일 기사 화면에서 팀 프로필 링크를 눌러 URL만 확인하는 하나였다. 주소가 그대로라 깨지지 않는다.

## 되돌리는 법

축구 데이터 상류가 살아나면 `packages/domain/src/live-pause.ts`의 `LIVE_SCORE_PAUSED`를 false로 바꿔 배포한다. 그러면 proxy 분기와 띠 두 개가 원래대로 돌아간다. 오래 닫을 일이 없으면 그다음 정리 PR에서 깃발, `live-paused` 라우트 둘, 테스트를 함께 지운다.
