# 0022 — 모바일 OAuth 로그인 실질 구현 (KAN-257)

[ADR 0019](0019-mobile-auth-login-api.md)에서 로그인 API를 붙일 때 `code: "mock"` 고정
문자열을 보내며 "실제 OAuth가 붙으면 이 자리를 교체한다"고 봉합점만 남겨뒀는데, 이번
세션에서 그 자리를 진짜로 갈아끼웠다. 이제 카카오/구글 버튼을 누르면 실제 프로바이더
인가 페이지로 넘어가고, 동의하고 돌아오면 프로바이더가 준 인가 코드로 로그인이 완성된다.

구현하고 나서 흐름을 되짚는 질문을 여러 번 받았다(나중의 나 포함). 그래서 이 글은 구현
기록이면서 동시에 "OAuth 로그인이 우리 코드에서 어떻게 도는가"를 처음부터 끝까지 다시
설명하는 글이다. 좀 길지만, 이거 하나 읽으면 다른 데 되물을 필요가 없게 쓰는 게 목표다.

## 시작하기 전에 — 등장인물 넷과 원칙 하나

이 흐름에는 네 주체가 나온다. ① **브라우저**, ② **Next 서버**(`:3001`), ③ **카카오/구글**,
④ **BE**(`:8080`). 흔히 "프론트엔드"를 브라우저와 동일시하는데, Next 앱은 서버가 따로
있다는 걸 먼저 잡아야 한다. 페이지를 렌더하는 것도, 서버 액션·라우트 핸들러·미들웨어가
도는 것도 전부 Next 서버다. 즉 우리 시스템엔 서버가 둘(Next 서버, BE) 있고, 브라우저는
Next 서버·프로바이더와만 대화하며 **BE의 존재 자체를 모른다**. BE 호출은 전부 Next
서버가 대신하는 서버↔서버 통신이다.

관통하는 원칙은 하나다: **토큰은 브라우저 JS에 절대 노출하지 않는다.** 토큰은 HttpOnly
쿠키에만 산다. HttpOnly 쿠키는 브라우저가 매 요청에 자동으로 실어 보내지만
`document.cookie`로는 읽을 수 없는 쿠키다. 그래서 XSS로 악성 스크립트가 주입돼도 토큰을
훔칠 수 없고, 토큰을 읽고 쓰고 BE와 교환하는 주체는 항상 Next 서버가 된다. 이 구조는
ADR 0019 때 정한 것이고 이번 OAuth도 그 위에 그대로 얹었다.

## 프로바이더란 무엇인가

코드 곳곳에 나오는 `provider`부터. 프로바이더는 **"이 사람이 누구인지"를 우리 대신
보증해주는 외부 서비스**다. 전통적 로그인은 서비스가 직접 비밀번호를 저장해두고
대조하는 방식인데, PLick은 비밀번호를 아예 받지 않는다. 대신 "카카오에 계정 있으시죠?
카카오한테 본인 인증하고 오세요. 카카오가 보증하면 믿을게요"라고 위임한다. 이때 보증을
제공(provide)하는 쪽이 프로바이더다. 신분증에 비유하면 PLick은 신분증을 확인하는
가게고, 카카오/구글은 신분증을 발급한 기관이다.

코드에서 `provider`는 "어느 보증기관에 위임할지"를 나타내는 문자열일 뿐이다
(`_lib/api/types.ts`의 `SocialProvider = "kakao" | "google"`). 기관마다 인가 창구
주소와 우리 앱의 등록번호(client_id)가 달라 `constants.ts`의 `OAUTH_AUTHORIZE[provider]`로
세트를 고르고, 콜백 착지점은 두 기관 공용이라 어느 쪽에서 돌아왔는지를 state 쿠키에
적어뒀다 복원한다. BE에도 `{provider, code}`로 함께 보내는데, code는 발급한 기관에만
제시할 수 있어 BE가 어디로 검증하러 갈지 알아야 하고, 같은 사람이어도 카카오 회원번호와
구글 계정은 별개 신원이라 BE가 기관별로 매핑해 관리해야 하기 때문이다. 나중에 네이버를
추가한다면 `SocialProvider`에 값 하나, `OAUTH_AUTHORIZE`에 세트 하나 늘리는 게 전부다 —
흐름 자체는 모든 프로바이더가 같은 OAuth 규약을 따르므로 그대로 재사용된다.

## 로그인 한 번의 왕복 — 코드 순서대로

OAuth 인가 코드 그랜트(authorization code grant)는 "프로바이더에게 사용자를 보내
동의를 받고, 그 증표(code)를 돌려받아 토큰과 바꾸는" 왕복이다. 우리 코드에선 이렇게
흐른다.

**1) 버튼 클릭 — `_components/SocialLoginActions.tsx`.** `"use client"` 컴포넌트라
브라우저에서 돈다. 버튼을 누르면 `startSocialLogin(provider)`를 부르는데, 여기가
오해하기 쉬운 지점이다. 이건 브라우저에서 함수가 실행되는 게 아니다.
`startSocialLogin`은 `"use server"` 파일에서 import한 **서버 액션**이라, 브라우저가
실제로 하는 일은 Next 서버로 POST 요청을 보내는 것이고 함수 본문은 전부 서버에서
실행된다. 브라우저 쪽 코드는 그 결과(`{error}` 또는 redirect 지시)만 받는다.

**2) OAuth 시작 — `_lib/api/auth.ts`의 `startSocialLogin`.** 서버에서 세 가지를 한다.
CSRF 방지용 `state` 난수를 만들고(아래 state 절에서 자세히), `oauthState` HttpOnly
쿠키(10분)에 `kakao:난수` 꼴로 심고 — 응답의 `Set-Cookie` 헤더로 브라우저에 내려간다 —
`_lib/api/oauth.ts`의 `buildAuthorizeUrl`로 인가 URL(client_id·redirect_uri·state 쿼리
포함)을 조립해 `redirect()`한다. 서버 액션의 `redirect()`는 앱 안 경로면 소프트
내비게이션이지만 외부 절대 URL이면 실제 브라우저 이동으로 처리된다. 프로바이더
사이트로 나가는 거니 당연히 그래야 한다.

**3) 프로바이더 왕복 — 우리 코드가 안 도는 유일한 구간.** 사용자가 카카오/구글에서
로그인하고 동의하면, 프로바이더가 브라우저를 미리 등록된 `redirect_uri`
(= `:3001/oauth/callback`)로 돌려보내며 `?code=…&state=…`를 붙여준다. 이때 브라우저는
아까 받아둔 `oauthState` 쿠키를 자동으로 실어 보낸다. 카카오 사이트에서 우리 사이트로
넘어오는 cross-site 이동인데도 쿠키가 실리는 건 쿠키 옵션이 `sameSite: "lax"`이기
때문이다 — lax는 "최상위 GET 내비게이션에는 쿠키를 허용"하는 규칙이라 정확히 이 왕복을
살려준다. `strict`였으면 여기서 흐름이 죽는다.

**4) 콜백 검증 — `app/oauth/callback/route.ts`.** 페이지가 아니라 GET 라우트 핸들러로
만들었다. 렌더할 UI가 없고, 쿼리를 읽고 쿠키를 소모하고 redirect로 끝나는 순수 처리
구간이라서다. Next에서 `cookies().set()`은 서버 액션과 라우트 핸들러에서만 허용되는데
콜백은 후자라 문제없다. 여기서 쿼리의 `state`와 쿠키 속 난수를 대조하고(아래 절),
사용자가 동의 창에서 취소한 경우(code 없이 `?error=`만 옴)·state 불일치·BE 실패는
전부 `/login?error=oauth`로 보낸다. 로그인 페이지가 이 쿼리를 읽어
`SocialLoginActions`의 에러 자리(원래 클라 상태로 그리던 곳의 `useState` 초기값)에
"소셜 로그인에 실패했어요"를 띄운다.

**5) 토큰 교환 — `auth.ts`의 `login(provider, code)`.** 검증을 통과하면 Next 서버가
BE에 `{provider, code}`를 POST한다(서버↔서버). BE가 — 실구현에선 code를 프로바이더
토큰과 교환해 유저를 확인하고 — `{accessToken, refreshToken, needsOnboarding}`을
돌려준다. 기존 `login`은 시그니처에 `code` 인자만 추가됐고 나머지는 그대로다.

**6) 쿠키 저장과 착지.** `cookies().set()`으로 accessToken(15분)·refreshToken(14일)을
HttpOnly 쿠키로 심고 — 역시 `Set-Cookie`로 브라우저에 전달 — `needsOnboarding`이
true면 `/onboarding/nickname`, 아니면 `/`로 redirect한다.

**7) 이후.** 서버 컴포넌트는 `session.ts`의 `isLoggedIn()`으로 요청 쿠키에 accessToken이
있는지만 본다. 루트 레이아웃이 이 값을 `AuthProvider`에 시드해 클라 컴포넌트는
`useAuth()`로 읽는다(UX 신호일 뿐 인가 아님 — [ADR 0021](0021-mobile-auth-refresh-middleware.md)).
access 쿠키가 15분 뒤 소멸하면 재발급 미들웨어가 이어받는데, 그건 ADR 0021의 영역이다.

## redirect_uri를 어디로 받을 것인가 — 티켓과 다르게 간 결정

티켓에는 redirect_uri가 `http://localhost:8080/oauth/callback`(BE)으로 적혀 있었다.
그런데 실제로 쳐보니 BE에 그 엔드포인트가 없고(404), BE 계약은 여전히 "FE가
`{provider, code}`를 POST하는" `/api/v1/auth/login`이다. 즉 **code를 손에 쥐어야 하는
쪽은 FE**다. redirect_uri를 BE로 보내면 code가 BE 주소로 떨어져 FE는 영영 못 보고,
로그인을 완성할 방법이 없다.

그래서 redirect_uri를 FE 콜백(`http://localhost:3001/oauth/callback`)으로 잡았다.
이러면 기존 인프라(서버 액션이 FE 도메인에 HttpOnly 쿠키를 심는 구조)가 그대로 살고,
BE는 나중에 code를 프로바이더 토큰과 실제로 교환하는 로직만 채우면 된다. 티켓의
"추후 배포환경으로 변경"은 `OAUTH_REDIRECT_URI` env로 풀었다 — client_id 둘과 함께
env로 빼서 배포 때 값만 갈면 된다(client_id는 인가 URL에 그대로 노출되는 공개
식별자라 `.env.example`에 실값을 넣어도 된다).

검증해 보니 카카오 콘솔에는 `:3001` 콜백이 등록돼 있어 인가 페이지까지 정상 진입했고,
**구글은 `redirect_uri_mismatch`가 떴다 — 구글 클라우드 콘솔에
`http://localhost:3001/oauth/callback`을 승인된 리디렉션 URI로 등록해야 한다.** 이건
코드가 아니라 콘솔 설정 문제라 FE 쪽에서 할 수 있는 일이 없다.

## state — 왜 필요하고, 어떻게 만들고, 어디서 대조하나

`state`는 "이 콜백이 정말 내가 시작한 인가 요청의 응답인가"를 확인하는 난수다.

**규약상 필수인가?** 아니다 — OAuth 2.0 원본 규격(RFC 6749)에서 state는
RECOMMENDED(권장)이지 REQUIRED가 아니고, 빼도 카카오/구글은 인가를 정상 처리해 준다.
다만 이후의 보안 권고(RFC 9700, OAuth 2.0 Security BCP)가 "CSRF 방어 수단을 반드시
갖춰라 — state든 PKCE든"이라고 못 박았고 프로바이더 문서들도 강권한다. 문법상 생략
가능하지만 보안상 생략하면 안 되는 파라미터다.

**없으면 뭐가 뚫리나.** 공격자가 자기 계정으로 인가를 진행해 code를 얻은 뒤, 그 콜백
URL(`/oauth/callback?code=공격자코드`)을 피해자에게 밟게 하면 피해자 브라우저가
공격자 계정으로 로그인된다. 이후 피해자가 그 계정에 카드를 등록하거나 활동 기록을
남기면 공격자가 자기 계정에서 다 들여다보는 세션 고정(login CSRF) 공격이다. state
대조가 있으면 피해자 브라우저엔 대응되는 쿠키가 없으니 콜백이 거부된다.

**난수는 어떻게 만드나.** `auth.ts`의 `crypto.randomUUID()` 한 줄이다. 여기서
`crypto`는 Node 22 전역의 Web Crypto API로, `Math.random()`과 달리 CSPRNG(암호학적으로
안전한 난수 생성기 — OS 엔트로피를 쓰기 때문에 이전 출력값을 아무리 관찰해도 다음 값을
예측할 수 없는 생성기)를 쓴다. 결과는 UUID v4 형식으로 122비트의 난수가 들어 있어
추측이 현실적으로 불가능하다. `Math.random()`은 예측 가능한 일반 난수라 보안 용도로는
금물이다.

**대조는 어디서 하나.** `app/oauth/callback/route.ts`다. 쿼리의
`state`(`returnedState`)와 쿠키 값(`kakao:난수`)을 `parseOAuthState`로 되가른 뒤
`stored.state !== returnedState`면 실패로 보낸다. 쿠키 값에 프로바이더를 같이 태운
이유는 위 프로바이더 절에 썼고, 쿠키는 대조 결과와 무관하게 읽자마자 지워 일회용으로
만들었다 — 같은 콜백 URL을 다시 밟아도(뒤로가기, URL 복사) 두 번째부턴 쿠키가 없어
걸러진다.

**쿠키 옵션 하나가 걸렸다.** 콜백은 cross-site 내비게이션이라 `sameSite: "strict"`면
쿠키가 아예 실리지 않아 대조가 항상 실패한다. 기존 토큰 쿠키와 같은 `lax`를 써서
살렸다(위 3단계 참고).

## PKCE — state의 형, 그리고 왜 아직 안 붙였나

state를 이해하면 PKCE(Proof Key for Code Exchange, RFC 7636 — "픽시")는 같은
문제의식을 한 단계 밀어붙인 장치로 읽힌다. state가 막는 건 "남의 code가 내 콜백에
꽂히는 것"인데, 반대 방향 위협이 남는다 — **내 code를 남이 훔쳐가는 것**. code는 콜백
URL 쿼리스트링에 실려 다니는 짧은 문자열이라 서버 로그·브라우저 히스토리·리퍼러에
흔적이 남을 수 있고, 훔친 code를 공격자가 토큰 창구에 먼저 제시하면 세션을 탈취한다.
state는 여기서 무력하다 — state 대조는 우리 콜백에서 끝나는 검사고 토큰 교환 단계는
건드리지 못한다.

PKCE의 아이디어는 "code를 발급받은 자만 code를 현금화할 수 있게 하자"다. 물품 보관소
비유로: 맡길 때 비밀번호의 해시를 걸어두고, 찾을 때 원본 비밀번호를 대야 내준다.
구체적으로는 인가 시작 때 `code_verifier` 난수를 만들어 **SHA-256 해시**
(`code_challenge`)만 인가 URL에 동봉한다. 해시는 일방향이라 공개돼도 원본을 역산할 수
없다. 프로바이더는 code를 발급하며 challenge를 묶어 기억해두고, 토큰 교환 요청에
딸려온 원본 verifier를 직접 해시해 대조한 뒤 일치할 때만 토큰을 준다. 도둑이 code를
가로채도 verifier는 네트워크에 노출된 적이 없으니 무용지물이다.

state와의 차이를 한 줄씩 정리하면 — 검증하는 곳이 다르다(state는 우리 콜백에서 우리가,
PKCE는 토큰 창구에서 프로바이더가). 막는 공격이 다르다(state는 로그인 CSRF, PKCE는
code 탈취). 난수를 다루는 방식이 다르다(state는 원본 그대로 왕복 대조, PKCE는 원본을
숨기고 해시만 공개). 그리고 PKCE는 state의 역할까지 겸한다 — 공격자 code를 내 콜백에
꽂아도 토큰 교환 때 내 verifier와 그 code의 challenge가 안 맞아 어차피 실패한다.
그래서 RFC 9700은 "모든 클라이언트가 PKCE를 쓰라, 그러면 CSRF 목적의 state는 생략
가능"까지 간다. 방어력으로는 PKCE ⊃ state에 가깝다.

그럼에도 이번에 state만 쓴 이유: **우리 구조에선 토큰 교환을 BE가 담당**하기 때문이다.
PKCE를 붙이려면 verifier를 만든 FE가 원본을 콜백까지 들고 갔다가(쿠키로, state와 같은
방법) BE에 `{provider, code, codeVerifier}`로 넘겨야 하고 BE가 프로바이더 토큰 요청에
포함해야 한다. BE API 계약이 바뀌는 일이라 FE 혼자 결정할 수 없고, 지금 BE는 code 교환
자체가 mock이라 붙일 자리도 없다. 카카오·구글 둘 다 PKCE를 지원하니 BE가 실제 교환을
구현할 때 함께 넣자고 제안하는 게 맞는 타이밍이다. FE 추가 작업은 verifier 생성·쿠키
한 줄·바디 필드 하나 수준이라 가볍다.

## 재발급 미들웨어와의 충돌 방지

[ADR 0021](0021-mobile-auth-refresh-middleware.md)의 재발급 미들웨어는 "access 쿠키
없음 + refresh 있음"이면 네비게이션 중에 토큰을 갈아끼운다. 그런데 만료된 세션으로
OAuth를 다시 타는 사용자가 콜백에 착지하면, 미들웨어도 Set-Cookie를 쓰고 콜백 핸들러의
`login()`도 같은 이름의 쿠키를 쓴다 — 한 응답에 같은 쿠키의 Set-Cookie가 겹치면 어느
값이 남을지 보장이 없다. 콜백은 어차피 더 확실한 방법(새 로그인)으로 토큰을 얻는
중이니, 미들웨어 가드에 `/oauth` 경로를 추가해 비켜가게 했다.

## 테스트하다 만난 것 — 왜 매번 온보딩으로 가나

붙이고 나서 테스트하는데, 로그인→로그아웃→재로그인을 해도 계속 온보딩 페이지가 떴다.
회원가입과 로그인이 같은 API고 응답의 `needsOnboarding`으로만 갈리는 구조인데, 왜 기존
유저 취급을 못 받나 싶었는데 — FE 버그가 아니라 mock BE의 판정 방식 때문이었다. mock은
유저를 저장하지 않고 `needsOnboarding`을 오직 `code === "existing"` 문자열 비교로만
정한다. 그런데 이제 실제 OAuth가 붙었으니 BE로 가는 code는 프로바이더가 매번 새로
발급하는 일회용 랜덤 문자열이다. 절대 `"existing"`일 수 없으니 mock 입장에선 매번
"처음 보는 신규 유저"고, 항상 `needsOnboarding: true`가 온다. 로그아웃 여부는 무관하다
— BE가 아무것도 기억하지 않으니까. BE가 code를 프로바이더 토큰과 교환해 유저 ID로 DB를
조회하게 되면 자연히 해결되는, ADR 0019 때부터 예약된 봉합점이다. 그때까지 기존 유저
경로를 확인하고 싶으면 콜백을 직접 시뮬레이션하면 된다:

```bash
curl -i "http://localhost:3001/oauth/callback?code=existing&state=x" -H "Cookie: oauthState=kakao:x"
# → location: /  (온보딩 아님)
```

## 남은 일

- **구글 클라우드 콘솔에 `http://localhost:3001/oauth/callback` 등록** (위 참조).
  배포 시엔 실 도메인 콜백도 카카오·구글 양쪽에 등록하고 `OAUTH_REDIRECT_URI` 교체.
- BE가 code→프로바이더 토큰 교환을 실제 구현하면 mock-auth 딱지가 떨어지고
  `needsOnboarding`도 진짜 값이 온다. 그때 **PKCE 도입을 BE와 함께 논의**한다(위 PKCE 절).
- web(데스크톱)은 로그인 버튼이 아직 퍼블리싱만 된 상태라 이번 범위에서 제외했다.
  붙일 때가 되면 mobile의 `_lib/api` 인프라를 공용으로 승격할지부터
  [ADR 0011](0011-shared-code-boundary.md) 기준으로 판단해야 한다.
