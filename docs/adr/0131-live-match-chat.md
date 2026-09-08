# 0131. 라이브 경기 채팅 탭 — 웹소켓을 처음 붙이며 (KAN-458)

- 날짜: 2026-09-08
- 티켓: KAN-458 (에픽 KAN-448)
- 브랜치: `feature/KAN-458-live-match-chat`
- 관련: [ADR 0129](0129-livescore-api-wiring.md) 라이브 스코어 배선, [ADR 0011](0011-shared-code-boundary.md) 공용 경계,
  [ADR 0044](0044-mobile-auth-read-plumbing.md) 인증 읽기 배관

## 시작하기 전에 백엔드가 안 떴다

세션은 BE를 켜려다 막힌 데서 시작했다. `bootRun`이 `Schema-validation: missing table [article_stats]`로
죽었다. 지난달 두 번 겪은 그 패턴이다. BE는 `ddl-auto: validate`라 엔티티에 있는 테이블이 DB에 없으면
기동을 거부하는데, 마이그레이션 도구가 없어 스키마를 바꾸는 PR이 머지돼도 공유 Supabase에는 손으로
DDL을 넣어야 한다. 이번엔 KAN-450(참여 집계 테이블)이 머지된 뒤 DDL이 안 들어간 거였다.

BE 저장소 `docs/phases/23-article-stats.md`에 있는 DDL과 백필 SQL을 그대로 `db.sh`로 흘려 넣었다.
한 가지 새로 배운 것: `db.sh -f 파일`은 안 된다. 로컬에 psql이 없으면 도커의 postgres 이미지로
붙는 구조라 호스트 경로가 컨테이너 안에 없다. `db.sh -v ON_ERROR_STOP=1 < 파일`로 stdin에 흘리면 된다.
기사 3998건에 집계 행이 생겼고 BE가 37초 만에 떴다.

## 무엇을 만들었나

경기 상세 화면에 채팅 탭을 붙였다. 모바일과 웹 둘 다다. 서버는 이미 dev에 올라가 있었고, 계약은
Confluence [API 명세] 라이브 경기 채팅(59146245)에 있었다. 이 저장소에 웹소켓을 쓰는 코드는 이게
처음이라 재접속 정책부터 토큰 전달까지 전부 새로 정해야 했다.

### 계약에서 놓치면 안 되는 것

BE 브랜치 `feat/KAN-448-live-chat`의 코드를 직접 읽었다. `ChatHandshakeInterceptor`, `ChatWebSocketHandler`,
`ChatConfig`, `ChatProperties`. 문서와 코드가 같다는 걸 확인하고 나서 아래를 정리했다.

- 접속은 `wss://{호스트}/ws/chat?matchId=&token=`. `/api/v1` 밖이고 토큰이 쿼리 파라미터다. 브라우저
  웹소켓 API가 요청 헤더를 못 붙이니 어쩔 수 없다.
- 프레임은 언제나 배열이다. 서버가 100ms 창 동안 방에 쌓인 것을 한 프레임으로 묶어 보낸다. 입장 직후엔
  최근 20개가 한 프레임으로 온다. 단건 객체로 파싱하면 깨진다.
- 거절은 `{"type":"ERROR","content":"MESSAGE_TOO_LONG"}` 같은 프레임으로 보낸 사람에게만 온다. 접속은
  안 끊는다.
- 서버가 끊을 때 종료 코드 4000에 사유 `retry=17320`을 실어 준다. 그만큼 기다렸다 붙어야 한다.
  전원이 같은 순간에 돌아오면 킥오프 부하가 다시 오기 때문에 서버가 접속마다 다른 값을 흩어 준다.
  BE가 500명으로 잰 수치가 있다. 곧바로 붙으면 7,000번, 흩어서 붙으면 1,843번.
- 핸드셰이크 거절은 HTTP 코드다. 400 형식 오류, 401 토큰 무효, 403 온보딩 미완료(닉네임 없음),
  404 열려 있는 방이 아님.
- 방은 킥오프 30분 전에 열려 3시간 뒤에 닫힌다. dev는 `CHAT_OPEN_BEFORE=720h`로 넓혀 둘 수 있다.
- `ChatConfig`가 `cors.allowed-origins`를 웹소켓 허용 origin으로도 쓴다. 웹소켓 핸드셰이크는 CORS
  규칙을 안 타서 스프링이 따로 Origin을 검사한다. BE dev env의 `CORS_ALLOWED_ORIGINS`에 `dev-m.plick.co.kr`과
  `dev.plick.co.kr`이 있어야 붙는다.

### 토큰을 어떻게 브라우저까지 가져오나

여기서 제일 오래 생각했다. 우리 access 토큰은 HttpOnly 쿠키다. ADR 0044에서 정한 대로 브라우저 JS는
못 읽고, `/be/*` 프록시가 요청마다 Bearer를 실어 주는 구조다. 그런데 웹소켓은 그 프록시를 못 탄다.
Next의 `rewrites`는 HTTP 요청을 다른 곳으로 넘기는 것이지 웹소켓 업그레이드 프레임을 중계하지 않는다.
`new WebSocket("/be/ws/chat")`을 해 봐야 헤더도 안 실리고 프록시도 안 된다.

선택지는 둘이었다.

1. 서버 컴포넌트(`page.tsx`)가 `getAccessToken()`으로 토큰을 꺼내 클라 컴포넌트에 prop으로 내린다.
2. 같은 오리진에 라우트 핸들러를 하나 두고, 브라우저가 붙기 직전에 불러 완성된 접속 주소를 받는다.

1번은 간단하지만 접속 주소가 렌더 시점에 굳는다. 채팅 탭을 열어 둔 채 55분이 지나 access 쿠키가
만료되면(쿠키 수명이 토큰보다 5분 짧다) 재접속에 옛 토큰을 쓰게 되고, 서버는 401로 거절한다.
BE 계약이 "접속 중 만료는 안 끊지만 다시 붙을 땐 새 토큰이 필요하다"고 못 박고 있어서 재접속마다 새
토큰을 받는 구조여야 했다.

2번으로 갔다. `GET /live/chat/session?matchId=`가 `{ url: "wss://…?matchId=&token=" }`를 돌려준다.
브라우저는 BE 오리진도 모르고 토큰도 못 읽으니 둘 다 서버가 채운다. 경로를 `/api` 밖에 둔 이유가
있다. `proxy.ts`의 matcher가 `/api`를 제외한다. 이 라우트는 프록시를 지나야 한다. access 쿠키가
없고 refresh만 남은 요청이 오면 프록시가 재발급해서 `request.cookies.set`으로 요청 쿠키에 심고
응답 `Set-Cookie`로 브라우저에도 심는다. 라우트 핸들러의 `cookies()`는 프록시가 갈아 끼운 새 access를
읽는다. 그래서 채팅 재접속이 세션 갱신까지 겸한다.

토큰이 응답 본문으로 JS에 노출되는 건 HttpOnly의 보호를 그만큼 포기하는 것이다. BE가 쿼리 파라미터로
받기로 한 이상 피할 수 없고, 응답은 `Cache-Control: no-store`로 두고 URL에는 토큰을 싣지 않아 접근 로그에
남지 않게 했다. 웹소켓 URL 자체는 쿼리에 토큰이 있는데 그건 BE 쪽 결정이다.

### 접속 주소는 어디서 오나

로컬은 `API_BASE_URL`(`http://localhost:8080`)의 스킴을 ws로 바꿔 `/ws/chat`을 붙이면 된다. 배포 환경은
다르다. `API_BASE_URL`이 내부 ALB라 브라우저가 못 닿는다. Confluence 기능 개요 문서의 "남은 결정"이
바로 이거였다. dev 공개 ALB에는 `dev-admin`, `dev.plick.co.kr`, `dev-m.plick.co.kr` 규칙만 있고 메인 API
서버는 내부 ALB에만 붙어 있다.

그래서 `CHAT_WS_URL` env를 하나 뒀다. 있으면 그 값을 쓰고 없으면 `API_BASE_URL`에서 유도한다.
`NEXT_PUBLIC_`이 아니라 런타임 env다. 라우트 핸들러가 요청마다 `process.env`를 읽으므로 SSM 파라미터
스토어의 `.env`만 바꾸고 재시작하면 되고 재빌드가 필요 없다. `API_BASE_URL`이 빌드 시점 리라이트와
런타임 둘 다에 걸려 있는 것과 달리 이건 런타임 한 자리뿐이라 헷갈릴 게 없다. turbo의 `no-undeclared-env-vars`
규칙에 걸려 `turbo.json` `globalEnv`에도 올렸다.

### 브라우저는 왜 거절당했는지 모른다

구현하다 알게 된 제약이다. 브라우저 `WebSocket`은 핸드셰이크가 HTTP 401이든 404든 `onclose`에
코드 1006만 준다. 사유도 비어 있다. 서버가 "방이 안 열렸다"고 404를 보내도 클라는 "그냥 끊겼다"만 안다.

그래서 접속 전에 화면이 먼저 거른다. 로그인 여부와 닉네임은 `AuthProvider`가 서버 렌더 때 심어 준
값으로 안다. 비로그인이면 로그인 안내, 닉네임이 없으면(온보딩 미완료, 서버라면 403) 닉네임 설정 안내.
방이 닫힌 뒤(킥오프 3시간 뒤)는 킥오프 시각으로 계산해 안내만 그린다.

킥오프 30분 전은 일부러 안 거른다. 서버는 404로 거절하지만 dev가 방 여는 구간을 720시간으로 넓혀
두면 아무 경기에나 붙어 볼 수 있어야 한다. 화면이 먼저 막으면 그 확인이 안 된다. 붙어 봤다가
연속 거절되면 그때 킥오프 시각으로 문구를 고른다. 아직 30분 전이면 "킥오프 30분 전에 열려요",
열려 있어야 할 시각인데 거절이면 "연결하지 못했어요"와 다시 시도 버튼이다.

### 재접속 정책

`packages/core/src/chat.ts`의 `ChatSocket` 클래스에 모았다. React와 무관한 순수 클래스다.

- 4000이면 사유의 `retry` 값만큼 정확히 기다린다. 값이 깨져 있으면 백오프로 떨어진다.
- 그 밖의 코드는 FE 정책이다. 한 번 붙었다 끊긴 것이면 1초에서 두 배씩 늘어 30초에서 멈추는
  지수 백오프로 끝없이 다시 붙는다. 절반까지 무작위로 흩는다.
- 한 번도 못 붙은 채 연속 세 번 거절되면 멈추고 수동 재시도로 넘긴다. 방이 안 열렸는데 끝없이
  두드리면 헛시도만 는다.
- 세션 발급이 401이면 `failed`에 원인 `auth`를 실어 로그인 안내로 보낸다.

`dispose()`는 화면을 떠날 때 부른다. 이후로는 콜백을 하나도 안 부른다. React 개발 모드의 StrictMode가
effect를 두 번 돌리는데(연결 → 정리 → 연결) 첫 소켓이 열리기도 전에 `close()`를 맞아도 문제없다.

### 같은 메시지를 두 번 그리지 않기

서버가 메시지 id를 안 준다. 다시 붙으면 최근 20개가 또 오는데 그중 일부는 이미 화면에 있다.
`userId|sentAt|content`를 키로 삼아 있는 건 건너뛴다. `mergeChatMessages`가 기존 목록 뒤에 새것만
붙이고 300건을 넘기면 앞을 버린다. 같은 사람이 같은 밀리초에 같은 내용을 두 번 보내는 경우는
못 가르지만, 그 정도는 감수했다.

### 탭 구조를 어떻게 바꿨나

모바일 경기 상세는 `MatchDetailTabs` 안에 탭 줄과 본문이 같이 있었고, 라이브·종료 경기에만 탭이
있었다. 예정 경기는 프리뷰 블록만 그렸다. 채팅은 킥오프 30분 전부터 열리니 예정 경기에도 탭이
있어야 했다.

상태별 탭 조합을 `MATCH_TABS_BY_STATUS` 상수로 뺐다. 예정은 프리뷰·채팅, 라이브·종료는
요약·라인업·스탯·채팅, 연기·취소는 탭 없음(BE가 킥오프 시각을 안 믿어 방을 안 연다). 탭 줄은
`MatchTabBar`로 떼어 냈고 선택 상태는 `MatchDetailScreen`이 갖는다. 폴링으로 상태가 바뀌어
(예정 → 라이브) 지금 탭이 사라지면 첫 탭으로 돌아간다.

채팅 탭만 `ScrollArea` 밖에 선다. `AppShell`이 높이를 못박고 스크롤은 `ScrollArea`가 맡는 구조라,
입력바를 스크롤 안에 두면 목록과 함께 흘러가 버린다. 채팅일 때는 헤더와 탭 줄을 고정하고 남는 높이를
채팅 패널이 다 가져간다. 목록만 안에서 스크롤하고 입력바는 `--safe-bottom`을 더해 홈 인디케이터 위에
붙는다.

웹은 탭이 아예 없었다. 데스크톱은 요약·라인업·스탯을 한 지면에 다 펼치기로 했던 화면이라(ADR 0129)
"경기 / 채팅" 둘만 있는 `MatchViewTabs`를 헤더 카드 아래 뒀다. 채팅은 고정 높이 카드
(`min(70vh, 720px)`) 안에서 목록이 스크롤한다.

### 비로그인 사용자에게 어떻게 보이나

티켓 확인 항목에 "정한다"로 열려 있던 것. 탭은 보이되 안에서 로그인을 권하는 걸로 했다. 서버가
읽기도 로그인을 요구하니(접속자 수를 예측 가능하게 하려는 결정) 미리보기 없이 안내만 있다.
탭을 숨기면 기능이 있는지도 모르니 보이는 쪽이 낫다.

### 자동 스크롤

새 메시지가 오면 사용자가 바닥 근처(80px 안)를 보고 있을 때만 따라 내려간다. 위로 올려 지난 대화를
읽는 중이면 끌어내리지 않고 "새 메시지 N개 ↓" 버튼만 띄운다. 채팅 앱들이 다 그렇게 한다.

## 어디에 뭘 뒀나

- `packages/domain/src/chat.ts`: 프레임·메시지·연결 상태 타입. 라이브 스코어처럼 처음부터 공용
  (ADR 0011 게이트 C, 두 앱이 같은 계약).
- `packages/core/src/chat.ts`: 상수, 방 수명 판정, 프레임 파싱, 중복 제거, `ChatSocket`, 세션 발급
  fetch, 서버용 접속 주소 조립.
- `packages/domain/src/format.ts`: `formatChatTime`(HH:mm).
- `apps/{mobile,web}/app/live/chat/session/route.ts`: 세션 발급 라우트 핸들러.
- `apps/{mobile,web}/app/_hooks/useMatchChat.ts`: `ChatSocket`을 React 상태로 옮기는 훅.
  `useMatchDetail`처럼 앱별 수동 복제다.
- `apps/mobile/app/live/_components/`: `MatchTabBar`, `MatchChatPanel`, `MatchDetailTabs`(본문만),
  `MatchDetailScreen`(탭 상태 소유).
- `apps/web/app/live/_components/`: `MatchViewTabs`, `MatchChatPanel`, `MatchDetailScreen`.
- `apps/{mobile,web}/app/_constants/live.ts`, `_types/live.ts`: 탭 조합·라벨·거절 문구.
- `.env.example`, `turbo.json`: `CHAT_WS_URL`.

TanStack Query는 안 썼다. 요청과 응답이 아니라 열려 있는 연결이라 캐시할 값이 없고, 메시지는 경기
중에만 살아 화면을 떠나면 버려도 된다.

## 로컬에서 어떻게 확인했나

로컬 BE로는 채팅을 못 붙인다. 채팅 서버는 develop에 아직 없고(`feat/KAN-448-live-chat` 브랜치),
방 판정이 시즌 경기 캐시를 보는데 그 캐시는 외부 축구 API 키가 있어야 채워진다. 로컬 `.env`에
`FOOTBALL_API_KEY`가 없어서 라이브 API 6종이 전부 502다(ADR 0129 때와 같다).

그래서 둘로 갈랐다. 경기 상세는 BE `mock` 프로필(8081, 경기 900002 라이브·900003 예정)에서 받고,
채팅은 명세대로 동작하는 목 웹소켓 서버를 node로 짜서 8090에 띄웠다(`scripts/chat-mock/`, `npm i && npm start`). 배열 프레임, 입장 시 최근 20개,
100ms 묶음, `EMPTY_MESSAGE`·`MESSAGE_TOO_LONG` 거절, 그리고 `POST /kick?retry=`로 전원을 4000
`retry=` 사유로 끊는 배포 시뮬레이션까지. `CHAT_WS_URL=ws://localhost:8090/ws/chat`으로 FE를
띄우면 두 서버가 각자 제 몫을 한다. 이 조합을 `.claude/launch.json`의 `mobile-chat`·`web-chat`으로
남겼다.

사용자가 `pnpm dev`를 띄워 둔 상태라 Next 16이 같은 앱의 두 번째 `next dev`를 거부했다. 지난번과
같이 `API_BASE_URL=http://localhost:8081 pnpm build` 뒤 `next start`로 우회했다.

## 확인한 것

목 서버 조합으로 티켓의 확인 항목을 하나씩 돌렸다.

- 모바일과 웹 창 둘이 같은 방(900003)에 붙어 서로의 메시지가 보인다. 웹에서 보낸 것이 모바일
  목록 끝에 붙었고 그 반대도 됐다.
- 입장하면 최근 20개가 순서대로 뜬다. 목 서버에 25건을 심고 들어가니 20건이 한 프레임으로 왔다.
- 200자 초과는 `maxLength`가 막지만 값을 프로그램으로 넣어 우회하니 서버가 `MESSAGE_TOO_LONG`을
  돌려줬고 입력바 밑에 "200자까지 보낼 수 있어요"가 떴다. 입력값은 남아 있다.
- 4000 `retry=6000`으로 끊으니 "다시 연결하는 중…" 띠와 비활성 입력바가 6초 넘게 유지되다
  붙었다. 끊긴 동안 온 메시지가 없어 다시 받은 최근 20개는 전부 중복으로 걸러져 목록 길이가
  그대로였다.
- 방이 안 열린 경기(목 서버가 900001을 404로 거절)는 세 번 두드리고 멈췄다. 화면은 안 깨진다.
- 비로그인은 탭 안에 "로그인이 필요해요"와 로그인 버튼이 뜬다.
- 새 메시지 자동 스크롤은 목록 끝에 붙어 있을 때만 따라간다.

한 번 헤맨 것이 있다. 라이브 경기(900002)의 채팅 탭이 처음엔 "채팅방이 닫혔어요"로 떴다.
킥오프가 오늘 23시고 지금이 13시라 계산이 맞지 않았다. 원인은 코드가 아니라 `.next/cache`의
fetch 캐시였다. `getMatchDetail`이 `revalidate: 20`이라 Next가 응답을 디스크에 남기는데,
지난 세션에 mock 프로필로 빌드했을 때의 응답(킥오프가 9월 7일)이 그대로 있다가 `next start`
첫 요청에 stale로 나갔다. 헤더 날짜가 "9월 7일 (월)"로 찍힌 걸 보고 알았다. 다시 로드하니
오늘 날짜로 오고 붙었다. 목 데이터에 날짜가 박혀 있으면 fetch 캐시가 하루 전 것을 돌려줄 수
있다는 걸 기억해 둔다.

## 막힌 것과 남은 것

- dev 공개 경로. 처음엔 인프라 작업이 셋 남았다고 적었는데, PR을 올린 뒤 aws CLI로 dev 리소스를
  읽어 보니 대부분 이미 돼 있었다. 공개 ALB(`plick-alb-pub`) 443 리스너에 우선순위 30으로
  `dev-api.plick.co.kr` → `tg-main-pub`(백엔드 EC2 두 대, healthy) 규칙이 있고, Route 53에 A 레코드도
  있고, BE dev env(`/plick/main/dev/env`)의 `CORS_ALLOWED_ORIGINS`에 `dev.plick.co.kr`과 `dev-m.plick.co.kr`이
  들어 있고 `CHAT_OPEN_BEFORE=720h`까지 잡혀 있었다. Confluence 문서가 "남은 결정"이라 적은 뒤 BE 쪽이
  처리한 모양이다. 남은 건 FE SSM env(`/plick/frontend/{mobile,web}/dev/env`)에
  `CHAT_WS_URL=wss://dev-api.plick.co.kr/ws/chat` 한 줄뿐이다. 배포 스크립트가 설치 단계에서 SSM을
  읽어 `.env`를 만드니 머지 전에 넣어 둬야 첫 배포부터 값이 실린다.
- 대신 다른 게 걸린다. 공개 ALB 보안 그룹이 443을 CloudFront origin-facing 프리픽스 리스트와 고정 IP
  두 개에만 열어 뒀다. `dev-api`는 CloudFront를 안 거치고 ALB로 바로 가는 호스트라 그 IP 둘에서만
  닿는다. 이 세션을 돌린 맥의 공인 IP는 목록에 없어서 `curl https://dev-api.plick.co.kr/health`가
  타임아웃이었다. dev에서 채팅을 확인하려면 확인하는 자리의 IP를 보안 그룹에 넣거나 목록에 있는
  망에서 봐야 한다. 이건 dev를 닫아 둔 정책이라 열 일이 아니다.
- 채팅 서버 자체가 BE develop에 아직 없다. `feat/KAN-448-live-chat` 브랜치가 dev에 배포돼 있다는
  게 티켓의 말이지만 develop 머지 여부는 BE 쪽 일이다.
- 로컬 BE에 `FOOTBALL_API_KEY`가 없어 실제 BE로는 붙어 보지 못했다. 목 서버는 계약 문서대로
  만들었지만 실서버가 보내는 프레임 형태(특히 `sentAt` 형식, `ERROR` 프레임의 null 필드)는
  dev에서 한 번 더 봐야 한다.
- 차단한 사용자의 메시지 거르기. 프레임에 `userId`가 있어 나중에 붙일 수 있다.
