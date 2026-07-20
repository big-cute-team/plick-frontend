# ADR 0019 — 모바일 로그인 API 연결 (KAN-253)

- **상태:** Accepted
- **날짜:** 2026-07-20
- **관련:** [ADR 0017 API 연결 전략](0017-api-integration-strategy.md) · [ADR 0011 공용 경계](0011-shared-code-boundary.md) · `api-integration` 스킬

퍼블리싱만 돼 있던 모바일 로그인 화면에 처음으로 진짜 BE를 붙였다. 엔드포인트는 `/api/v1/auth/login` 하나. 첫 API 연결이라 스킬이 시키는 대로 앱별로만 붙이고, 공용화는 손대지 않았다.

## 스웨거부터 열어봤다

티켓엔 경로만 있어서 스웨거(`localhost:8080/v3/api-docs`)를 먼저 읽었다. 로그인은 `provider`·`code`를 body로 받고, 응답은 `{ code, message, data }` 봉투 안에 `accessToken`·`refreshToken`·`needsOnboarding`을 담아 준다. 태그가 `mock-auth`라 아직 진짜 OAuth는 아니고, `code`가 `"existing"`이면 기존 유저, 아니면 신규 자동가입으로 `needsOnboarding=true`를 준다.

실제로 curl로 때려보니 응답 봉투가 모든 엔드포인트 공통이었다. 그래서 `apiFetch`를 만들 때 아예 봉투를 벗겨 `data`만 돌려주도록 했다. 에러도 봉투에 `code`(예: `COMMON_INVALID_PARAM`)로 오길래 `ApiError`에 그 코드를 실어 두었다. 나중 엔드포인트들도 같은 봉투라 이 래퍼를 그대로 재활용할 수 있을 것이다.

## 토큰을 어디 두느냐가 유일한 고민이었다

로그인은 단발 읽기가 아니라 "토큰을 받아서 저장하는" 쓰기라, 스킬의 서버 fetch/RQ 분기표엔 딱 안 맞았다. 뮤테이션이지만 낙관적 업데이트가 필요한 것도 아니어서 RQ를 깔 이유가 없었다. 그래서 **서버 액션** 하나로 처리했다. 버튼이 서버 액션을 부르면, 서버가 BE에 로그인하고 받은 토큰을 **HttpOnly 쿠키**로 심은 뒤 홈으로 redirect한다.

HttpOnly로 간 건 토큰을 JS에 노출하지 않으려는 것. 검증할 때 임시 라우트를 만들어 확인해 보니, 서버는 쿠키를 읽는데 `document.cookie`엔 안 잡혔다 — 의도한 대로였다. 나중에 보호 API가 생기면 서버 컴포넌트가 이 쿠키에서 accessToken을 읽어 Bearer로 실으면 된다. 그 주입 자리는 `apiFetch` 헤더에 주석으로만 열어 뒀다.

`needsOnboarding`은 일단 무시하고 무조건 홈으로 보냈다. 온보딩 라우트가 아직 API와 연결이 안 됐고, 이 티켓은 로그인 하나만 붙이는 거라 분기는 온보딩 티켓에서 잇기로 했다.

## 화면은 거의 안 건드렸다

`AuthScreen`은 서버 컴포넌트로 두고, 카카오/구글 버튼 묶음만 `SocialLoginActions`라는 클라 경계로 뽑았다. 여기서 `useTransition`으로 진행 중 버튼을 잠그고, 액션이 실패 메시지를 주면 버튼 아래 `text-danger`로 띄운다. 성공하면 서버가 redirect하니 클라는 할 일이 없다.

`SocialLoginButton`(공용 `@plick/ui`)에 `onClick`·`disabled`만 열어 줬다. 원래 표현 전용이라 핸들러가 없었는데, 두 prop을 옵셔널로 더한 정도라 웹 쪽 사용처는 그대로 컴파일된다. 공용을 건드린 셈이라 웹까지 클린 빌드로 회귀를 확인했다.

로그인·회원가입이 같은 `AuthScreen`을 쓰니 액션도 자동으로 양쪽에 붙었다. 회원가입 버튼도 같은 `login`을 부른다 — mock-auth라 provider만 맞으면 신규 유저를 만들어 주기 때문에, 지금 단계에선 로그인/가입이 같은 호출이다.

## 공용화는 안 했다

`apiFetch`도 로그인 fetcher도 mobile `_lib`에만 뒀다. 스킬 게이트대로 첫 앱은 앱별. 웹에도 같은 로그인 화면이 있어서 두 번째로 붙일 때 `apiFetch`가 같은 봉투·같은 쿠키 규약을 쓰게 되면, 그때 `@plick/core` 같은 데로 올릴지 판단하면 된다. 지금 미리 빼면 웹에서 안 쓰는 추상화를 떠안는 꼴이라 참았다.

## 막힌 데

lint가 `API_BASE_URL`·`NODE_ENV`를 turbo가 모르는 env라고 경고를 띄웠다. `turbo.json`에 `globalEnv`로 선언해 풀었다. 이걸 안 하면 turbo 캐시가 env 변화를 못 읽어 잘못된 캐시를 줄 수 있으니 경고가 맞다.

검증은 실제 BE에 붙여 네 상태를 다 밟았다. 성공(쿠키 심김·홈 이동), 신규 유저(구글, 역시 홈), 에러(BE 포트를 죽은 걸로 바꿔 실패 메시지 확인), 회원가입 경로까지. mock의 "항상 성공·즉시"에 속지 말라는 스킬 경고가 실제로 유효했다 — 에러 상태는 BE를 꺼봐야 재현됐다.
