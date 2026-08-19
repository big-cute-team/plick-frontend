# 0098. 탈퇴 후 7일 재가입 제한을 FE에 반영하다 (KAN-393)

2026-08-19. BE가 KAN-392로 "탈퇴 후 같은 소셜 계정은 7일간 재가입 불가"를 넣었고, KAN-393으로 FE에
계약 변경이 넘어왔다. 로그인에 403 `AUTH_REJOIN_RESTRICTED`가 새로 생겼으니 분기해서 안내하라는
것, 그리고 탈퇴 경고 문구와 규정 문서(FAQ·이용약관·개인정보처리방침)에도 이 제한을 반영하라는 게
이번 세션의 일이었다. 시작하자마자 로컬 BE가 스키마 불일치로 아예 안 뜨는 문제부터 만났다.

## 로컬 BE가 안 뜨던 이유 — validate와 공유 DB의 어긋남

`./gradlew bootRun`이 기동 중에 죽는다고 했다. 원인은 두 겹이었다.

첫째, BE는 `spring.jpa.hibernate.ddl-auto: validate`로 돈다. validate는 하이버네이트가 기동 시점에
엔티티 매핑과 실제 DB 스키마를 대조해서, 테이블이나 컬럼이 하나라도 없으면 앱을 아예 못 뜨게 하는
모드다(자동으로 만들어 주는 create나 update와 달리 검증만 한다). KAN-392가 `WithdrawnAccount`
엔티티, 그러니까 `withdrawn_accounts` 테이블을 새로 만들었는데, 로컬 프로필이 붙는 공유 Supabase
DB에는 이 테이블이 없었다. BE phase 문서에는 "dev DB CREATE 적용 완료"라고 적혀 있었는데 실제로
`to_regclass('public.withdrawn_accounts')`를 조회해 보니 비어 있었다. 문서와 실제가 어긋나 있던
것이다. BE 저장소의 테스트 스냅샷(`src/test/resources/schema.sql`)에 리뷰된 DDL이 그대로 있어서,
그 세 블록(CREATE TABLE + IDENTITY + 제약 두 개)을 `scripts/be-verify/db.sh`로 공유 DB에 적용했다.

여기서 한 번 헛발질을 했다. `db.sh -f 파일.sql`이 "No such file or directory"로 실패했는데, 파일은
분명히 있었다. db.sh를 열어 보니 로컬에 psql이 없으면 docker의 postgres 이미지로 psql을 대신
돌리는 구조였다 — 컨테이너 안에서는 내 로컬 파일 경로가 안 보이니 -f가 될 리 없다. `db.sh <
파일.sql`로 stdin에 흘려 넣으니 통과했다(docker run -i라 stdin은 이어져 있다).

둘째, KAN-392가 해시 솔트 env(`WITHDRAWAL_HASH_SALT`)를 새로 요구하는데 로컬 `.env`에 없었다.
local 프로필 yml이 `${WITHDRAWAL_HASH_SALT}`를 기본값 없이 참조해서, 없으면 placeholder 해석
실패로 기동이 죽는다(일부러 그렇게 설계돼 있다 — 조기 발견용). `openssl rand -base64 48`로 만들어
추가했다. 도커도 꺼져 있어서 Docker Desktop을 켰는데, redis 컨테이너(`plick-redis`)는 restart
정책 덕에 알아서 따라 올라왔다. 이 두 가지를 고치니 validate가 통과하고 Tomcat 8080이 떴다.

## 로그인 403 분기 — 에러 봉투의 data를 어떻게 FE까지 나르나

BE의 새 실패 응답은 이렇다.

```
HTTP 403
{ "code": "AUTH_REJOIN_RESTRICTED", "message": "...", "data": { "rejoinableAt": "2026-08-25T14:00:00+09:00" } }
```

문제는 우리 `apiFetch` 래퍼(`@plick/core`)가 에러를 `ApiError(status, code, message)`로만
정규화하고 있었다는 점이다. 에러 봉투의 `data`는 그냥 버려졌다. 지금까지는 에러에 부가 데이터가
실려 온 적이 없어서 문제가 없었는데, 이번에 처음으로 `rejoinableAt`을 화면까지 날라야 하는 요구가
생겼다. ApiError에 `data: unknown = null` 필드를 추가하고 던지는 쪽에서 `body?.data ?? null`을
실었다. 기본값을 줘서 기존 호출부는 하나도 안 고쳐도 된다.

다음은 흐름 설계다. 우리 로그인은 서버 액션 `login()`이 BE를 부르고, OAuth 콜백 라우트가 그
결과를 보고 리다이렉트하는 구조다. 여기서 `redirect()`는 리로드가 아니라 예외를 던져 Next가 잡는
소프트 내비게이션이라, try 블록 안에서 부르면 내 catch가 그 예외를 삼켜 버린다. 그래서 분기는
catch 안에서 "값을 돌려주는" 방식으로 했다. `login()`의 반환 타입을
`{ error, rejoinRestrictedUntil? } | undefined`로 넓히고, catch에서 `ApiError`이면서 code가
`AUTH_REJOIN_RESTRICTED`면 `e.data`에서 `rejoinableAt`을 꺼내
`rejoinRestrictedUntil`로 돌려준다. 콜백 라우트는 `"rejoinRestrictedUntil" in result`로 이 경우를
구분해 `/login?error=rejoin&until=<rejoinableAt>`으로 보내고, 나머지 실패는 기존
`/login?error=oauth` 그대로다.

왜 일반 실패에 합치지 않았느냐면, 재가입 제한은 성격이 다른 실패라서다. `error=oauth`의 "다시
시도해 주세요"는 재시도하면 될 수도 있다는 안내인데, 재가입 제한은 7일이 지나기 전엔 몇 번을
눌러도 똑같이 거절된다. 티켓도 "왜 로그인이 안 되지?"로 헤매지 않게 분리하라고 권장했다.

로그인 페이지는 `?error=`와 `?until=`을 읽어 문구를 고른다. 문구 조립은
`@plick/domain/format`의 `loginErrorMessage()`로 뺐다 — web과 mobile 로그인 페이지가 완전히 같은
문구를 써야 하고(두 번째 사용처, ADR 0011 게이트), 시각 포맷은 프로필 수정의
`nicknameChangeableAt`이 이미 쓰던 `formatChangeableAt`("8월 25일 14:00", KST 고정)을 그대로
재사용할 수 있어서다. `until`이 없거나 파싱이 안 되면 시각 없는 "탈퇴 후 7일이 지나야" 문구로
떨어뜨린다 — BE가 만에 하나 data를 빼먹어도 화면이 깨지진 않게.

## 문구와 규정 문서

- 탈퇴 확인 팝업(양 앱 `DeleteAccountButton`): "…같은 계정으로는 7일이 지나야 다시 가입할 수
  있어요"를 덧붙였다. 티켓 권장 문구를 기존 해요체에 맞췄다.
- FAQ(`FaqBody`): 탈퇴 항목의 "다시 로그인하면 신규 가입" 문장을 7일 제한 포함으로 고쳤다.
- 이용약관(`TermsBody`): 제9조에 재가입 제한 항을 신설하고(부정이용 방지 목적 명시) 부칙 시행일을 2026. 8. 19.로 올렸다.
- 개인정보처리방침(`PrivacyPolicyBody`): 이건 단순 안내가 아니라 처리 현황 변경이다. BE가 탈퇴
  시점에 소셜 계정 식별자의 SHA-256+솔트 해시를 7일간 보관했다가 판정에 쓰고 지우는데, 이건
  "탈퇴 시 지체 없이 파기"라고 써 둔 기존 문안과 어긋난다. 4항에 재가입 제한용 해시 7일 보유
  항목을 신설하고, 5항 파기 절과 11항 탈퇴 안내, 14항 변경 이력을 같이 고쳤다.

세 문서 다 `@plick/ui`의 단일 출처 컴포넌트라 web과 mobile이 한 번에 맞는다.

## 검증

계약 검증은 be-verify 서브에이전트에 맡겼다(local 프로필, 공유 DB). 일회용 유저를 만들어 탈퇴를
호출하니 users 행이 익명화되고 `withdrawn_accounts`에 64자 hex 해시 행이 생겼다. 원문
provider_id는 어디에도 안 남고, 해시가 단순 sha256(원문)과도 달라 솔트가 실제로 들어간 것까지
확인됐다. 재호출도 계약대로 멱등 200이었다. 이 검증이 곧 스키마 수리의 검증이기도 하다 —
테이블이 없었으면 탈퇴 자체가 500이었을 것이다.

FE 흐름은 mock 프로필로 태웠다. 실제 소셜 로그인은 프로바이더 인가 코드가 필요해서 로컬에서 403을
만들 수 없는데, mock 서버는 `code: "rejoin-blocked"`를 보내면 그 403을 그대로 돌려준다. 다만 우리
콜백 라우트는 CSRF용 state 쿠키 검증을 통과해야 해서, 브라우저에서 `document.cookie`로
`oauthState=KAKAO:난수`를 직접 심고 `/oauth/callback?code=rejoin-blocked&state=난수`로 진입했다
(state 쿠키는 원래 HttpOnly로 심기지만 서버는 요청의 Cookie 헤더만 보므로 JS로 심어도 검증은
같다). 결과: 콜백 → 403 수신 → `/login?error=rejoin&until=2026-08-25T14%3A00%3A00%2B09%3A00`
착지 → "탈퇴한 계정이에요. 8월 25일 14:00부터 다시 가입할 수 있어요" 표시까지 전부 통과.
`until` 없는 폴백 문구, FAQ·약관·방침 렌더링도 브라우저로 확인했다. 검증 후 BE는 local 프로필로
되돌려 뒀다. check-types·lint·build 그린.

## 남긴 것

- BE phase 문서의 "dev DB 적용 완료" 기록과 실제 DB가 어긋나 있었다. 이번에 로컬(공유 dev)
  DB에는 적용했지만, prod DB 적용은 배포 직전에 사용자가 직접 해야 한다(BE Phase 09 절차).
- 회원가입 페이지(`/signup`)는 콜백 착지가 아니라 rejoin 분기를 안 받는다. 콜백은 항상
  `/login`으로 보내므로 지금 구조에서는 문제없다.
