# 0037. 트윗 임베드를 X 공식 widgets.js로 전환 (KAN-291)

## 배경

KAN-284([ADR 0035](0035-null-photo-tweet-embed-fallback.md))에서 사진이 null인 카드의 사진 자리를
원문 트윗 임베드로 채우면서 react-tweet을 골랐었다. 트위터의 신디케이션 API(트윗 데이터를 JSON으로
주는 문서화 안 된 엔드포인트)를 받아 React 컴포넌트로 직접 그리는 방식이라, iframe 없이 CSS 변수로
색과 크기를 전부 우리가 쥘 수 있다는 게 이유였다. 대신 비공식 API라 언제 깨져도 이상하지 않다는
리스크를 안고 갔고, ADR에도 그렇게 적어 뒀다.

KAN-291은 그 리스크를 정리하는 티켓이다. 임베드를 X 공식 임베딩(widgets.js)으로 전환한다.
공식 임베드는 `platform.twitter.com/widgets.js` 스크립트가 트윗을 iframe으로 심어 주는 방식이다.
iframe 내부는 X 소유라 스타일을 못 만지지만, X가 직접 제공하는 경로라 계약이 깨질 걱정과
Display Requirements(임베드 표시 규정) 회색 지대를 동시에 벗는다.

## 구현 — createTweet 프로그램 방식

widgets.js를 쓰는 방법은 둘이다. `<blockquote class="twitter-tweet">`를 두고 스크립트가 훑어가게
하는 선언 방식과, `twttr.widgets.createTweet(id, container, options)`를 직접 부르는 프로그램 방식.
React 트리 안에서 마운트·교체 타이밍을 우리가 쥐어야 해서 프로그램 방식을 골랐다.

구조는 훅 둘로 나눴다.

- `useTweetWidget(containerRef, id)`: 스크립트 로드와 위젯 생성. 스크립트는 모듈 스코프
  Promise 하나로 앱에서 한 번만 로드하고, 동시에 뜨는 임베드 여럿이 같은 Promise를 공유한다.
  `createTweet`에는 `conversation: "none"`(스레드 부모 숨김 — react-tweet 때와 같은 모양)과
  `dnt: true`(개인화 추적 끔)를 준다. 로드 실패·트윗 없음은 throw 대신 상태(`error`)로 삼켜서
  임베드 자리가 조용히 placeholder(팀 그라데이션)로 남게 했다.
- `useTweetFit(outerRef, innerRef)`: 릴스처럼 정해진 박스에 넣을 때의 fit-scale. 카드가 박스보다
  크면 transform scale로 통째로 축소한다. 컨테이너와 콘텐츠 양쪽에 ResizeObserver를 걸어 임베드
  로딩으로 카드가 자라는 흐름과 세부 시트 개폐로 박스가 변하는 흐름(트랜지션 프레임 포함)을
  같은 경로로 따라간다. KAN-284 때 만든 훅에서 미디어 숨김 로직을 뺀 것이다(아래 참고).

지우는 것도 많았다. react-tweet 의존성, 신디케이션 프록시 라우트(`/api/tweet/[id]` — 클라가
react-tweet 공용 엔드포인트의 rate limit을 타지 않게 우리 서버가 대신 받아주던 것), globals.css의
`--tweet-*` 토큰 오버라이드 전부. 공식 임베드는 iframe이 X에서 직접 데이터를 받으니 프록시가
필요 없고, iframe 내부 스타일은 어차피 못 만지니 오버라이드도 무의미하다.

### 테마 — CSS 변수 대신 옵션 재생성

react-tweet 때는 `--tweet-*` 변수를 PLick 토큰으로 덮어서 다크/라이트 전환이 저절로 따라왔다.
iframe은 그 길이 없다. 대신 `createTweet`의 `theme: "dark" | "light"` 옵션을 쓴다. PLick은 다크가
기본(`:root`)이고 라이트가 `<html data-theme="light">` 오버라이드라, `data-theme` 속성을 읽어
없으면 dark로 매핑했다. 공식 임베드는 렌더 후 옵션을 못 바꾸므로 토글 시에는 위젯을 지우고 다시
만든다 — `documentElement`에 MutationObserver를 걸어 `data-theme` 변화를 구독했다.

재생성에는 경합이 있다. effect가 다시 돌면 이전 `createTweet`가 아직 비행 중일 수 있고, 그게
늦게 도착해 컨테이너에 이전 옵션의 위젯을 덧붙인다. cleanup에서 cancelled 플래그를 세우고,
resolve된 위젯 요소를 cancelled면 바로 remove하는 걸로 정리했다.

## 세션 중 뒤집힌 것들 — 미디어 숨김 제거와 상호작용 차단

### 사진은 무조건 넣는다

처음엔 KAN-284의 "넘치면 미디어 숨김" 로직을 공식 옵션 `cards: "hidden"` 재생성으로 옮겨
구현했다. 올리자마자 피드백이 왔다 — 크기가 커지면 사진을 빼는 로직 자체를 없애고 사진은
무조건 들어가야 한다는 것. 그래서 미디어 숨김 경로(useTweetFit의 hideMedia, flow 레이아웃의
높이 상한 `TWEET_FLOW_MAX_HEIGHT_RATIO`)를 전부 걷어냈다. fill은 scale 축소만 남고, flow(기사
세부)는 자연 높이 그대로 선다. 축소는 본문을 자르는 게 아니라서 Display Requirements 문제도 없다.

### 임베드 위 스와이프가 죽는다 — pointer-events-none 복귀

릴스에서 트윗 카드 위에 손을 대고 세로 스와이프하면 릴이 안 넘어간다는 보고가 왔다. 원인은
iframe의 본질이다. react-tweet은 같은 DOM이라 Embla(포인터 드래그 기반)가 이벤트를 받을 수
있었지만, iframe 안에서 시작한 포인터 이벤트는 부모 문서로 절대 올라오지 않는다. 참고로 기사
세부의 flow 임베드는 문제가 없다 — 일반 스크롤은 iframe 콘텐츠가 스크롤 불가면 부모로
체이닝되지만, Embla는 스크롤이 아니라 드래그다.

그래서 fill 임베드를 `pointer-events-none` + `aria-hidden`으로 되돌렸다. KAN-284 첫 구현이
이랬다가 Display Requirements(액션·링크가 동작해야 함) 때문에 풀었던 자리인데, 스와이프가
죽는 건 릴스 UX의 근간이라 사진 대체물은 순수 시각 요소로 두기로 결정했다. 원문으로 가는
길은 세부 시트의 "출처 원문 보기" 링크가 맡는다. 이 결정으로 핫이슈 카드의 투명 Link도
하단 40%로 좁혔던 걸 카드 전체로 되돌렸고, 릴 정보 블록의 탭 통과 주석도 정리했다.

### 화면 꽉 차게 + 흰 꼭짓점

임베드 박스가 원래 좌우 16px, 위 safe-area, 아래 30%를 비운 안전 영역이었는데, 사진처럼 릴
화면을 꽉 채우라는 피드백으로 중간 박스를 없애고 시트 연동 높이 층에 임베드를 직결했다.
카드 정렬도 세로 중앙에서 상단 밀착(`items-start`)으로 바꿨다.

그러자 카드 모서리 밖으로 흰 꼭짓점이 비어져 나왔다. 이건 color-scheme 합성 규칙이다 —
임베더 문서(다크)와 크로스오리진 iframe 내부의 color-scheme이 다르면 브라우저가 투명한
iframe 뒤를 흰색 캔버스로 칠해 버린다. iframe 요소에 `color-scheme: light`를 명시해 투명을
살리고, X 카드의 고정 radius(12px)만큼 iframe 자체도 클립해 이중으로 막았다. 12px은 X
임베드의 외부 산물이라 우리 토큰을 쓰지 않았다.

### 릴 배경을 임베드 배경색으로

팀 컬러 그라데이션 위에 검은 트윗 카드가 뜨니 따로 노는 느낌이라, 임베드 릴은 배경을 임베드
카드와 같은 색으로 맞추라는 피드백이 왔다. 공식 임베드는 배경색을 바꿀 옵션이 없다 — theme
dark/light가 전부다. 그래서 반대로 릴 배경을 임베드 쪽에 맞췄다. 처음엔 다크를 `#000`으로
짚었는데 실제 카드 배경과 미묘하게 어긋났고, 실측값을 받아 다크 `#151e26`, 라이트 `#ffffff`로
확정했다. `--tweet-embed-bg` 변수를 globals.css에 두고(`data-theme`로 뒤집힘) MediaThumb의
style로 그라데이션을 끄고 이 색을 깔았다. PLick 토큰이 아닌 이유는 12px과 같다 — X의 고정
팔레트를 따라가는 값이다.

### 스크림 — 텍스트 구간은 완전 불투명, 아이콘은 국소

임베드가 화면을 꽉 채우니 하단 제목과 우측 액션 아이콘 뒤로 트윗 내용이 비쳤다. 하단 정보
블록 그라데이션은 리드인 구간에서만 투명→불투명 전환하고 텍스트 구간부터는 완전 불투명
(`--plk-scrim` 100%)으로 올렸다. 우측은 처음에 세로 라인 전체 그라데이션을 진하게 했다가,
아이콘 있는 부분만 가리라는 피드백으로 전체 스크림을 지우고 액션 레일 컨테이너 자체에
rounded-pill 반투명 배경을 붙였다. 패딩만큼 right·bottom을 당겨 아이콘 위치는 그대로다.

### 짧은 카드는 영역 가운데로

상단 밀착으로 바꾸고 나니 짧은 트윗(텍스트 한두 줄)은 화면 위에 붙고 아래가 텅 비어 어색했다.
릴 상단부터 칩 줄 윗부분까지를 기준 영역으로 잡고, 카드가 영역보다 길면 지금처럼 상단 밀착,
짧으면 영역 세로 중앙에 세우라는 피드백을 받았다.

영역 높이는 ReelItem이 실측한다 — 칩·제목 블록(titleRef)의 top에서 섹션 top을 뺀 값이다.
제목 줄수에 따라 릴마다 다르다(2줄 566px, 1줄 599px 식). 주의할 게 하나 있었는데, 세부 시트가
떠 있는 동안은 이 블록에 도킹 transform이 걸려 rect가 위로 가 있다. transform은
getBoundingClientRect에 그대로 반영되므로 시트 모션 중에는 재측정을 건너뛰고 resting 값을
유지했다.

정렬 자체는 useTweetFit이 맡는다. scale 계산에 이어 카드의 시각 높이(innerH × scale)가 영역보다
작으면 `(영역 − 시각높이) / 2`를 translateY로 내려보낸다. 이 과정에서 잠재 버그도 하나 잡았다 —
상단 밀착으로 바꿀 때 transform-origin을 기본(중앙)에서 top으로 안 바꿔 놔서, scale이 1 미만으로
축소되는 긴 카드는 중앙 기준으로 줄며 위아래가 잘릴 수 있었다. `origin-top`을 명시해 offsetY와
scale이 계산과 일치하게 했다.

검증은 X 스로틀링 때문에 실렌더 대신 iframe 높이를 강제로 300px/900px로 바꿔 했다. 300px 카드는
영역(566px) 가운데 top 133px에 서고, 900px 카드는 top 0 밀착으로 스크림 뒤까지 흐르는 걸
스크린샷으로 확인했다.

## 검증

- 릴스: 실데이터 x.com 링크로 공식 위젯 렌더 확인(iframe 375px 풀폭, 다크 테마, 상단 밀착,
  color-scheme·radius 적용을 DOM 측정으로 확인). 임베드 위에서 드래그하면 릴이 넘어가는 것
  확인. 검은 배경과 스크림 적용 스크린샷 확인.
- 존재하지 않는(삭제된) 트윗은 위젯이 0~1px로 남아 사실상 배경만 보인다 — placeholder 폴백과
  같은 결말이라 그대로 뒀다.
- 자동화 브라우저에서 페이지를 짧은 시간에 여러 번 새로고침하니 X가 임베드 로드를 스로틀링해
  위젯이 0px로 멈추는 현상이 있었다. 같은 코드로 직전 로드에서는 정상 렌더됐고 실브라우저에서도
  정상이라 코드 문제가 아니라 판단했다. 기사 세부(flow)도 같은 시점에 걸려 화면으로는 못 보고
  DOM 구조(위젯 마운트, px-edge 폭 335px)까지만 확인했다.
- `pnpm check-types`, `pnpm lint`, `pnpm --filter mobile build` 통과.

## 남긴 것

- 임베드 상호작용 차단은 X Display Requirements의 "액션이 동작해야 한다" 조항과 상충한다.
  스와이프 UX를 우선한 제품 결정이고, 문제가 되면 fill 임베드에 한해 다시 논의한다.
- 핫이슈 카드 임베드는 여전히 BE `/articles/hot` 응답에 `sourceUrl`이 없어 잠자는 상태다
  (ADR 0035와 동일). 필드가 추가되면 자동으로 켜진다.
- 테마 토글 시 위젯 재생성은 네트워크 리로드라 한 박자 늦게 갈아입는다. 토글이 잦은 동작이
  아니라 감수했다.
