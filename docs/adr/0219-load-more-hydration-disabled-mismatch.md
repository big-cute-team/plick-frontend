# 0219. 묵은 홈 문서 뒤 첫 클릭이 삼켜지던 더 보기 버튼과, 그걸 잡아낸 아침 E2E (KAN-682)

## 알림 하나에서 시작했다

2026-10-28 아침 E2E 실패 알림이 왔다. 매일 03:10 UTC에 dev 배포본을 상대로 도는 스케줄 실행이다([ADR 0169](0169-e2e-qa-automation.md)). 18개 중 하나만 깨졌는데, 웹 홈의 "이슈 더 보기를 누르면 홈 표에 이어 붙는다"였다. 재시도까지 두 번 다 같은 자리에서 멈췄다.

```
Error: expect(received).toBeGreaterThan(expected)
Expected: > 13
Received:   13
- Timeout 10000ms exceeded while waiting on the predicate
```

13은 핫이슈 3개에 피드 10개다. 버튼을 눌렀는데 10초 동안 한 줄도 안 붙었다는 뜻이다. 어제 오후 배포 직후 실행은 통과했고 그 뒤로 코드가 바뀐 것도 없었다. 그러니 코드 회귀가 아니라 환경이나 타이밍이 의심스러웠다.

## 트레이스가 보여준 것

실패 산출물은 trace와 스크린샷, 비디오까지 같이 올라온다. trace.zip을 풀어 네트워크 항목과 Playwright 액션 로그를 시간순으로 한 줄에 합쳐 봤다.

클릭은 정상이었다. Playwright 로그에 `element is visible, enabled and stable` → `performing click action` → `click action done`이 다 찍혀 있다. 그런데 그 뒤에 `cursor`가 붙은 2페이지 요청이 없다. 에러 응답도 없다. 스크린샷의 버튼은 "이슈 더 보기" 글씨 그대로 활성 상태였다. 요청도 에러도 없이 아무 일이 안 일어난 것이다.

대신 눈에 걸린 게 둘 있었다. 하나는 문서 응답 헤더다. 두 시도 모두 `x-cache: Hit from cloudfront`, `x-nextjs-cache: STALE`이었다. 다른 하나는 페이지가 뜨자마자 나간 `GET /be/api/v1/articles?size=10`이다. 홈은 서버 컴포넌트가 첫 페이지를 받아 HTML에 씨앗으로 심어 주니, 정상이라면 클라가 첫 페이지를 다시 부를 일이 없다. 그리고 클릭 시점이 정확히 그 요청이 도는 141ms 구간 안이었다.

## 왜 첫 페이지를 다시 받았나

홈 문서는 KAN-632부터 20초 ISR이다([ADR 0199](0199-no-store-bfcache-problem.md)). `s-maxage=20, stale-while-revalidate`라 20초가 지난 뒤 들어온 요청에는 옛 HTML을 주고 뒤에서 새로 만든다. 그 앞에 CloudFront가 한 겹 더 있다. 밤새 아무도 안 들어오면 아침 첫 방문자는 몇 시간 전 HTML을 받는다. 스케줄 E2E가 바로 그 첫 방문자다.

HTML 안의 씨앗에는 받은 시각 `fetchedAt`이 같이 들어 있고, `useArticleFeed`는 그걸 `initialDataUpdatedAt`으로 넘겨 씨앗의 나이를 잰다. 신선도 기준 `FEED_FRESH_MS`는 30분이다. 몇 시간 묵은 씨앗은 마운트하자마자 stale로 판정돼 첫 페이지 refetch가 나간다. 그게 그 요청이었다.

배포 직후 실행이 통과한 이유도 같은 자리에서 설명된다. 배포 뒤에는 CloudFront 문서 캐시를 무효화하니([ADR 0217](0217-cloudfront-document-invalidation-on-deploy.md)) 첫 요청이 HTML을 그 자리에서 새로 만들고, 씨앗은 방금 받은 것이라 refetch가 없다. refetch가 없으면 아래 문제도 없다.

## 처음 겪는 일이 아니었다

여기까지 와서 ADR 목록을 훑다가 [ADR 0202](0202-e2e-load-more-stale-seed-click-race.md)(KAN-666)를 찾았다. 열흘 전에 모바일 "기사 더 보기" spec이 사흘 연속 같은 아침 시각에 같은 모양으로 깨졌고, 묵은 CDN 씨앗과 재요청 잠금의 경합이라는 데까지 똑같이 짚어 놓은 글이다. 그때는 앱을 두고 모바일 spec만 고쳤다. 누르고 3초 안에 안 늘면 다시 누르는 `toPass` 묶음이다. 웹 홈 spec은 그 패턴을 받지 않았고, 이번에 그 spec이 같은 자리에서 걸렸다.

다만 그 ADR이 적은 메커니즘은 절반이었다. "비활성 버튼은 클릭 이벤트를 내지 않으니 아무 일도 없다"고 썼는데, 그 전제라면 Playwright가 비활성 버튼을 기다렸다가 눌렀을 것이다. 로그는 활성이라고 했다. 버튼은 비활성이 된 적이 없었다. 그리고 "실사용자는 200ms 안에 맨 아래 버튼을 누르지 못한다"는 판단도, 창이 하이드레이션 틈이 아니라 백엔드 응답 시간 전체라는 걸 알고 나면 달라진다. 그래서 이번에는 앱을 고쳤다. 아래가 그 절반이다.

## 그런데 왜 클릭이 사라지나

refetch가 도는 동안 버튼은 `disabled={isFetching}`이다. 옛 커서로 다음 페이지를 쏘면 400 루프에 갇히는 걸 막으려고 KAN-404에서 넣은 것이다. 그러면 Playwright가 비활성 버튼을 기다렸다가 눌렀어야 한다. 로그는 활성이라고 했다.

여기서 하이드레이션을 다시 들여다봐야 했다. 하이드레이션은 서버가 만든 HTML 위에 React가 붙는 과정이다. React는 HTML을 새로 그리지 않고 이미 있는 요소를 자기 것으로 접수하면서 이벤트 처리기만 단다. 이때 React는 자기가 렌더한 결과와 HTML을 비교하는데, 속성이 다르면 어떻게 하느냐가 핵심이다. React는 하이드레이션 중 속성 불일치를 고쳐 쓰지 않는다. 개발 모드에서 경고를 찍을 뿐이고, 배포 빌드에서는 조용히 넘어간다. react-dom의 `diffHydratedProperties`가 하는 일은 차이를 모아 경고하는 것까지다.

서버가 HTML을 만들 때는 씨앗이 방금 받은 것이라 `isFetching`이 false였고, 버튼에 `disabled`가 없다. 몇 시간 뒤 브라우저가 그 HTML로 하이드레이션하면, TanStack Query는 첫 렌더부터 "이 쿼리는 stale이니 곧 fetch한다"는 낙관적 결과를 주고 `isFetching`이 true다. React는 `disabled`를 계산하지만 HTML에는 없고, 고쳐 쓰지 않으니 DOM 버튼은 활성인 채 남는다.

그래도 클릭 처리기는 달려 있으니 눌리면 `loadMore`가 돌아야 할 것 같다. 안 돈다. React는 이벤트를 처리기에 넘기기 전에 그 요소가 button, input, select, textarea이고 props의 `disabled`가 true면 마우스 이벤트를 버린다. DOM 속성이 아니라 props를 본다. 그래서 브라우저와 사용자와 Playwright에게는 활성 버튼이고, React에게는 비활성 버튼이다. 클릭은 브라우저까지는 전달되고 React 문턱에서 사라진다.

refetch가 끝나면 `isFetching`이 false가 되고 React는 `disabled` true → false 변경을 커밋한다. 속성을 지우는 작업인데 원래 없었으니 겉으로는 아무 변화가 없다. 이 뒤에 누르면 props도 활성이라 정상 동작한다.

TanStack Query 쪽을 의심해서 `fetchNextPage`가 진행 중인 refetch 때문에 무시되는 건 아닌지 5.101.4 소스를 읽었다. `Query.fetch`는 fetch 중이면 `cancelRefetch`로 기존 것을 취소하고 새 fetch를 시작하고, `infiniteQueryBehavior`는 `fetchMore.direction`이 있으면 마지막 페이지의 `nextCursor`로 한 페이지를 받는다. 호출만 됐다면 요청이 나갔어야 했다. 호출 자체가 안 된 것이다.

## 재현

가설을 세우고 나서 로컬 Playwright로 같은 조건을 만들었다. 처음에는 `page.route`로 dev 홈 문서를 가로채 HTML 안 `fetchedAt`을 2시간 전으로 바꿨다. dev 문서를 상대로는 이게 됐다. 첫 페이지 응답을 1.5초 지연시키고 그 사이에 누르면 3번 중 3번, DOM의 `disabled`는 false이고 요청은 없고 목록은 그대로였다. refetch가 끝난 뒤 한 번 더 누르면 바로 2페이지가 왔다. 클릭이 삼켜진 것이지 쿼리가 고장난 게 아니라는 확인이다.

고친 뒤 로컬 dev 서버에 같은 스크립트를 돌리자 전혀 다른 데서 막혔다. 하이드레이션이 아예 안 됐다. 클라 요청이 하나도 없고 버튼에 React 파이버가 안 붙었다. 수정이 뭔가를 깨뜨렸나 싶어 앱 브라우저 패널에서 같은 주소를 열어 보니 거기서는 멀쩡히 하이드레이션됐다. `route.fulfill`로 문서를 다시 써서 내려주는 것이 로컬 dev 서버의 스트리밍 HTML과 맞지 않았던 것으로 보인다. 원인을 더 파지는 않고 방식을 바꿨다. 문서는 건드리지 않고 `page.clock.setSystemTime`으로 브라우저 시계를 2시간 앞당겼다. 씨앗은 그대로인데 지금이 2시간 뒤니 stale로 판정돼 refetch가 나간다. 이 방식은 dev 문서에서도 로컬에서도 똑같이 돌았다.

## 고친 것

하이드레이션 첫 렌더만 서버 HTML과 같은 값을 내게 했다. `useHydrated` 훅을 두 앱 `_hooks/`에 뒀다.

```ts
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
```

`useSyncExternalStore`의 세 번째 인자가 서버 스냅샷이다. 서버 렌더와 하이드레이션 렌더는 이 값(false)을 쓰고, 하이드레이션이 끝나면 React가 클라 스냅샷(true)으로 동기 재렌더한다. 이미 `useMediaQuery`가 같은 방식이다. `useEffect`로 state를 켜는 방법도 있지만 그건 커밋 뒤 한 프레임 늦고, 이 방식은 하이드레이션 직후 바로 따라온다.

버튼은 `disabled={hydrated && isFetching}`이다. 첫 렌더에서 `hydrated`가 false라 서버 HTML과 일치하고, 바로 이어지는 재렌더에서 true가 되면 그건 정상 렌더라 React가 DOM에 `disabled`를 실제로 쓴다. 그 뒤로는 React 내부 기록과 화면 속성이 늘 같다. 첫 렌더에서 잠금이 풀려 있는 동안 KAN-404의 보호가 비는 것 아니냐는 지적이 헤드리스 리뷰에서 나왔는데, 하이드레이션 커밋 전에는 클릭 처리기 자체가 없고, 커밋 뒤 `useSyncExternalStore`의 재렌더는 같은 태스크 안에서 동기로 끝난다. 사용자의 클릭은 별도 태스크라 그 사이에 끼어들 수 없다. 웹 `PostFeed`와 모바일 `NewsFeed`가 같은 구조라 둘 다 바꿨다. 다른 `disabled={isFetching}`들은 에러가 난 뒤 클라에서만 그려지는 다시 시도 버튼이라 서버 HTML과 어긋날 일이 없어 두었다.

고친 뒤 로컬 웹 3번, 모바일 2번 모두 refetch 중에 DOM `disabled`가 true로 잡혔고, Playwright는 활성이 될 때까지 기다렸다가 눌렀고, 2페이지 요청이 나가 23줄(모바일 20줄)이 됐다.

## 테스트만 고치지 않은 이유

ADR 0202처럼 웹 spec에도 다시 누르는 묶음을 넣으면 테스트는 통과한다. 그런데 이건 사용자도 겪는 일이다. 몇 시간 만에 홈에 들어와 페이지가 뜨자마자 더 보기를 누르면 백엔드 응답이 오기 전 구간에서는 눌러도 반응이 없고, 버튼이 흐려지지도 않아 왜 안 되는지 알 수 없다. 창의 길이는 하이드레이션 틈이 아니라 첫 페이지 재요청이 걸리는 시간 전체다. dev에서 141ms였고, 느린 회선이면 그만큼 늘어난다. 자주 드러나지 않을 뿐 코드상 늘 있던 버그다. E2E가 PR 게이트가 아니라 배포본 QA인 이유가 이런 걸 잡으라는 것이었으니([ADR 0169](0169-e2e-qa-automation.md)), 앱을 고치는 게 맞았다.

## 남는 것

모바일 spec의 다시 누르기 묶음(KAN-666)은 그대로 뒀다. 앱이 고쳐지면 첫 클릭이 먹어 한 번으로 끝나고, 묶음은 해가 없다. 웹 spec은 손대지 않았다. 사용자처럼 한 번 누르는 spec이 통과해야 이 수정이 맞다는 증거다.

같은 패턴, 즉 서버는 안 하는데 클라 첫 렌더는 하는 `disabled`나 `aria-*` 토글은 씨앗을 받는 다른 화면에도 생길 수 있다. 지금은 홈 피드 둘만 확인했다. 하이드레이션 불일치는 배포 빌드에서 아무 흔적을 안 남기니, 의심스러우면 개발 모드에서 콘솔의 하이드레이션 경고를 보는 게 가장 빠르다.
