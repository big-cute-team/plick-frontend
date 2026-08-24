# 0103 — Apple 로그인 추가와 소셜 재로그인 계정 선택 강제 (KAN-395)

- 상태: 적용
- 관련: KAN-395 / KAN-257(모바일 OAuth) / KAN-318(웹 OAuth) / KAN-341(redirectUri 계약)

## 뭘 했나

로그인 화면(모바일 A1, 데스크톱 W6)과 회원가입 화면(A2, W7)에 Apple 소셜 로그인 버튼을
추가했다. 카카오·구글에 이어 세 번째 프로바이더다. 버튼 로고는 Apple 브랜드 마크(그 유명한
한 입 베어 문 사과)를 그대로 썼다 — Sign in with Apple의 HIG가 요구하는 부분이라 커스텀
아이콘으로 바꿀 여지가 없었다.

같이 손 본 문제가 하나 더 있었다. 티켓 1번 항목의 "로그아웃한 뒤 다시 로그인 버튼을 누르면
소셜 프로바이더가 이전 세션으로 자동 통과해 다른 계정으로 로그인이 안 된다"는 것. 카카오·구글
인가 URL에 `prompt`를 추가해 프로바이더가 계정 선택·재로그인 창을 다시 띄우게 했다.

## 어디서 막혔나

Apple 인가 요청 파라미터 구성이 만만치 않았다. Apple은 `scope`를 요청하는 순간
`response_mode`가 `form_post`로 강제된다. 이러면 프로바이더가 code를 우리 콜백에 GET 쿼리로
붙여 돌려주지 않고, `application/x-www-form-urlencoded` 바디로 POST를 쏜다. 우리 콜백
`app/oauth/callback/route.ts`는 `export async function GET`만 있어서 POST를 못 받는다.

Apple에 이메일·이름을 굳이 별도 scope로 요구할 필요는 없었다. BE가 code를 애플과 교환하면서
`id_token`을 함께 받는데, 그 안 `sub`가 애플 유저의 안정적 식별자다. 우리 서비스는 그 sub로
유저를 잡는 걸로 충분하다. 그래서 Apple에 대해선 `extraParams`를 비워 두고 `response_type=code`

- `state`만 보내는 최소 요청으로 갔다. 그러면 응답이 GET 쿼리로 돌아와 기존 콜백 라우트를
  그대로 쓸 수 있다.

두 번째 걸림돌은 로컬에서 애플 인가 왕복을 못 밟는다는 것. Apple은 등록된 redirect_uri가
반드시 HTTPS여야 한다. 우리 로컬은 `http://localhost:3001`이라 애플 콘솔에 등록조차 안 된다.
티켓의 "백엔드 dev서버에 코드 올려서 테스트 했음"이 그 얘기다 — FE도 dev 배포에 올려서
`https://dev-m.plick.co.kr`, `https://dev.plick.co.kr` 콜백으로 검증해야 한다. 로컬에선
버튼이 눌리면 인가 URL은 조립되지만 애플이 요청을 거절하는 지점까지만 확인 가능하다.

세 번째는 자동 로그인 문제. 처음엔 "쿠키가 남아 있어서 그런가" 싶어 우리 쪽 `oauthState`
쿠키 삭제 시점을 뒤졌는데 그건 이미 콜백에서 소모하고 있었다. 원인은 우리 쪽이 아니라 프로바이더
세션이었다. 카카오나 구글은 브라우저에 자기 세션이 남아 있으면 다음 인가 요청에서 유저 선택
UI를 안 띄우고 조용히 code만 돌려준다. 그러면 개발자가 "다른 계정으로 로그인"을 못 한다.

- 구글: `prompt=select_account` — 계정 선택 화면을 강제로 띄운다.
- 카카오: `prompt=login` — 카카오톡·카카오계정 세션이 살아 있어도 로그인 폼을 다시 띄운다.
- 애플: 별도 prompt 파라미터가 없다. 대신 애플은 기본적으로 매번 재인증 성격이 강한 편이라
  이 문제가 덜하다.

## 어떻게 풀었나

배치는 mobile과 web을 대칭으로 갔다. 인증 관련 코드는 `apps/mobile/app/_constants/api.ts`와
`apps/web/app/_constants/api.ts`가 파일 코멘트에 명시적으로 "수동 계약으로 동기화한다"고
적혀 있는 파트라 두 앱을 같은 모양으로 유지했다.

바꾼 파일:

- `packages/ui/src/icons.tsx` — `AppleIcon` 추가. viewBox 24 원본 SVG, 색은
  `currentColor`라 버튼의 `text-on-apple`(흰색)을 따른다.
- `packages/tokens/theme.css` — `--plk-apple: #000000`, `--plk-on-apple: #ffffff`와
  `@theme inline` 매핑(`--color-apple`, `--color-on-apple`) 추가. 브랜드 지정색이라 다크·라이트
  공통으로 뒀다(카카오와 같은 자리).
- `packages/ui/src/SocialLoginButton.tsx` — 기본 클래스에 박아 두었던 `text-on-kakao`를 걷어냈다.
  카카오·구글 배경(노랑·흰)은 어두운 글자가 맞지만 애플 배경은 검정이라 반대여야 한다.
  두 유틸이 같은 색 프로퍼티에 물려 있어 Tailwind 4 cascade 순서로 승부를 보게 하기 싫었다.
  기본을 비우고 호출자가 항상 `text-on-...`을 명시하도록 계약을 바꿨다.
- 모바일/웹 `_types/api.ts` — `SocialProvider`에 `"APPLE"` 추가.
- 모바일/웹 `_constants/api.ts` — `OAUTH_AUTHORIZE.APPLE` 추가, 카카오·구글의 `extraParams`에
  `prompt` 추가.
- 모바일/웹 `_components/SocialLoginActions.tsx` — Apple 버튼 렌더. `SocialLoginButton` 계약
  변경에 맞춰 카카오·구글에도 `text-on-kakao`를 명시.
- 웹 `_components/AuthCard.tsx` — `appleLabel` prop 추가.
- 웹 `login/page.tsx`, `signup/page.tsx` — `appleLabel` 전달.
- `.env.example`(모바일·웹) — `APPLE_CLIENT_ID` 슬롯 추가. 로컬에선 비워 두면 카카오·구글은
  살아 있고 애플만 "설정 누락" 에러로 실패한다(기존 `buildAuthorizeUrl`이 던지는 방식 그대로).

### `prompt` 파라미터가 실제로 하는 일

OAuth 2.0 인가 요청에서 `prompt`는 프로바이더에게 "이번 인가 사이클에서 유저에게 뭘 보여줘라"를
지시하는 힌트다. 각 값의 의미가 프로바이더마다 미묘하게 다르다.

- `prompt=select_account` — 유저가 여러 계정을 갖고 있을 수 있으니 계정 선택 UI를 반드시
  띄우라는 뜻. 세션이 하나만 있어도 확인 화면이 뜬다. 구글은 이걸 표준으로 처리한다.
- `prompt=login` — 이미 로그인돼 있어도 재인증(비밀번호·2단계)까지 다시 받게 한다. 세션을 지운
  것과 같은 효과. 카카오가 이걸 지원한다.

우리 시나리오("로그아웃 후 다른 계정으로 로그인")에는 둘 다 유효하다. 구글은 계정 스위처가
잘 짜여 있어 `select_account`가 UX상 자연스럽고, 카카오는 계정 스위처가 그만큼 매끄럽지
않아서 그냥 로그인 폼을 다시 띄우는 `login` 쪽이 확실하다. 프로바이더 관용에 맞춰 둘을 갈랐다.

### Apple 인가 URL의 `state`와 콜백

Apple도 우리가 넘긴 `state`를 그대로 GET 쿼리에 반사해 준다(scope를 안 걸었을 때). 카카오·구글과
동일한 검증 경로(oauthState 쿠키의 `프로바이더:난수`와 대조)를 그대로 탄다. `parseOAuthState`는
`OAUTH_AUTHORIZE`에 있는 프로바이더 키만 유효로 치는데, 이번에 `APPLE`이 그 레코드에 들어가서
자동으로 화이트리스트가 확장된다.

## 검증

- `pnpm check-types`, `pnpm lint` 통과.
- 로컬 모바일(`http://localhost:3001/login`), 로컬 웹(`http://localhost:3000/login`) 화면에서
  세 버튼(카카오 노랑·구글 흰·애플 검정)이 순서대로 뜨는 것 확인. Apple 로고가 실제 애플
  마크 그대로 흰색으로 렌더됨.
- Apple 인가 왕복 검증은 로컬 HTTP에선 불가. dev 배포 후 `dev-m.plick.co.kr`, `dev.plick.co.kr`
  콜백을 애플 콘솔에 등록하고 실기 확인이 필요하다 — 티켓 2번 항목의 예고 그대로다.
- 카카오/구글 재로그인 UX(prompt 파라미터 효과)도 실기에서 "로그아웃 → 다시 로그인 → 계정
  선택 창이 새로 뜨는가"로 확인한다.

## 애플에도 같은 재로그인 버그가 있을까

작업을 마치고 든 의문. 애플은 `prompt` 같은 파라미터를 규격에 안 갖고 있어서 카카오·구글처럼
"화면을 다시 띄워라"를 지시할 수단이 없다. 프로바이더 세션을 우리가 끊을 수 없는 건 셋 다
동일한데(크로스 도메인 쿠키라 원천 불가), 카카오는 로그아웃 리다이렉트 엔드포인트라도 주고
구글은 prompt를 주는 반면 애플은 아무것도 안 준다. 유일한 해제 경로는 유저 본인이
appleid.apple.com에서 로그아웃하거나 앱 연결을 해제하는 것.

다행히 애플 웹 로그인은 세션이 있어도 매번 재확인 창을 띄우는 성향이 강해 조용히 통과되는
케이스가 드물다고 알려져 있다. 아직 안 겪은 문제를 애플이 주지도 않는 파라미터로 선제 대응하는
건 비용만 크다고 판단해, dev 실기에서 재현되는지 먼저 확인하고 진짜 문제면 그때 팝업 방식이나
`form_post` 경로를 검토하기로 했다.

## TODO

- Apple 인가·콜백 왕복 dev 배포 실기 확인. 이때 애플 재로그인 UX(로그아웃 → 다시 로그인 →
  확인 창이 다시 뜨는가)도 함께 본다.
- 애플 개발자 콘솔에서 Services ID 등록과 dev/prod 콜백 화이트리스트 정리
  (`https://dev-m.plick.co.kr/oauth/callback`, `https://dev.plick.co.kr/oauth/callback`,
  `https://m.plick.co.kr/oauth/callback`, `https://plick.co.kr/oauth/callback`).
- prod `APPLE_CLIENT_ID`를 배포 파이프라인 시크릿에 넣는다.
