# 0023. 실서버 붙이니 소셜 로그인이 깨졌다 — provider enum 대소문자, 그리고 redirect_uri 불일치

## 무슨 일이 있었나

목서버로는 잘 되던 OAuth 로그인이, 로컬에 실제 백엔드를 켜자마자 "소셜 로그인에 실패했어요"로 떨어졌다. 화면 문구만 보면 어디서 죽었는지 알 수 없어서 경로를 거꾸로 짚었다. 이 문구는 `/login?error=oauth`일 때 뜨고, `error=oauth`는 콜백 라우트(`app/oauth/callback/route.ts`)가 세 경우에 붙인다 — code/state 누락, state 불일치, 그리고 BE 로그인 호출 실패. 어느 쪽인지 확인하려고 백엔드에 직접 curl을 쏴봤다.

```
{"provider":"kakao","code":"test"}  → 400 COMMON_INVALID_PARAM
{"provider":"KAKAO","code":"test"}  → AUTH_OAUTH_EXCHANGE_FAILED (다음 단계까지 감)
```

원인이 바로 나왔다. 스웨거를 보니 BE의 `LoginRequest.provider`는 `enum: ["GOOGLE", "KAKAO", "NAVER"]` — **대문자 enum**이었다. 프론트 도메인 타입 `SocialProvider`는 `"kakao" | "google"` 소문자였고, 스프링이 enum 역직렬화에 실패하면서 검증 400을 돌려준 거다. 목서버는 provider 값을 검증하지 않아서 그동안 안 드러났다. 실서버를 붙이는 순간 계약 차이가 터지는, mock→real 전환의 전형적인 봉합점이었다.

## 반쪽 수정의 함정

처음엔 타입과 버튼이 넘기는 값만 대문자로 바꿨는데, 이번엔 카카오 페이지로 넘어가기도 전에 죽었다. `OAUTH_AUTHORIZE` 맵(constants.ts)의 키가 여전히 소문자 `kakao`/`google`이라 `OAUTH_AUTHORIZE["KAKAO"]`가 `undefined`가 됐고, 인가 URL 조립의 구조분해에서 throw → 서버 액션 catch → 에러 문구. 같은 문구인데 죽는 지점이 완전히 달라진 거다. 이런 반쪽 마이그레이션은 `pnpm check-types`가 즉시 잡아준다(`Record<SocialProvider, …>` 키 불일치) — 값 문자열을 바꿀 땐 타입 검사부터 돌리는 게 맞았다.

## 결정 — 대문자로 전부 통일

선택지는 둘이었다. (1) 도메인은 소문자로 두고 BE로 나가는 `login`의 body에서만 `toUpperCase()` 변환, (2) 도메인 타입·버튼·`OAUTH_AUTHORIZE` 키까지 대문자로 통일. 경계 변환(1)이 "대문자는 BE 사정"이라는 관점에선 깔끔하지만, provider 값이 스치는 지점이 타입·버튼·인가 맵·state 쿠키(`KAKAO:uuid`)·BE body로 꽤 많아 표기가 두 벌이면 오히려 헷갈린다고 봐서 **(2) 대문자 통일**로 갔다. 이제 프론트 전체가 BE enum 표기 하나만 쓴다. 나중에 이 값이 UI에 노출될 일이 생기면 그때 표시용 매핑을 따로 두면 된다.

검증은 두 갈래로 했다. 인가 리다이렉트 쪽은 브라우저로 카카오 버튼 클릭 → accounts.kakao.com 진입 확인. BE 쪽은 위 curl로 `"KAKAO"`가 검증을 통과해 code 교환 단계까지 가는 것 확인(가짜 code라 교환 실패는 정상). 실제 계정 로그인부터 온보딩까지는 손으로 한 번 태워보면 된다.

## 후속 — 그래도 안 뚫렸다: BE redirect_uri 불일치

대문자 통일 후 실제 카카오 계정으로 끝까지 태워봤는데 여전히 콜백에서 307 → `/login?error=oauth`로 떨어졌다. 이번엔 프론트 문제가 아니었다. 로컬 백엔드 프로세스를 따라가 보니(8080을 물고 있는 java 프로세스의 cwd가 `~/Documents/plick-backend`) BE `.env`의 `OAUTH_KAKAO_REDIRECT_URI`가 `http://localhost:8080/oauth/callback`으로 잡혀 있었다.

이게 왜 문제인가 하면, **인가 코드 그랜트에서 redirect_uri는 두 번 쓰인다.** 한 번은 프론트가 인가 요청에 실어 보내고(카카오가 code를 어디로 돌려보낼지), 또 한 번은 백엔드가 code를 액세스 토큰으로 바꾸는 교환 요청에 실어 보낸다. 카카오는 이 둘이 **정확히 일치**해야 code를 인정한다 — code 가로채기(다른 주소로 빼돌린 code로 토큰을 받는 공격)를 막는 스펙상의 장치다. 우리 구조에선 콜백을 프론트(`:3001/oauth/callback`)가 받아 code만 BE에 넘기므로, BE가 교환 때 내미는 redirect_uri도 프론트 주소여야 한다. BE 코드(`KakaoOAuthClient`)는 설정값을 그대로 교환 폼에 싣고 있었으니, `.env`가 8080을 가리키는 한 카카오가 교환을 거부하고 `AUTH_OAUTH_EXCHANGE_FAILED`로 떨어진 거다.

client_id는 FE·BE가 같은 앱을 보고 있어 문제없었고, BE `.env`의 카카오·구글 redirect URI를 `http://localhost:3001/oauth/callback`으로 맞추는 것으로 해결했다(BE 재시작 필요 — `.env`는 기동 시점에 읽힌다). 교훈: 콜백을 프론트가 받는 구조에선 **redirect_uri가 FE env와 BE env 두 군데에 중복 선언**되고, 하나만 바뀌면 인가는 되는데 교환만 실패하는 헷갈리는 증상이 난다. 이 값은 사실상 하나의 계약이니 로컬 세팅 문서에 짝으로 적어두는 게 좋다.

## 후속 2 — 이번엔 500: Redis가 없었다

redirect_uri를 맞추고 BE를 재시작해도 여전히 `error=oauth`로 떨어졌다. 어디서 죽는지 문구만으론 알 수 없어 콜백·`login`에 임시 디버그 로그를 넣었고, 진짜 코드로 태워보니 이번엔 BE 응답이 `AUTH_OAUTH_EXCHANGE_FAILED`가 아니라 **`500 COMMON_INTERNAL_ERROR`**였다. 교환은 통과했는데 그 뒤에서 터진다는 뜻이다. 참고로 교환 설정이 맞는지는 로그인 없이도 검증할 수 있었다 — BE가 보내는 것과 똑같은 토큰 요청을 가짜 code로 카카오에 직접 쏘면, 카카오가 client_id→secret→redirect_uri를 먼저 검증하므로 `KOE320`(code not found)이 나오면 나머지 설정은 전부 통과한 거다.

500의 정체는 인프라였다. BE 로그인 후속 처리가 `AuthService` → `RefreshTokenStore`로 리프레시 토큰을 **Redis**에 저장하는데, 로컬에 Redis가 안 떠 있었다(6379 닫힘). DB는 원격 Supabase라 멀쩡했고, BE는 Redis 없이도 기동은 되니(연결이 요청 시점에 일어남) 로그인 때만 터졌다. `docker run redis:7-alpine`으로 Redis를 올려 해결. Lettuce는 요청마다 재연결을 시도하므로 BE 재시작은 필요 없다.

정리하면 mock→real 전환에서 세 겹이 순서대로 벗겨졌다: ① 계약 차이(enum 대소문자) → ② 환경 불일치(redirect_uri 이중 선언) → ③ 인프라 부재(Redis). 전부 화면에선 같은 문구 하나로 보였다는 게 핵심 교훈이다.

## 남긴 것

- 실패 세 경로가 전부 같은 `?error=oauth` 문구로 뭉개진다. 디버깅 때 dev 서버 터미널 로그 없이는 구분이 안 되니, 다음에 손댈 일 있으면 콜백에서 실패 사유별 로그라도 남기는 게 좋겠다.
- 관련: [ADR 0022](0022-mobile-oauth-login.md) (OAuth 로그인 구현), [ADR 0019](0019-mobile-auth-login-api.md) (로그인 API 연결).
