# 0050. web 인증 API 이식과 @plick/core 신설 (KAN-318)

## 무엇을 했나

모바일에서 검증이 끝난 인증 API 세 개(`/api/v1/auth/login`, `/auth/logout`, `/auth/refresh`)를
데스크톱 웹(apps/web)에 이식했다. web의 첫 BE 연결이라 인프라(rewrites, env, 프록시)도 이번에 같이
깔았고, `apiFetch`가 두 번째 실사용처를 만나는 시점이라 공용 패키지 `@plick/core`를 신설해 올렸다.

티켓 제목엔 GET이라 적혀 있었지만 실제 계약은 셋 다 POST다. 모바일을 붙일 때 be-verify로 확정한
계약이 모바일 코드에 굳어 있어서(ADR 0019~0023), 이번엔 스웨거도 be-verify도 부르지 않고 모바일
코드를 계약서로 읽었다. `/web-wire-api` 절차(web-wiring.md)가 정한 방식 그대로다.

## @plick/core를 지금 만든 이유

web-wiring.md가 "web 이식은 승격 판단이 본편"이라고 못박아 뒀고, ADR 0011 §7에도 `apiFetch`는
"web이 같은 엔드포인트를 붙이는 순간 재검토"라고 예약돼 있었다. 그 순간이 왔다.

게이트 셋을 대조했다. A(앱 역참조 금지)는 `apiFetch`가 모바일 `_constants/api.ts`의
`BE_PROXY_PREFIX`를 import하는 게 걸렸는데, 이 상수는 두 앱이 같은 값("/be")을 쓰는 프록시 규약이라
패키지 안으로 들이면 역참조가 끊긴다. B(동일성)는 web에 만들 코드가 모바일의 바이트 단위 복제라
자명했다. C(성숙도)는 모바일이 17개 엔드포인트를 이 래퍼로 돌리며 굳혔고 web이 두 번째 실사용처가
된다. 셋 다 통과라 판단은 섰는데, 이번 PR이 이미 web 첫 인프라와 인증 전체를 담아 무거운 게
걸려서 사용자에게 로컬 복제 대안과 함께 물었다. 신설 승격으로 확정받았다.

패키지 스코프는 좁게 잡았다. `client.ts`(apiFetch, ApiError, BE_PROXY_PREFIX)와
`refresh.ts`(refreshTokens) 둘만 넣었다. refresh fetcher를 같이 올린 이유는 이 함수의 유일한
소비자가 각 앱의 edge 프록시고, 두 앱 프록시가 완전히 같은 회전 계약을 쓰기 때문이다. 반면
`auth.ts` 같은 서버 액션은 web-wiring.md가 정한 대로 앱별 복제로 남겼다. 쿠키를 심고
`redirect()`로 끝나는 파일이라 앱의 라우팅 사정이 박혀 있고, 파일이 얇아 복제가 싸다.

인증 상수(쿠키 이름, TTL, OAUTH_AUTHORIZE)와 `SocialProvider` 타입도 이번엔 앱별 복제로 뒀다.
쿠키 이름이 갈리면 프록시와 서버 액션이 서로 못 읽는 수동 계약이라 승격 후보이긴 한데, 후보 목록에
없던 항목을 같은 PR에서 즉흥으로 올리는 것보다 ADR 0011 §7에 한 줄 남기고 다음 인증 관련 작업에서
근거를 갖고 판단하는 쪽을 골랐다.

패키지 구조는 `@plick/domain`을 그대로 미러링했다. 빌드 없이 소스 TS를 subpath로 export하는
방식(`"./*": "./src/*.ts"`)이라 별도 번들 설정이 필요 없다. 하나 막힌 건 타입 검사였다.
`apiFetch`가 `process.env.API_BASE_URL`을 읽는데 domain은 process를 쓸 일이 없어서 devDependencies에
`@types/node`가 없었고, 그걸 그대로 베낀 core에서 `Cannot find name 'process'`가 났다. 앱들과 같은
버전의 `@types/node`를 추가해서 풀었다.

모바일 쪽은 import 교체가 전부였다. `@/_apis/client`를 쓰던 파일 20개를 `@plick/core/client`로
바꾸고, `_apis/client.ts`와 `_services/refresh.ts`를 지웠다. 이러면서 모바일의 `_apis/` 폴더
자체가 사라졌다. 통신 유틸 레이어가 앱에서 패키지로 올라간 셈이다.

## web에 깐 것들

인프라부터. `next.config.js`에 `/be/:path*` rewrites를 모바일과 같은 모양으로 깔았다. 브라우저
fetch가 BE 오리진을 직접 때리면 CORS에 막히니 Next가 same-origin으로 받아 서버에서 넘겨주는
프록시다. env는 `.env.example`과 `.env.local`에 `API_BASE_URL`과 OAuth 키 세 개를 넣었는데,
`OAUTH_REDIRECT_URI`만 web 포트인 3000으로 다르다.

인증 본편은 모바일 구조를 그대로 옮겼다.

- `_services/auth.ts`: 서버 액션 둘(startSocialLogin, login)과 logout. `"use server"` 파일이라
  함수만 export할 수 있어 상수는 `_constants/api.ts`로 분리하는 구조도 그대로다.
- `_services/oauth.ts`: 인가 URL 조립과 state 쿠키 포장을 하는 순수 헬퍼. redirectUri 기본값만
  3000으로 바꿨다.
- `_services/session.ts`: 렌더 중 쿠키를 읽는 `isLoggedIn`. 모바일에 있는 `getAccessToken`은
  web에 아직 인증 읽기 소비처(likedByMe를 쓰는 화면)가 없어서 안 가져왔다. 죽은 코드를 미리 만들지
  않고 그 API를 붙이는 티켓에서 가져오면 된다.
- `proxy.ts`: access 쿠키가 죽고 refresh만 남은 네비게이션에서 조용히 토큰 쌍을 회전시키는
  프록시. Next 16에서 `middleware.ts`가 `proxy.ts`로 개명된 것(export 이름도 `proxy`)까지 모바일
  ADR 0021의 결론을 그대로 탔다. 로직은 같고 refresh fetcher만 `@plick/core`에서 온다.
- `app/oauth/callback/route.ts`: 프로바이더가 code를 돌려보내는 착지점. state 쿠키 대조(CSRF)와
  login 호출, 실패 시 `/login?error=oauth` 리다이렉트까지 동일하다.

화면 쪽은 web의 기존 관용을 존중하면서 붙였다. 모바일은 `SocialLoginActions`가
actionLabel("로그인")을 받아 "카카오로 로그인"을 조립하는데, web `AuthCard`는 처음부터 버튼 문구를
통째로 주입받는 API였다. 그래서 web판 `SocialLoginActions`는 라벨을 그대로 받게 만들어 AuthCard의
props를 안 건드렸다. 로그인 페이지는 모바일처럼 `?error=oauth`를 읽어 콜백 실패 안내를 띄운다.

마이페이지 로그아웃은 모바일 `LogoutButton`의 확인 팝업 흐름을 옮기고 데스크톱이라 hover와
focus-visible 스타일만 얹었다. 액션 전에 TanStack Query 캐시를 통째로 비우는 것도 가져왔다.
로그아웃의 redirect는 리로드가 아니라 소프트 내비게이션이라 브라우저 메모리의 RQ 캐시가 살아남고,
거기 남은 유저별 값이 다음 로그인 상태를 오염시키는 문제(KAN-309에서 모바일이 밟은 함정)를 web도
똑같이 밟게 되기 때문이다.

루트 레이아웃엔 `AuthProvider`를 시드했다. 서버가 `isLoggedIn()`으로 읽은 값을 컨텍스트로 한 번
내려두면, 나중에 좋아요·댓글 같은 클라 아일랜드가 붙을 때 화면마다 prop을 꿰지 않아도 된다. 지금
당장 소비자는 없지만 web-wiring.md가 인증 PR에서 깔라고 정해둔 항목이다.

## 검증에서 본 것

빌드 두 개(web, mobile)와 check-types, lint, format:check는 전부 통과했다. 모바일은 import 교체가
전부였는데도 빌드를 같이 돌린 건 공용 패키지를 건드린 PR의 기본 절차다.

화면은 dev :3000을 브라우저로 직접 밟았다. 재밌었던 건 프록시 검증 방법이다. access·refresh 쿠키는
HttpOnly라 브라우저 JS로 심을 수 없다고 생각하기 쉬운데, HttpOnly는 "서버가 심은 쿠키를 JS가 못
읽는" 제약이지 "JS가 같은 이름의 쿠키를 못 만드는" 제약이 아니다. `document.cookie`로 가짜
`refreshToken`을 심으면 브라우저는 그걸 요청에 실어 보내고, 프록시는 요청 쿠키만 읽으니 구분 없이
동작한다. 이걸로 refresh 실패 경로를 끝까지 밟았다. 가짜 refresh만 있는 상태로 `/me`에 들어가면
프록시가 재발급을 시도하고, BE가 거부하면 쿠키 두 개를 지우며 `/login`으로 보낸다. 실제로 쿠키가
사라지고 로그인 화면에 착지하는 것까지 확인했다. 로그아웃도 같은 방식으로 가짜 access를 심고 확인
팝업을 거쳐 액션을 태웠고, 쿠키 삭제와 홈 리다이렉트가 정상이었다.

반응형은 로그인 카드를 데스크톱과 330px에서 확인했다. 이번에 만진 화면이 로그인·회원가입 카드와
마이페이지 버튼뿐이라 볼 게 많지 않았다.

## 로그인 E2E에서 BE의 계약 공백을 찾았다

작업 도중 사용자가 카카오·구글 콘솔에 3000 콜백을 등록하고 실계정 로그인을 밟았는데, 인가와 콜백
착지까지는 멀쩡한데 로그인 화면에 "소셜 로그인에 실패했어요"만 계속 떴다. 콜백 라우트가 실패 사유를
서버 로그로 남기게 해 둔 게 여기서 바로 값을 했다. dev 로그를 열어 보니 state 검증은 통과했고 BE
`/auth/login`이 "카카오 인가코드 교환에 실패했습니다"를 돌려주고 있었다. 실패 지점은 FE가 아니라
BE와 카카오 사이였다.

BE 코드를 열어 원인을 확정했다. OAuth 인가 코드 그랜트에서 토큰 교환 요청의 `redirect_uri`는 인가
요청 때 쓴 값과 정확히 일치해야 한다(코드 탈취 방어용 검증이다). 그런데 BE는
`OAUTH_KAKAO_REDIRECT_URI` 하나를 env로 받아 교환 폼에 고정으로 싣는 구조고, 그 값이 모바일의
3001이었다. web이 3000으로 발급받은 code를 BE가 3001로 교환하려니 카카오가 거부한 것이다. 콘솔
등록도 FE 코드도 정상인데 프론트가 둘이 되면서 BE의 단일 redirect_uri 전제가 깨진, 이식 단계에서만
드러나는 계약 공백이었다.

사용자가 BE `.env`를 3000으로 바꿔 봤는데도 그대로 실패해서 한 번 더 갸웃했는데, 이건 스프링의 env
로딩 시점 문제였다. BE는 `spring.config.import: optional:file:.env`로 `.env`를 읽는데 이건 기동
시점에 한 번 읽는 값이지 파일을 감시하는 게 아니다. Next dev가 `.env.local` 변경을 핫리로드해 주는
것과 다르다. 떠 있는 프로세스는 여전히 3001을 들고 있었고, 재시작해야 반영된다.

해결은 둘로 갈랐다. 당장은 BE를 재시작해 3000으로 web 로그인을 확인하되 그동안 모바일 로그인이
깨지는 걸 감수한다. 근본은 BE가 요청별 redirect_uri를 받는 것이다. login 요청 body에
`redirectUri`를 선택 필드로 추가하고 비어 있으면 지금처럼 env 기본값을 쓰면, 모바일은 무변경으로
호환되고 web만 자기 콜백 주소를 실어 보내면 된다. BE 수정은 사용자가 직접 하기로 했고, 그게 되면
web `auth.ts`의 login 호출에 `redirectUri`를 추가하는 FE 후속이 따라간다.

## 남긴 것

- BE 패치(login body의 `redirectUri` 선택 필드) 후 web `auth.ts`에 `redirectUri` 전송 추가와
  실계정 로그인 E2E 재확인. BE `.env`는 3001로 되돌린다.
- 인증 상수 묶음과 `SocialProvider`의 승격 재검토. ADR 0011 §7에 후보로 올렸다.
- web 마이페이지는 아직 mock 프로필이다. 로그아웃 버튼만 실제로 동작한다. `GET /users/me` 이식
  티켓에서 로그인 게이트(비로그인 시 유도 카드)와 함께 정리된다.
