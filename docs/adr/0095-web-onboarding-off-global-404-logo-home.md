# 0095. 웹 온보딩 내리기, 전역 404 페이지, 모바일 로고 홈 링크

## 프로덕션에서 온보딩이 또 떴다

직전 세션(0094)에서 온보딩 흐름을 내렸는데, 프로덕션 첫 로그인에서 온보딩이 또 떴다는 제보로
세션을 시작했다. 처음엔 코드가 덜 내려간 줄 알고 뒤졌는데, 모바일 쪽은 코드가 멀쩡했다. 범인은
배포 타이밍이었다. develop을 main으로 병합한 게 14:53이고 prod Deploy 워크플로가 13분 47초
걸려 15:07쯤 끝났는데, 그 사이에 첫 로그인을 테스트한 거였다. 로그인 리다이렉트는 서버 액션이
서버에서 결정하니까, 그 순간 요청을 받은 인스턴스가 옛 코드면 옛 분기(`needsOnboarding`이면
온보딩으로)가 그대로 돈다. Blue/Green이라 트래픽 전환은 배포 마지막에 일어나서, 배포가 "시작"된
뒤에도 한동안 옛 코드가 서빙된다는 걸 몸으로 확인했다.

검증은 `curl`로 했다. 새 빌드에서는 온보딩 라우트가 `_onboarding` private 폴더로 내려가
`/onboarding/nickname`이 404여야 하는데, prod가 실제로 404를 돌려줘서 새 코드 서빙을 확인했다.
라우트 존재 여부가 배포 버전의 리트머스가 된 셈이다.

## 그런데 웹은 진짜로 살아 있었다

모바일은 타이밍 문제로 정리됐는데, 사용자가 다시 보니 웹(apps/web)은 온보딩이 그대로 살아
있었다. 0094에서 모바일만 내리고 웹을 빼먹은 거다. 웹에는 `app/onboarding` 라우트도,
`_services/auth.ts`의 로그인 분기(`redirect(data.needsOnboarding ? ONBOARDING_ENTRY : "/")`)도
전부 남아 있었다.

모바일 커밋(b73bfb8)을 거울삼아 똑같이 내렸다.

- `app/onboarding` → `app/_onboarding`으로 `git mv`. underscore 폴더는 Next private folder라
  라우팅에서 빠지고 번들에도 안 들어간다. 코드는 잠들어 있을 뿐이라 되살릴 때 폴더명만 돌리면 된다.
- 로그인 분기 제거, `redirect("/")`로 고정. `needsOnboarding` 필드는 BE가 계속 주니까 인터페이스
  shape만 유지하고 읽지 않는다는 주석을 달았다.
- 폴더 이동으로 깨지는 내부 import 두 곳(`@/onboarding/_components/SkipLink` →
  `@/_onboarding/...`)을 고쳤다. 잠든 코드끼리의 참조는 그대로 뒀다 — 모바일도 같은 상태다.
- `ONBOARDING_ENTRY` 상수와 robots.ts 주석도 모바일과 같은 문구로 맞췄다.

빌드 산출물(`.next/server/app`)에서 onboarding 라우트가 사라진 것과, dev 서버에서
`/onboarding/nickname`이 404 나는 것까지 확인했다.

## 전역 404 페이지

작업 중에 요청이 하나 더 들어왔다. 잘못된 주소로 들어가면 Next 기본 404(검정 바탕에 영문 404)가
떠서 브랜드가 없다는 거다. 양쪽 앱 모두 루트에 `not-found.tsx`를 만들었다.

App Router에서 루트 `app/not-found.tsx`는 어떤 라우트에도 매칭되지 않는 URL 전부를 받는다.
이미 있던 `articles/[postId]/not-found.tsx`는 그 세그먼트 안에서 `notFound()`를 불렀을 때만
쓰이는 별개 화면이라 그대로 두고, 전역 것만 새로 만들었다.

디자인은 기존 기사 404 화면의 관용(headline 제목 + body 부제 + 홈으로 버튼)을 그대로 가져오고
브랜드 요소를 얹었다.

- 모바일: `AppShell` 안에 `@plick/ui`의 `Logo`(워드마크) + accent색 "404" 라벨
  (`text-label tracking-label`) + 문구 + `PrimaryButton`. 모바일 타입 스케일에는 display급
  큰 글자가 없어서 404를 라벨 크기로 작게 얹는 쪽을 택했다. 토큰 밖 임의 폰트 크기는 금지라
  숫자를 키우는 선택지가 애초에 없었다.
- 웹: `SiteHeader`(GNB에 로고가 이미 있다) + `text-display`(44px) accent "404" + 같은 문구 +
  알약 링크 버튼(hover·focus-visible 포함). 데스크톱에는 display 토큰이 있어서 404를 크게 쓸
  수 있었다.

둘 다 다크 기준, 토큰 유틸만 썼다. 스크린샷으로 양쪽 화면을 확인했다.

## 모바일 로고 홈 링크

하나 더. 웹은 GNB 로고를 누르면 홈으로 가는데 모바일은 로고가 그냥 그림이었다. `TopBar`가
`<Logo>`를 링크 없이 렌더하고 있어서 `<Link href="/">`로 감쌌다. 웹 `SiteHeader`와 같은
관용이다. `Logo` svg에 `aria-label="플릭 PLick"`이 이미 있어서 링크 접근성 이름은 그걸로
충분하다.

검증하다 하나 걸렸다. 브라우저 패널이 hidden 상태면 클릭 이벤트가 30초 타임아웃으로 죽는다
(패널이 안 보이면 렌더러가 얼어 있다). 그래서 클릭은 `querySelector(...).click()`을 JS로
직접 쏴서 `location.pathname`이 `/articles` → `/`로 바뀌는 걸로 확인했다.

## 확인한 것

- `pnpm --filter web build`, `pnpm --filter mobile build` 클린 빌드 통과
- 양쪽 lint, check-types 통과
- 웹 빌드 산출물에 onboarding 라우트 없음, dev에서 `/onboarding/nickname` 404
- 웹·모바일 404 화면 스크린샷 확인
- 모바일 로고 클릭 → 홈 이동 확인

## 남은 것

- 온보딩을 되살릴 때: 양쪽 앱 모두 폴더를 `app/onboarding`으로 되돌리고 로그인 분기 복원.
  이제 웹과 모바일이 같은 상태라 한쪽만 되살리는 실수는 없어야 한다.
