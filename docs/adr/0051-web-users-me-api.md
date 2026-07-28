# 0051. web 프로필 API 이식 — GET·PATCH /users/me (KAN-319)

## 이번에 한 일

모바일에서 검증이 끝난 프로필 API 두 개(`GET /api/v1/users/me`, `PATCH /api/v1/users/me`)를
데스크톱 웹(apps/web)의 `/me`와 `/me/edit` 화면에 이식했다. `/web-wire-api`의 세 번째 이식이고,
인증(KAN-318) 다음으로 처음 이식한 보호 API다. 닉네임 중복확인(`GET /users/nickname-check`)도
수정 화면이 물고 있어서 같이 왔다.

모바일을 붙일 때는 스웨거를 못 믿어서 be-verify로 계약을 일일이 확인했지만, 이번엔 그 결과가
모바일 코드에 굳어 있다. `_services/profile.ts`의 `ProfileResponse` shape와 경계 변환,
`_services/users.ts`의 에러 code 분기(`USER_NICKNAME_COOLDOWN` 등)가 그대로 검증된 계약이라
be-verify는 부르지 않았다. 대신 화면 검증 도중 curl로 실제 응답을 한 번 쳐 봤는데 모바일 코드의
shape와 정확히 일치했다. 이식 단계의 계약 출처가 문서가 아니라 코드라는 게 이번에도 잘 먹혔다.

## 승격 판단 — 이번 PR의 본편

web이 ADR 0011 게이트 C의 "두 번째 실사용처"가 되는 시점이라, 이 엔드포인트가 쓰는 조각을
하나씩 게이트에 올렸다. 세 개를 올리고 나머지는 앱별 복제로 남겼다.

올린 것.

- `MyProfile` 타입 → `@plick/domain/types`. 모바일 `_types/api.ts`에 있던 걸 옮겼다.
  `TeamCode`만 참조해서 게이트 A(앱 역참조 금지)가 깨끗했고, 두 앱이 완전히 같은 모양을
  소비하니 B·C도 통과다.
- `TEAM_IDS` → `@plick/domain/constants`. PATCH의 `teamIds` 요청에 web도 필요해졌다.
  역방향 `TEAM_CODES`는 아직 모바일(기사 피드)만 써서 모바일에 남기고, 승격된 `TEAM_IDS`에서
  파생시키는 구조는 유지했다. 두 방향이 갈라질 일은 없다.
- `formatChangeableAt` → `@plick/domain/format`. 7일 잠금 안내 문구용 KST 고정 포맷터인데
  web 수정 화면이 두 번째 사용처가 됐다. 순수 함수라 고민할 게 없었고, 옮기고 나니 모바일
  `_utils/me.ts`가 비어서 파일째 지웠다.

안 올린 것. `getMyProfile` fetcher와 `updateMyProfile`·`checkNickname` 서버 액션은 web에
복제했다. web-wiring.md가 예고한 대로다 — `cookies()`와 redirect 경로가 앱에 박혀 있고 파일이
얇아서 복제가 싸다. `useNicknameCheck` 훅도 앱 서버 액션을 부르는 놈이라 같이 복제.
`FavoriteTeamsCard`·`NicknameCheckNotice`·`ErrorDialog` 같은 표현 컴포넌트는 마크업이 거의
같지만 "표현은 앱별" 원칙대로 각자 뒀다. 셋 다 두 앱에서 동일하게 굳으면 그때 다시 볼 후보다.

하나 예상 밖의 소득은 `@plick/ui`의 `ProfileCard`였다. 웹 마이페이지가 mock의 `handle`
(`@epl_fan_kim`)을 보조 줄에 그리고 있었는데 실계약엔 핸들이 없다. `handle`을 optional로 풀고
없으면 줄 자체를 안 그리게 바꿨다 — 웹은 그 자리에 이메일을 넣고, 카카오 가입이라 이메일이
null이면 닉네임만 남는다.

## 화면을 어떻게 바꿀지 — 사용자 확인 네 건

web 화면 세 곳이 단일 팀(`User.myTeam`) 전제였고 실계약은 다중(`myTeams`)이라, 스킬이 시킨
대로 구성을 물어보고 진행했다. 결정은 이렇다.

1. `/me` 응원팀: 단일 칩 SettingRow를 버리고 모바일 `FavoriteTeamsCard` 방식(크레스트+이름 칩
   목록, 빈 상태 문구)을 이식.
2. `/me/edit` 범위: 모바일과 동일 기능. 닉네임 변경(중복확인 + 7일 잠금)과 팀 다중 선택을
   한 폼에서 PATCH 한 번으로.
3. 팀 피커: 모바일 텍스트 칩이 아니라 기존 웹 `TeamCrestCard` 3열 그리드를 유지하고 선택만
   다중 토글로. 피그마 W5 디자인을 지키면서 동작만 모바일과 맞춘 절충이다. 픽커에 붙어 있던
   자체 저장 버튼은 떼서 폼의 단일 저장 버튼으로 합쳤다.
4. 프로필 카드 보조 줄: 핸들 대신 이메일. 위 `ProfileCard` optional화가 여기서 나왔다.

비로그인 분기는 묻지 않고 모바일 패리티로 갔다. `/me`는 로그인 유도 카드(`LoginPromptCard`
이식), `/me/edit`는 `redirect("/login")`. 로딩 스켈레톤(`loading.tsx`)도 두 라우트에 깔았고,
web에 없던 루트 `error.tsx`도 이번에 만들었다 — 이번이 web 첫 서버 컴포넌트 fetch라
BE 다운 같은 비401 실패를 받아줄 마지막 그물이 필요해졌기 때문이다.

여기서 메커니즘을 하나 짚어두면, 읽기와 쓰기가 서버에서 도는 방식이 다르다. `getMyProfile`은
서버 컴포넌트 렌더 중에 도는 평범한 서버 모듈이다. `cookies()`로 access 쿠키를 읽어 Bearer로
싣지만, 렌더 중엔 쿠키를 심을 수 없으니 읽기만 한다. 반면 `updateMyProfile`은 `"use server"`
서버 액션이라 버튼 클릭의 POST로 돌고, 성공하면 `redirect("/me")`를 던진다. 이 redirect는
리로드가 아니라 소프트 내비게이션이고, 그 내비게이션이 `/me`를 다시 렌더하면서 `getMyProfile`이
새로 돌아 방금 저장한 값이 보인다. `cache: "no-store"`라 유저별 응답이 공유 캐시에 남지 않는
것도 모바일에서 가져온 그대로다.

## 검증

로컬 BE(:8080)를 띄워 놓고 dev(:3000)에서 직접 밟았다. 보호 API라 익명으론 성공 경로를 못
보니, 공유 DB에 일회용 유저(`provider_id='KAN319-test'`, 응원팀 LIV·TOT)를 만들고
`mint-jwt.mjs`로 토큰을 민팅해 브라우저에 `document.cookie`로 심었다. HttpOnly가 아니어도
서버는 요청 쿠키 헤더만 보니까 검증엔 충분하다.

밟은 상태들.

- 익명 `/me`: 로그인 유도 카드 + FAQ, 로그아웃 버튼 없음. 익명 `/me/edit`: `/login` 리다이렉트.
- 로그인 `/me`: 닉네임·이메일 프로필 카드, 응원팀 칩 2개.
- `/me/edit`: 크레스트 그리드에 LIV·TOT 선택 상태로 진입. 중복확인 → "사용할 수 있는
  닉네임이에요". 아스날 추가 토글 + 닉네임 변경 + 저장 → PATCH 성공, `/me`로 리다이렉트,
  새 닉네임과 칩 3개 확인. DB에서 `nickname_changed_at` 갱신도 대조했다.
- 다시 `/me/edit`: 7일 잠금 발동 — 인풋·중복확인 비활성에 "8월 4일 13:12까지는 닉네임을 바꿀
  수 없어요" 빨간 안내. `formatChangeableAt`이 KST로 잘 찍혔다. 잠금 상태에서 팀만 전부
  해제하고 저장 → 빈 배열 PATCH도 통과(닉네임은 기존 값을 되보내니 잠금에 안 걸린다),
  `/me`가 "아직 응원팀이 없어요" 빈 상태를 그렸다.
- 반응형: 1280 기준으로 만들고 330px까지 줄여 두 화면 다 안 깨지는 걸 확인했다.

끝나고 테스트 유저 행을 지우고 쿠키도 지웠다. 닉네임 7일 잠금이 계정에 남는 정책이라
기존 유저로는 절대 안 하고 일회용으로만 한 게 맞았다.

작은 함정 하나. dev 서버를 툴로 띄우려니 이미 사용자가 :3000에 띄워 둔 `next dev`가 있어서
새로 못 띄웠다. 죽이지 않고 그 서버에 브라우저만 붙였는데, 같은 워킹 디렉터리라 내 변경이
HMR로 반영돼 있어 문제없었다. 공용 패키지를 건드렸으니 `--filter web`·`--filter mobile` 빌드를
둘 다 돌리고 check-types·lint·format:check까지 통과시켰다.

## 후속 — 모바일 디테일 패리티 스윕

PR을 올리기 직전에 "모바일과 비교해서 web에 빠진 디테일을 질문하고 채워 달라"는 요청이
들어와서, 같은 세션에서 화면을 하나씩 맞대 봤다. 로그인·회원가입·온보딩·마이 계열을 훑어
간극 네 개를 찾았고, 넷 다 물어본 뒤 셋을 이번 브랜치에 반영했다.

- 게스트 진입. 모바일 인증 화면엔 "로그인 없이 이용하기"(KAN-300)가 있는데 web 카드엔
  비로그인 진입 경로 자체가 없었다. `GuestEntryButton`을 web `_components`로 이식해
  `AuthCard` 하단에 붙였다 — 안내 팝업에서 "계속하기"를 눌러야 홈으로 가는 흐름 그대로,
  데스크톱이라 hover·focus만 얹었다. 로그인·회원가입 둘 다에 뜬다.
- `/me/edit` 뒤로가기. 모바일은 상단바 뒤로가기가 있는데 web은 제목뿐이었다. 제목 위에
  "← MY" 텍스트 링크를 뒀다(스켈레톤에도 동일하게). 저장 안 하고 나가는 경로가 명시적이게 됐다.
- 알림 뱃지. GNB 종 아이콘의 숫자 3이 `NOTIF_COUNT` mock이었다. 알림 BE가 없는 계약
  공백이라 가짜 숫자를 계속 보여줄 이유가 없어서, mock을 지우고 모든 페이지에서 prop을
  걷어냈다(`SiteHeader`의 `notif` 기본값 0이라 뱃지가 숨는다). 종 아이콘 자체는 남겨서
  알림 API가 생기면 값만 다시 물리면 된다.
- 온보딩은 뺐다. web 온보딩(닉네임·팀 선택)은 아직 mock이고 모바일은 중복확인·건너뛰기·
  다중 팀·`POST /users/me/onboarding` 저장까지 붙어 있는데, 이건 엔드포인트 하나짜리
  별도 이식이라 "다음에"로 확정받았다. 붙일 때 다중 팀 화면 구성을 다시 확인해야 한다.

비교하면서 남겨둔 관찰 하나. web 회원가입 카드엔 모바일 같은 뒤로가기 화살표가 없는데,
하단 "로그인" 전환 링크가 같은 역할을 하고 있어 따로 묻지 않고 그대로 뒀다.

## 남긴 것

- `NOTIF_COUNT`는 여전히 mock이다. 알림 BE가 없는 계약 공백이라 이 화면들도 다른 페이지처럼
  `SiteHeader`에 그대로 넘긴다. 처리 방침은 별도 확인 대상.
- `CURRENT_USER` mock은 홈 사이드바와 온보딩 두 화면이 아직 써서 남겼다. `/me`·`/me/edit`
  소비는 이번에 끊었다.
- `onboarding/team`은 아직 단일 팀 전제다. 온보딩 API를 붙일 때 화면 구성을 다시 확인해야 한다.
- `NicknameCheckNotice`·`ErrorDialog`는 web에선 수정 화면만 써서 라우트에 co-locate했다.
  온보딩이 연결되면 `_components/`로 올린다.
