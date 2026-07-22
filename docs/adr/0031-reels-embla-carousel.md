# 0031. 모바일 릴스 넘김을 CSS scroll-snap에서 Embla로 갈아끼운 이야기 (KAN-277)

- 상태: 적용됨
- 범위: `apps/mobile` 릴스 피드 (`/reels`, `/reels/[postId]`)
- 관련: [ADR 0003](0003-reels-screen-and-conventions.md)(릴스 화면 최초 구현), [ADR 0004](0004-reel-detail-sheet-and-code-organization.md)(세부 바텀시트)

## 왜 다시 손댔나

릴스는 처음에 CSS scroll-snap만으로 만들었다. ADR 0003 §2에 그 판단이 그대로 남아 있다.
라이브러리 없이 두 줄이면 되니까 안 쓸 이유가 없었다.

```tsx
<main className="no-scrollbar flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain">
  <section className="relative h-full w-full snap-start">…</section>
</main>
```

그때도 마지막 절에 "무한 피드나 가상화가 필요해지면 라이브러리로 교체한다,
교체 단위는 `ReelsFeed`"라고 적어뒀다. 이번 티켓(KAN-277)이 그 시점이다.

다만 이번에 교체를 결정한 진짜 이유는 무한 피드가 아니라 손맛이었다. CSS scroll-snap은
"어디에 멈출지"만 브라우저에 알려주는 규칙이다. 실제로 손가락을 얼마나 따라갈지, 관성이
얼마나 붙을지, 어느 속도부터 다음 칸으로 넘길지는 전부 브라우저 구현에 달려 있고
내가 건드릴 수 있는 손잡이가 하나도 없다. 그래서 이런 것들이 걸렸다.

- 세게 튕기면 릴이 두세 장씩 지나간다. `snap-mandatory`는 "스냅 지점에 멈춰라"이지
  "한 번에 한 칸만 가라"가 아니다. 관성이 크면 브라우저는 세 칸 뒤 스냅 지점에 멈추는 걸로
  규칙을 지킨 셈이 된다. 릴스에서 이건 사고다. 사용자는 다음 한 장을 보려고 넘긴 거지
  중간을 건너뛰려던 게 아니다.
- 지금 몇 번째 릴을 보고 있는지 알 방법이 없다. `scroll` 이벤트에 `scrollTop / clientHeight`를
  직접 나눠서 유추하는 수밖에 없는데, 관성 도중에도 계속 발화하니 값이 계속 흔들린다.
  이걸 모르면 화면 밖 릴을 비활성화하는 것도, 나중에 영상 재생·프리페치를 붙이는 것도 못 한다.
- 딥링크로 들어오면 첫 릴이 한 번 스쳤다가 넘어간다. 마운트 후 `useEffect`에서
  `el.scrollTo({ top: idx * el.clientHeight })`로 점프시켰기 때문이다. effect는 첫 페인트
  뒤에 도니까, 브라우저는 이미 0번 릴을 한 프레임 이상 그린 뒤다.
- 스크롤과 탭이 섞인다. 손가락을 조금 움직이며 정보 블록 위에서 떼면 스크롤로 볼 수도, 탭으로
  볼 수도 있는데 브라우저 판정에 맡겨져 있어서 의도치 않게 세부 시트가 열리는 일이 있었다.

## 무엇으로 바꿨나

[Embla Carousel](https://www.embla-carousel.com) v8.6, React 바인딩(`embla-carousel-react`)을 썼다.

Embla는 브라우저 스크롤을 아예 쓰지 않는다. 뷰포트를 `overflow: hidden`으로 막아두고,
그 안의 컨테이너에 `transform: translate3d(...)`를 직접 먹여서 슬라이드를 움직인다.
손가락 입력은 `pointerdown`/`pointermove`/`pointerup`을 스스로 받아 위치를 계산한다.
즉 관성·감속·스냅 판정이 전부 JS 안에 있고, 그래서 값으로 조절할 수 있다.

용어를 한 번 정리하고 가면,

- 뷰포트(viewport): 잘라내는 창. `overflow: hidden`인 바깥 요소. 여기에 Embla의 ref를 붙인다.
- 컨테이너(container): 슬라이드를 전부 담고 있고, Embla가 `transform`으로 밀어내는 요소.
  뷰포트의 첫 번째 자식이어야 한다.
- 슬라이드(slide): 컨테이너의 자식들. 여기서는 릴 한 장(`ReelItem`).

마크업은 이렇게 됐다.

```tsx
<main ref={viewportRef} className="flex-1 touch-pan-x touch-pinch-zoom overflow-hidden">
  <div className="flex h-full flex-col" style={{ transform: /* 첫 페인트용 */ }}>
    {posts.map((post, i) => <ReelItem active={i === activeIndex} … />)}
  </div>
</main>
```

슬라이드는 `h-full w-full shrink-0 basis-full`이다. 세로 flex에서 `flex-basis: 100%`는
컨테이너 높이의 100%를 뜻하고, `shrink-0`이 없으면 릴 7장이 뷰포트 하나에 눌려 들어간다.
컨테이너 자신은 `h-full`이라 높이가 뷰포트와 같고, 자식들이 700%로 넘쳐 흐른다.
넘친 부분은 뷰포트의 `overflow-hidden`이 잘라낸다. Embla는 이 컨테이너를 위로 밀 뿐이다.

옵션은 `_constants/reels.ts`에 모아뒀다.

```ts
export const REELS_CAROUSEL_OPTIONS: EmblaOptionsType = {
  axis: "y",
  align: "start",
  loop: false,
  skipSnaps: false,
  dragThreshold: 8,
  duration: 22,
};
```

`skipSnaps: false`가 앞에서 말한 "두세 장씩 건너뛰는" 문제의 답이다. 아무리 세게 튕겨도
목표 인덱스를 현재 ±1로 자른다. `dragThreshold`는 이 거리(px)를 넘겨야 드래그로 인정하는
문턱이고, 기본 10에서 8로 낮춰 짧고 빠른 플릭도 받게 했다. `duration`은 스냅 애니메이션
길이인데 Embla 내부 단위라 ms가 아니다(기본 25, 낮출수록 빨리 붙는다). 릴스는 다음 장이
빨리 자리를 잡아야 해서 22로 조금 당겼다.

## 손으로 짚어야 했던 것들

### touch-action을 직접 걸어야 한다

Embla는 `touch-action` CSS를 스스로 넣어주지 않는다. 소스를 grep해서 확인했다(한 군데도 없다).
이걸 안 걸면 세로로 끄는 동안 브라우저가 자기 몫의 세로 팬을 같이 해버린다. 안드로이드
크롬에서는 화면 맨 위에서 아래로 끌 때 당겨서 새로고침(pull-to-refresh)까지 튀어나온다.

그래서 뷰포트에 `touch-pan-x touch-pinch-zoom`을 줬다. `touch-action: pan-x pinch-zoom`이라는
뜻이고, "가로 팬과 핀치 줌은 브라우저가 해도 되지만 세로 팬은 하지 마라"는 선언이다.
세로가 빠졌으니 브라우저는 세로 제스처를 처리하지 않고, 그 입력은 온전히 Embla의
포인터 핸들러로 간다.

Tailwind에서 이 두 유틸이 합쳐지는지가 걱정됐는데, 빌드된 CSS를 열어보니 `--tw-pan-x`,
`--tw-pan-y`, `--tw-pinch-zoom` 변수를 각각 켜고 마지막에 이어 붙이는 방식이라 같이 써도
덮어쓰지 않고 `pan-x pinch-zoom`으로 합쳐진다. 확인하고 넘어갔다.

`touch-action`은 조상까지 교차(intersect)해서 계산되니 뷰포트 한 곳에만 걸면 자식 전체에
적용된다. 슬라이드마다 반복할 필요가 없었다. 대신 기존의 `overscroll-contain`은 뺐다.
이제 스크롤 컨테이너 자체가 없으니 오버스크롤이라는 개념이 성립하지 않는다.

### 딥링크는 startIndex로 옮기고, 첫 페인트는 손으로 맞췄다

`useEffect` + `scrollTo`를 지우고 Embla의 `startIndex` 옵션으로 바꿨다. Embla는 초기화
시점에 그 인덱스 위치로 컨테이너를 옮겨놓고 시작하니까, 마운트 후 점프하는 프레임이 없다.

그런데 이걸로도 완전히 없어지진 않는다. `ReelsFeed`는 `"use client"`지만 서버에서도 한 번
렌더돼 HTML로 내려간다. 그 HTML에는 Embla가 아직 없으니 컨테이너 transform이 0이고,
브라우저는 0번 릴을 그린다. Embla는 JS 번들이 로드되고 하이드레이션이 끝난 뒤에야 붙는다.
그 사이 몇 프레임 동안 엉뚱한 릴이 보인다.

그래서 컨테이너에 첫 페인트용 transform을 직접 박았다.

```tsx
<div className="flex h-full flex-col"
     style={{ transform: `translate3d(0, -${startIndex * 100}%, 0)` }}>
```

여기서 `-100%`가 릴 한 장인 이유가 헷갈리기 쉬운데, `translate`의 퍼센트는 그 요소 자신의
크기를 기준으로 한다. 컨테이너의 border-box 높이는 `h-full` 때문에 뷰포트 높이와 같다
(자식이 넘쳐도 자기 높이는 그대로다). 그러니 `-100%` = 뷰포트 한 개 높이 = 릴 한 장이 맞다.

Embla가 붙는 순간 이 인라인 스타일은 Embla가 DOM에 직접 쓰는 `transform`으로 덮인다.
React가 나중에 되돌릴 걱정은 없다. `startIndex`가 고정이라 style prop 값이 변하지 않고,
React는 값이 그대로면 DOM 속성을 다시 건드리지 않기 때문이다.

`curl`로 SSR HTML을 뽑아 확인했다. `/reels/h3`(mock에서 인덱스 2)이 정확히
`translate3d(0, -200%, 0)`으로 나온다.

### startIndex를 첫 렌더에 얼려야 했다

`useEmblaCarousel(options)`의 React 바인딩은 매 렌더마다 options를 비교해서, 달라졌으면
`reInit()`을 부른다. 그리고 Embla 소스를 읽어보니 `reInit`은 이렇게 생겼다.

```js
function reActivate(withOptions, withPlugins) {
  const startIndex = selectedScrollSnap();
  deActivate();
  activate(mergeOptions({ startIndex }, withOptions), withPlugins);
}
```

인자 없이 부르면 현재 보고 있던 인덱스를 되살려준다. 모바일에서 주소창이 접혔다 펴질 때마다
리사이즈 → `reInit`이 도는데도 릴이 제자리에 있는 건 이 덕이다.

문제는 `mergeOptions({ startIndex }, withOptions)`에서 뒤쪽이 이긴다는 것이다. 우리가 넘기는
options에 `startIndex`가 명시돼 있으니, 이 경로로 reInit이 돌면 그 값으로 점프해버린다.
지금은 mock 배열이 고정이라 드러나지 않지만, 나중에 릴스에 무한 스크롤이 붙어 `posts`가
늘어나면 `findIndex` 결과가 밀리면서 보고 있던 자리에서 튕겨나갈 수 있다.

그래서 계산을 첫 렌더에 한 번만 하도록 `useState` 이니셜라이저로 얼렸다.

```tsx
const [startIndex] = useState(() =>
  Math.max(
    0,
    posts.findIndex((p) => p.id === initialPostId),
  ),
);
```

값이 안 변하니 options 비교가 항상 같다고 나오고, 옵션 때문에 reInit이 도는 일 자체가 없다.
리사이즈로 인한 reInit은 인자가 없으니 여전히 인덱스를 지켜준다.

### 지금 보는 릴을 알게 된 김에 inert를 붙였다

`useReelsCarousel` 훅에서 `select`와 `reInit` 이벤트를 구독해 `selectedScrollSnap()`을
상태로 들고 있는다. `select`는 애니메이션이 끝난 뒤가 아니라 목표 인덱스가 정해지는 순간
(손을 떼고 스냅이 시작될 때) 발화해서, 화면과 상태가 어긋나 보이지 않는다.

이 인덱스로 지금 당장 얻은 건 접근성이다. 릴 7장이 전부 DOM에 있으니 화면 밖 릴의 좋아요·댓글
버튼도 전부 탭 포커스 대상이고 스크린리더에도 읽힌다. 비활성 릴에 `inert`를 걸어 통째로
빼버렸다. React 19가 `inert`를 불리언 속성으로 제대로 지원해서 `inert={!active}`면 된다.
SSR HTML에서 릴 7장 중 6장에 `inert=""`가 붙는 걸 확인했다.

앞으로 붙일 자리도 여기다. 릴에 실제 영상이 들어가면 활성 릴만 재생하고 나머지는 멈추는
분기가 이 `activeIndex` 하나로 끝난다.

### 세부 시트와는 안 부딪힌다

걱정했던 건 시트가 올라와 있는 동안 뒤의 피드가 같이 끌려가는 것이었다. 확인해보니 문제없다.
시트는 `absolute inset-0 z-20` 오버레이를 깔고 `<main>`(뷰포트)의 형제로 그려진다.
Embla는 `pointerdown`을 뷰포트 요소에만 건다. 시트가 떠 있으면 포인터가 오버레이에 먼저
닿으니 뷰포트는 `pointerdown` 자체를 못 받고, 드래그가 시작되지 않는다.
`watchDrag`를 껐다 켜는 처리를 따로 넣지 않아도 됐다.

칩·제목을 시트 라인 위로 끌어올리는 거리 계산(`titleLiftDistance`)도 그대로 살아 있다.
`getBoundingClientRect()`로 화면 좌표를 재는데, 활성 릴은 정확히 뷰포트에 정렬돼 있어서
transform 방식이 바뀐 것과 무관하게 같은 값이 나온다.

덤으로 하나 좋아진 게 있다. Embla는 드래그가 문턱을 넘으면 뒤따라오는 `click`을 캡처 단계에서
막는다. 손가락을 조금 끌면서 정보 블록 위에서 떼도 시트가 열리지 않는다. 앞에서 적은
"스크롤인지 탭인지 애매한" 문제가 판정 주체가 JS로 넘어오면서 같이 정리됐다.

## 어디까지 확인했나

- `pnpm --filter mobile check-types`, `lint`, `build` 전부 클린.
- SSR HTML을 `curl`로 받아 확인: `/reels`는 `translate3d(0, -0%, 0)`,
  `/reels/h3`는 `translate3d(0, -200%, 0)`. 두 경우 모두 릴 7장 중 6장에 `inert=""`.
- 빌드된 CSS에서 `touch-pan-x`와 `touch-pinch-zoom`이 변수로 합성되는 것 확인.
- Embla 소스에서 `touch-action` 미설정, `reActivate`의 options 병합 순서 확인.

정직하게 남겨두면, 실기 스와이프 감각은 아직 내 손으로 못 만져봤다. 이번 세션에서 브라우저
자동화 도구를 못 붙여서 `duration: 22`와 `dragThreshold: 8`은 값으로만 정한 상태다.
실제 폰에서 넘겨보고 다음 항목을 손봐야 한다.

- 한 번 튕겼을 때 정말 한 장만 가는지
- 스냅이 붙는 속도가 굼뜨거나 반대로 툭 끊기지 않는지
- 첫 릴 위/마지막 릴 아래에서 고무줄이 자연스러운지 (Embla 기본 동작)
- 세부 시트를 열고 닫는 동안 피드가 흔들리지 않는지
- 다크/라이트 토글

## 하지 않은 것

- `apps/web`의 릴스 뷰어(`ReelViewer`)는 그대로 CSS scroll-snap이다. 데스크톱은 휠과
  키보드가 주 입력이고, 브라우저 기본 스크롤이 오히려 자연스럽다. 모바일에서 문제였던
  "관성으로 여러 장 건너뛰기"도 휠에서는 잘 안 생긴다. 굳이 맞출 이유가 없어 뒀다.
- 가상화(화면 밖 릴 언마운트)는 안 넣었다. 지금은 mock 7장이라 이득이 없고, 릴이 무한
  피드가 되는 시점에 `activeIndex` 기준으로 앞뒤 몇 장만 남기는 식으로 붙이면 된다.
- 스와이프에 맞춰 URL을 `/reels/<postId>`로 갈아끼우는 것도 뺐다. 공유·뒤로가기 관점에서
  분명 좋은데, Next의 라우터와 `history.replaceState`가 섞이는 지점이라 이번 티켓에서
  같이 다루면 검증 범위가 넓어진다. 별도로 본다.

## 바뀐 파일

- `apps/mobile/package.json` — `embla-carousel-react`, `embla-carousel` 추가.
  코어 패키지를 직접 의존성으로 넣은 건 `EmblaOptionsType`을 쓰기 위해서다.
  React 바인딩은 이 타입을 재수출하지 않고, pnpm은 간접 의존성 해석을 막는다.
- `apps/mobile/app/_hooks/useReelsCarousel.ts` — 신규. Embla 초기화와 활성 인덱스 추적.
- `apps/mobile/app/_constants/reels.ts` — `REELS_CAROUSEL_OPTIONS` 추가.
- `apps/mobile/app/reels/_components/ReelsFeed.tsx` — 뷰포트/컨테이너/슬라이드 구조로 교체,
  `useEffect` 점프 제거.
- `apps/mobile/app/reels/_components/ReelItem.tsx` — 슬라이드 클래스로 교체, `active` prop과
  `inert` 추가.
