# 0065. 로그인 요청에 redirectUri 동봉 (KAN-341)

## 무엇을 했나

BE가 소셜 로그인 API 계약을 바꿨다(KAN-335). `POST /api/v1/auth/login`의 요청 본문이
`{ provider, code }`에서 `{ provider, code, redirectUri }`로 바뀌었고 `redirectUri`는 필수가 됐다.
웹과 모바일 양쪽의 로그인 마무리 서버 액션이 이 필드를 함께 보내도록 고쳤다.

바꾼 파일은 앱마다 두 개씩이다. `_services/oauth.ts`에서 파일 내부 전용이던 `redirectUri()` 헬퍼를
`getRedirectUri()`로 이름을 바꿔 export했고, `_services/auth.ts`의 `login`이 그 값을 본문에 실어 보낸다.

## 왜 바뀌었나

배경을 이해하려면 OAuth 인가 코드 그랜트에서 `redirect_uri`가 두 번 쓰인다는 걸 알아야 한다.
한 번은 인가 요청 때(프로바이더가 code를 어디로 돌려보낼지), 또 한 번은 code를 토큰으로 교환할 때다.
프로바이더는 두 값이 정확히 일치하는지 검증한다. 인가 코드를 가로챈 공격자가 다른 주소로
토큰을 빼돌리는 걸 막는 장치다.

지금까지 BE는 교환 때 쓸 `redirect_uri`를 서버 env 단일 고정값으로 갖고 있었다. 프런트 origin이
하나일 때는 문제가 없었는데, 이제 로컬(:3001)과 `plick.co.kr`, `m.plick.co.kr` 세 곳에서 로그인이
일어난다. BE는 인가 코드가 어느 origin에서 시작됐는지 알 방법이 없으니, 고정값과 다른 origin에서
온 로그인은 전부 `redirect_uri_mismatch`로 깨진다.

그래서 BE가 방향을 바꿨다. 프런트가 자기가 인가 요청에 썼던 콜백 주소를 로그인 요청에 같이 보내고,
BE는 그 값을 제공자별 허용목록(allowlist)과 대조해 통과할 때만 교환에 쓴다. 허용목록 밖이면
`AUTH_INVALID_REDIRECT_URI`(400)로 끊는다. 프런트가 보낸 값을 그대로 믿지 않는 이유는, 검증 없이
쓰면 임의 redirect_uri로 자격을 오용할 수 있어서다.

## 어떻게 고쳤나

프런트 쪽 핵심 제약은 하나다. 로그인 본문의 `redirectUri`가 인가 요청 때 쓴 값과 바이트 단위로
같아야 한다. 다행히 우리 코드는 이미 그 값을 한 곳에서 만들고 있었다. `_services/oauth.ts`의
`redirectUri()` 헬퍼가 `OAUTH_REDIRECT_URI` env(없으면 로컬 기본값)를 읽어 인가 URL 조립에 쓰고
있었다. 이 함수를 export해서 `login`도 같은 출처를 쓰게 하면 두 값이 어긋날 길이 없다.

이름은 `getRedirectUri`로 바꿨다. export하고 나니 호출부에서 `redirectUri: redirectUri()`처럼
필드명과 함수명이 겹쳐 읽기 나빴다.

`login`의 시그니처는 그대로 뒀다. 콜백 라우트가 넘겨주는 건 여전히 provider와 code뿐이고,
redirectUri는 요청마다 달라지는 값이 아니라 서버 환경에서 결정되는 값이라 인자로 받을 이유가 없다.
서버 액션 안에서 직접 읽는 게 맞다.

웹과 모바일은 같은 구조의 복제라(KAN-318) 두 앱에 같은 수정을 반복했다. 기본 콜백 포트만
다르다(웹 3000, 모바일 3001).

## 검증에서 막힌 것

이 변경은 브라우저 프리뷰로 끝까지 검증할 수 없다. 실제 로그인 왕복에는 프로바이더가 발급한
살아 있는 인가 code가 필요한데, 그건 콘솔에 등록된 콜백으로만 받을 수 있다. 그래서 검증은
타입·린트·포맷 통과와 BE 계약 대조(스웨거의 `LoginRequest`에 `redirectUri` 필수 필드가 있는지)로
갈음했다.

같은 이유로 배포 환경에서는 코드 밖 조건 두 개가 맞아야 실제로 동작한다. BE 허용목록 env
(`OAUTH_*_REDIRECT_URIS`)와 구글·카카오 콘솔 등록값에 우리 콜백 주소
(`{origin}/oauth/callback`)가 들어 있어야 한다. 프런트 배포의 `OAUTH_REDIRECT_URI`가 그 목록과
어긋나면 BE 검증(400) 또는 프로바이더 검증(mismatch)에서 끊긴다.

## 관련

- BE 작업 기록: 컨플루언스 38535173 (KAN-335, plick-backend PR #11)
- 소셜 로그인 원 구현: KAN-257(모바일) · KAN-318(웹 이식)
