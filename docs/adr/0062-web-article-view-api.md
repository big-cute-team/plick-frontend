# 0062 — web 기사·릴 조회수 기록 API 이식 (KAN-332)

- 상태: Accepted
- 날짜: 2026-07-29
- 범위: `apps/web` + `packages/core` + `apps/mobile`(import 교체). 모바일이 KAN-310에서 붙인
  조회 기록(`POST /api/v1/articles/{articleId}/view`)을 web 기사 세부와 릴스에 이식하고,
  fetcher를 `@plick/core`로 승격했다.
- 관련: [ADR 0046 모바일 조회수 API](0046-article-view-api.md) ·
  [ADR 0060 web 기사·릴 좋아요 API](0060-web-article-like-api.md) ·
  [ADR 0011 공용 경계](0011-shared-code-boundary.md) · `api-integration` 스킬 `web-wiring.md`

---

## 계약은 이미 모바일에 굳어 있다

web 이식 단계라 `be-verify`를 부르지 않았다. 이 엔드포인트의 진짜 계약은 KAN-310 때
모바일 코드에 다 굳어 있다(ADR 0046). 요약하면 이렇다.

- 릴 전용 엔드포인트는 없다. 릴도 기사와 같은 `articleSummaryId`라 이 하나로 두 화면을 다 처리한다.
- 보호 API다. 토큰 없이 부르면 401 `AUTH_REQUIRED`이고 익명 조회수 같은 건 없다.
- 하루 1회는 서버가 막는다. DB `(user_id, article_summary_id, view_date)` 유니크에
  `ON CONFLICT DO NOTHING`이라, 중복으로 보내도 409가 아니라 200이 오고 카운트만 안 오른다.
- 응답 `data`는 `null`이다. 갱신된 조회수를 안 주므로 화면 카운트를 즉시 올리지 않는다.
  하루 1회 제약 때문에 이번 호출이 실제로 세어졌는지 FE가 알 수 없다는 게 더 결정적인 이유다.

그래서 이번 작업의 본편은 계약 확인이 아니라 승격 판단과 "web에서는 어디서 부르나"였다.

## recordArticleView는 core로, 훅은 복제로

이 엔드포인트가 쓰는 조각은 셋이다. fetcher(`recordArticleView`), 훅(`useArticleView`),
기사 세부의 부수효과 경계(`ArticleViewTracker`). 셋을 ADR 0011 게이트에 하나씩 대 봤다.

`recordArticleView`는 승격했다. `apiFetch` 하나만 물고 있는 순수 모듈이라 게이트 A(앱 역참조
금지)를 그대로 통과하고, 모바일 파일을 자르지 않고 파일째 옮길 수 있었다. web이 두 번째
실사용처가 되면서 게이트 C(성숙도)도 이번에 섰다. `apps/mobile/app/_services/article-views.ts`를
`packages/core/src/article-views.ts`로 옮기고 모바일 `useArticleView`의 import를
`@plick/core/article-views`로 바꿨다. 모바일 `_services`에서 순수 모듈이 또 하나 빠진 셈이다.
JSDoc에서 모바일 파일을 가리키던 자리(`proxy.ts`, `useArticleView`)만 "각 앱 …"으로 고쳤다.
두 앱 다 같은 이름의 프록시와 훅을 갖고 있어 설명이 그대로 성립한다.

`useArticleView`는 web에 복제했다. `AuthProvider`를 물고 있어 게이트 A에서 실격이고,
애초에 훅은 승격하지 않고 앱별 복제로 두는 게 KAN-321부터 이어 온 정책이다. 승격분을 걷어내고
나면 모듈 수준 `Set` 하나와 이펙트 하나짜리 얇은 껍데기라 복제가 싸다. 세션 내 중복 방지
`Set`을 모듈 수준에 두는 이유, 응답을 기다리지 않고 먼저 `add`하는 이유, 실패를 삼키는 이유는
전부 ADR 0046에 있고 web에서도 똑같이 성립해서 로직은 한 글자도 바꾸지 않았다.

`ArticleViewTracker`도 복제했다. 기사 세부 페이지가 서버 컴포넌트인 것까지 모바일과 같아서,
아무것도 그리지 않는 얇은 클라 경계를 그대로 세우면 된다. 라우트 전용이라
`articles/[postId]/_components/`에 둔다.

## 릴스는 부르는 자리가 다르다

기사 세부는 모바일과 판박이다. 페이지에 `<ArticleViewTracker articleId={…} />` 한 줄.

릴스가 갈렸다. 모바일 릴스는 Embla 캐러셀이라 `ReelItem`이 `active` prop을 이미 들고 있다
(화면 밖 릴을 `inert`로 묶는 데도 쓴다). 그래서 훅을 `ReelItem`에서 부르고 `active`를 그대로
넘기면 됐다. web 릴스는 CSS scroll-snap 뷰어라 릴 개별로는 자기가 활성인지 모른다. 활성
인덱스는 `useActiveReel`(IntersectionObserver)이 잡고 그걸 아는 건 `ReelsWorkspace`뿐이다.

모바일 모양을 따라가려면 `activeIndex`를 `ReelViewer`를 거쳐 `ReelItem`까지 prop으로 내려야
한다. 조회 기록 하나 때문에 두 층의 props를 넓히는 건 배보다 배꼽이라, 활성 릴을 이미 아는
`ReelsWorkspace`에서 한 번만 불렀다.

```ts
const activeReel = reels[activeIndex];
useArticleView(activeReel?.id ?? "", activeReel !== undefined);
```

훅은 조건부로 부를 수 없으니 로드 전(릴 목록이 비었을 때)은 두 번째 인자 `active`를 꺼서
건너뛰게 했다. 활성 릴이 바뀌면 이펙트가 새 id로 다시 돌고, 같은 릴로 되돌아오면 모듈 `Set`이
걸러낸다. 화면에서 보이는 동작은 모바일과 같다 — 활성이 되는 즉시 한 번, 세션 내 재활성은
무시. 부르는 층만 다르다. 겸사겸사 세부 패널이 쓰던 `reels[activeIndex]`도 새로 만든
`activeReel`로 정리했다.

패널이 두 벌 렌더되는 액션 레일에 훅을 두면 안 된다는 KAN-330 교훈(ADR 0060)과도 결이 같다.
상태나 부수효과를 들고 있는 훅은 "그 값을 유일하게 아는 층"에 한 번만 둔다.

## 검증 — 패널의 하이드레이션 함정을 정통으로 다시 밟았다

계약은 모바일과 같은 코드를 쓰는 걸로 갈음하고 화면만 밟으면 되는데, 여기서 한참 헤맸다.

이번엔 :3000을 다른 세션의 dev 서버가 물고 있었다. Next 16은 같은 앱 디렉터리에 `next dev`를
두 개 못 띄우게 막는다(`Another next dev server is already running`). `autoPort`로도 소용이
없길래 방금 빌드한 산출물로 `next start`(:3100)를 띄워 검증하기로 했다.

일회용 테스트 유저(user_id 43, `provider_id: KAN332-test`)를 만들고 토큰을 민팅해 브라우저
패널에 쿠키로 심고 기사 세부로 들어갔다. 그런데 POST가 안 나간다. 서버 쪽을 다 뒤졌다 —
응답 HTML의 RSC 페이로드에 `isLoggedIn: true`도 `ArticleViewTracker`의 `articleId: "8032"`도
멀쩡히 들어 있고, 패널에서 손으로 `fetch("/be/api/v1/users/me")`를 날리면 프록시가 Bearer를
실어 유저 43이 돌아온다. 배관은 전부 정상인데 이펙트만 안 돈다.

원인은 KAN-330 때 이미 기록해 둔 그 함정이었다. 브라우저 패널은 `visibilityState: hidden`에
뷰포트 0x0이라 하이드레이션이 진행되지 않는다. 클라 코드가 한 줄도 안 도니 이펙트가 돌 리
없다. ADR 0046에서 "요청이 안 나가면 코드보다 하이드레이션부터 의심하라"고 스스로 적어 놓고
또 코드부터 뒤졌다. fiber 키를 세 보니 0이었다. 조회 기록은 클릭조차 필요 없는 순수
이펙트라 패널로는 아예 검증이 불가능한 표면이다.

실제 브라우저로 옮겨 밟으려던 참에 사용자가 자기 브라우저에서 동작을 확인해 줬다. 검증을
마치고 테스트 유저 43은 지웠다(`article_views`에 남긴 행은 없었다 — 패널에서는 끝내 POST가
못 나갔으니까).

빌드 검증은 공용 패키지(core)를 건드렸으므로 `pnpm --filter web build`와
`pnpm --filter mobile build`를 둘 다 돌렸고, check-types·lint·format:check까지 통과했다.

## 남긴 것

`web-wiring.md`의 승격 후보 목록에 `recordArticleView` 승격 완료와 `useArticleView` 앱별
복제를 기록했다. 이걸로 이식 순서 6단계(뮤테이션)의 조회수까지 끝나서, 모바일이 붙인
엔드포인트 중 web에 남은 건 없다. 다음은 계약 공백(알림, 실시간 인기, 관련 기사)이 BE에
생기는 걸 기다리는 쪽이다.
