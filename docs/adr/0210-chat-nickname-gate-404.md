# 0210. 채팅 닉네임 게이트가 내린 온보딩 주소를 프리페치해 404를 내던 문제 (KAN-671)

## 어디서 시작했나

2026-10-23 prod 재측정(KAN-667)에서 웹 홈의 Lighthouse Best Practices가 74였고, 그중 `errors-in-console` 감사가 세 번 다 실패했다. 콘솔에 찍힌 에러는 `/onboarding/nickname?_rsc=…` 요청의 404였다. 홈에서 온보딩 주소를 부를 일이 없으니 이상했다.

온보딩은 KAN-318 무렵 내렸다. BE가 가입할 때 닉네임을 자동으로 붙여 주게 되면서 "닉네임 정하기 → 응원팀 고르기" 흐름이 필요 없어졌고, 폴더를 `app/onboarding`에서 `app/_onboarding`으로 옮겨 라우팅에서 뺐다. Next App Router에서 밑줄로 시작하는 폴더는 private folder라 URL이 되지 않는다. 코드는 언젠가 되살릴 수 있게 남겨 두고 주소만 없앤 셈이다.

그런데 그 주소를 가리키는 상수 `ONBOARDING_ENTRY = "/onboarding/nickname"`이 두 앱 `_constants/app.ts`에 그대로 있었고, 잠든 온보딩 코드 말고도 살아 있는 화면 하나가 그걸 썼다. 채팅 패널(`LiveChatPanel`)의 "닉네임을 정해 주세요" 게이트다.

## 왜 홈에서 404가 났나

웹 홈 우측 레일에는 통합 채팅방 카드가 붙어 있다. 이 카드는 그리기 전에 세 가지를 거른다.

1. 세션을 아직 모르거나 게스트를 받아 오는 중이면 자리만 비운다(KAN-667).
2. 세션이 없으면 로그인 안내를 띄운다.
3. 세션은 있는데 `nickname`이 null이면 닉네임 게이트를 띄우고, 버튼이 `ONBOARDING_ENTRY`로 가는 `Link`다.

문제는 3번의 `nickname`이 어디서 오는지였다. `AuthProvider`는 세션 종류를 표식 쿠키 `sessionKind`로 바로 알지만, 닉네임과 userId는 `useProfileSeed`가 브라우저에서 `GET /users/me`로 따로 받아 온다(KAN-602 이후 기다리지 않는 구조). 그래서 세션이 생긴 순간부터 프로필 응답이 올 때까지 수십~수백 ms 동안 `isLoggedIn`은 true인데 `nickname`은 null이다. 처음 온 사람은 게스트를 막 발급받은 직후라 이 틈이 매번 생긴다. 그 짧은 순간 게이트가 그려졌다.

게이트가 한 프레임만 보였다 사라지면 사용자는 거의 못 알아챈다. 404를 만든 건 그 프레임에 마운트된 `next/link`다. 프로덕션 빌드에서 `Link`는 뷰포트에 들어오면 대상 라우트의 RSC 페이로드를 미리 받아 둔다. 이게 프리페치이고, 요청 주소 끝의 `?_rsc=…`가 그 표시다. 소프트 내비게이션(전체 문서를 다시 받지 않고 클라이언트 라우터가 RSC 조각만 갈아 끼우는 이동)을 빠르게 하려는 장치인데, 대상이 없는 라우트면 서버가 404를 돌려주고 브라우저 콘솔에 "Failed to load resource: 404"가 남는다. 게이트가 금방 사라져도 이미 나간 프리페치는 취소되지 않는다.

개발 서버(`next dev`)에서는 프리페치를 하지 않는다. 그래서 로컬 dev로는 이 404가 재현되지 않았고, 처음에 로컬 dev 서버에 고치기 전 코드를 띄워 비교하려다 "고치기 전에도 404가 없다"는 결과를 받고 잠깐 헷갈렸다. 원인을 알고 나서 재현은 고치기 전 코드가 배포된 dev 사이트에서, 고친 뒤 확인은 로컬 프로덕션 빌드(`next build` + `next start`)에서 했다.

모바일도 같은 상수와 같은 게이트를 쓴다. 모바일 채팅은 홈이 아니라 `/live/chat` 화면이라 홈 Lighthouse에는 안 잡혔을 뿐, 같은 404가 났다.

## 어떻게 바꿨나

티켓에서 정한 방향은 두 가지였다. 프로필을 받는 동안에는 게이트 대신 빈 자리를 그리고, 게이트 자체는 없는 주소가 아니라 실제로 닉네임을 정할 수 있는 곳으로 보낸다.

### 프로필 로딩과 "닉네임 없음"을 가르기

`nickname === null`만으로는 "아직 안 옴"과 "왔는데 비어 있음"을 구분할 수 없다. 그래서 `useProfileSeed`가 조각과 함께 TanStack Query의 `isLoading`을 돌려주게 바꿨다.

```ts
export function useProfileSeed(sessionKind: SessionKind | null): {
  seed: ProfileSeed | null;
  isLoading: boolean;
};
```

`isLoading`을 고른 이유가 있다. TanStack Query v5에서 `isPending`은 "아직 데이터가 없다"는 뜻이라 쿼리가 꺼져 있을 때(`enabled: false`, 세션이 없는 경우)도 true다. `isLoading`은 `isPending && isFetching`이라 실제로 첫 요청이 날아가는 중일 때만 true다. 또 이 쿼리는 `placeholderData: (previous) => previous`를 쓴다. 로그인이나 로그아웃으로 세션 종류가 바뀌어 키가 바뀌면 새 응답이 올 때까지 직전 값을 보여 주는데, 이때는 데이터가 있는 상태라 `isLoading`이 false다. 닉네임이 깜빡이지 않던 기존 동작이 그대로 유지된다.

`AuthProvider`는 이 값을 `isProfilePending = isLoggedIn && isLoading`으로 컨텍스트에 올렸다. 채팅 패널은 `!nickname && isProfilePending`이면 웹은 자리만 비운 `div`를, 모바일은 null을 그린다. KAN-667에서 세션 대기 중에 하던 것과 같은 처리다.

프로필 요청이 401이 아닌 에러로 실패하면 `isLoading`은 false가 되고 `nickname`은 null로 남아 게이트가 뜬다. 빈 자리에 영영 갇히는 것보다는 낫다고 봤다. 그때 게이트가 가리키는 곳은 이제 살아 있는 주소다.

### 게이트를 `/me/edit`로

게이트에 걸리는 사람은 이제 닉네임이 빈 옛 계정뿐이다. 신규 가입은 BE가 닉네임을 붙이고, 게스트 행도 생성 때 닉네임이 있다. 그런 사람이 닉네임을 정할 곳은 계정 화면(`/me/edit`)이다. 두 앱 모두 `ProfileEditForm`이 `currentNickname: string | null`을 받고 null이면 "미설정"으로 보여 준 뒤 그 자리에서 수정하게 되어 있어 따로 손댈 게 없었다.

티켓에는 "`ONBOARDING_ENTRY`를 거기로 바꾼다"는 선택지도 있었는데 상수는 그대로 두고 게이트만 `/me/edit`를 직접 가리키게 했다. `ONBOARDING_ENTRY`는 잠든 온보딩 코드(`_onboarding/team/page.tsx`의 `redirect`, 모바일 `OnboardingTopBar`의 뒤로 가기)가 "온보딩 첫 단계"라는 뜻으로 쓴다. 이걸 `/me/edit`로 바꾸면 온보딩을 되살릴 때 뜻이 어긋난다. 로그인 안내가 `href="/login"`을 직접 쓰는 것과 같은 방식으로 맞췄다. 이제 살아 있는 화면에서 `ONBOARDING_ENTRY`를 쓰는 곳은 없다.

## 확인

헤드리스 Chromium(Playwright)으로 페이지를 열고 4초 동안 채팅 영역 글자를 250ms 간격으로 찍으면서, `onboarding`이나 `/me/edit`로 가는 요청과 4xx 응답, 콘솔 에러를 모았다. 처음엔 게스트가 발급되지 않아 계속 로그인 안내만 떴는데, `HeadlessChrome` UA가 크롤러 패턴(`CRAWLER_UA_PATTERN`)에 걸려 게스트 발급을 건너뛰었기 때문이었다. 일반 크롬 UA를 넣고 다시 돌렸다.

| 대상                                   | 코드                      | 결과                                                                                           |
| -------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| dev.plick.co.kr 홈                     | 고치기 전(develop 배포본) | 3/3회 `/onboarding/nickname?_rsc=…` 404, 첫 스냅샷에 "닉네임을 정해 주세요"가 잡힌 회차도 있음 |
| dev-m.plick.co.kr `/live/chat`         | 고치기 전                 | 3/3회 같은 404                                                                                 |
| 로컬 웹 프로덕션 빌드 홈               | 고친 뒤                   | 5/5회 온보딩 요청 없음, 404 없음                                                               |
| 로컬 모바일 프로덕션 빌드 `/live/chat` | 고친 뒤                   | 3/3회 온보딩 요청 없음, 404 없음                                                               |

닉네임이 빈 옛 계정은 실제 계정을 구할 수 없어 Playwright `page.route`로 `/be/api/v1/users/me` 응답의 `nickname`만 null로 바꿔 흉내 냈다. 두 앱 모두 게이트가 뜨고 버튼이 `/me/edit`로 가며, 그 프리페치는 정상 응답이었다.

로컬에서 남은 콘솔 에러는 `/be/api/v1/events`의 403 하나인데, dev BE가 localhost 오리진의 이벤트 수집을 거절하는 것이라 이번 변경과 무관하다. 채팅 웹소켓도 같은 이유로 로컬에서는 붙지 않았다. prod Lighthouse `errors-in-console` 통과는 배포 뒤 재측정으로 확인해야 한다.

그 밖에 `pnpm check-types`, `lint`, `format:check`, `test:unit`(124), `test:hooks`(40), 두 앱 빌드가 통과했다.

## 실수 하나

고치기 전 동작을 로컬에서 보려고 `git stash push -- $F`로 변경 파일만 잠시 치우려 했는데, zsh는 따옴표 없는 변수를 단어로 나누지 않아 경로 여섯 개가 한 덩어리로 넘어가 stash가 실패했다. 뒤에 이어 붙인 `git stash pop`은 그대로 돌아서 예전에 쌓여 있던 다른 stash(KAN-299 백업)를 꺼내 충돌을 냈다. pop이 충돌하면 stash 항목은 지워지지 않고 남기 때문에 잃은 건 없었다. 그 stash가 건드린 파일 여섯 개와 새로 생긴 파일 하나를 HEAD로 되돌리고, stash 항목이 그대로 있는 것을 확인했다. 그 뒤로는 stash 대신 `git diff`를 패치 파일로 떠 두고 `git checkout`과 `git apply`로 바꿔 끼웠다. 여러 단계를 `&&`로 잇지 않고 `;`로 이은 것도 화를 키웠다. 앞 단계가 실패하면 뒤 단계가 돌면 안 되는 작업은 반드시 `&&`로 묶는다.

## 관련

- [ADR 0029](0029-layered-architecture-restructure.md) 레이어 폴더와 private folder
- 게스트 발급을 브라우저로 옮긴 KAN-667(모바일 KAN-665)의 세션 대기 처리
- 재측정 원본: `docs/perf/2026-10-23-kan-667/lighthouse-full-prod.tsv`
