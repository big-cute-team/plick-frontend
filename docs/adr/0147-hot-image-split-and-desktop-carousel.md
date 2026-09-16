# ADR 0147 — 핫이슈를 사진 유무로 가르고, 데스크톱 캐러셀에 네 장을 깔았다 (KAN-480)

- 상태: Accepted
- 날짜: 2026-09-16
- 브랜치: `feature/KAN-480-hot-image-split`
- 관련: [ADR 0002 §6-2 캐러셀 기하](0002-mobile-home-layout.md) · [ADR 0011 공용 경계](0011-shared-code-boundary.md) · [ADR 0005 `@plick/ui` 승격 절차](0005-web-home-and-ui-promotion.md) · BE KAN-487(핫이슈 분리)·KAN-503(한 줄 요약)

## 뭘 하려던 건가

티켓 본문은 세 줄이었다.

> 기존 핫이슈 api가 사진있는 핫이슈만 주는 api로 갈 것
> PC에서는 캐러셀이 1/4사이즈로 줄이고 네개가 한번에 보이게. 모바일은 그대로 가기
> 공통 : 이미지 없는 것들에 대한 핫이슈는 그 밑에 세칸을 줄것
> 백엔드 구현 완료. 하나의 api에 두개 나눠서 담겨져 옴

읽고 나서 바로 코드를 열지 않았다. "세 칸"이 3열 그리드인지 3행 리스트인지, 모바일도 똑같이 세 칸을 주는 건지, 네 장이 한 번에 보이는 캐러셀에서 점 인디케이터와 자동 넘김은 어떻게 되는지가 다 안 정해져 있었다. 이런 건 찍어서 만들면 반드시 다시 만들게 된다. 그래서 물어보고 시작했고, 답은 이랬다.

- 사진 없는 핫이슈: PC는 3열 그리드, 모바일은 캐러셀 밑에 3행 리스트
- 자동 넘김은 모바일만 유지
- PC 캐러셀은 점 인디케이터를 빼고, 좌우 핸들은 네 장이 통째로 넘어가게
- 피그마 시안은 없다. 기존 토큰으로 알아서

시안이 없다는 건 부담이 아니라 오히려 편했다. 카드 하나 만들자고 새 색이나 새 간격을 만들 이유가 없었고, 화면에 이미 있는 어휘(사이드바 랭킹 카드의 `bg-elevate-2` + `border-border`)를 그대로 가져다 쓰면 됐다.

## 1. 먼저 막힌 데: 로컬 BE가 옛 빌드였다

티켓에 "백엔드 구현 완료"라고 적혀 있었지만, 계약을 눈으로 보기 전에는 아무것도 못 한다. 응답 모양을 짐작해서 타입을 쓰면 나중에 전부 다시 고쳐야 한다. 그래서 `be-verify` 서브에이전트에 계약 확인을 맡겼는데, 돌아온 답이 "실측이 안 됐다"였다.

로컬 8080에 떠 있는 BE 프로세스는 9월 8일에 뜬 것이었다. KAN-487(핫이슈 분리)은 9월 15일에 머지됐으니 그 빌드에는 들어 있지 않았다. 실제로 8080을 찔러 보면 아직 옛 계약, 즉 카드 배열이 그대로 왔다.

그러면 최신 소스로 다시 띄우면 되는데, 여기서 두 번째 벽이 있었다. BE는 JPA `ddl-auto: validate` 설정이라 부팅할 때 엔티티와 실제 테이블 스키마를 대조하고 하나라도 어긋나면 그냥 죽는다. KAN-487이 `RawArticle` 엔티티에 `mediaUrl` 필드를 추가했는데 공유 Supabase의 `raw_articles` 테이블에는 그 컬럼이 없었다. 컬럼 이름만 확인하고 넘어갈 게 아니라 실제로 조회해서 확인했다.

```
raw_article_id | article_summary_id | reporter_id | reporter_tier
content | created_at | source_url | posted_at
```

`media_url`이 없다. 공유 DB라 손대기 전에 확인을 받았고, 승인받고 나서 BE 저장소의 테스트 스키마 정본(`src/test/resources/schema.sql`)에 적힌 그대로 적용했다.

```sql
ALTER TABLE public.raw_articles ADD COLUMN IF NOT EXISTS media_url text;
COMMENT ON COLUMN public.raw_articles.media_url IS '원문 게시글 첫 사진 URL. null이면 이미지 없음이거나 컬럼 추가(KAN-487) 이전 수집분';
```

nullable 컬럼을 더하기만 하는 DDL이라 기존 행은 전부 null이 되고 읽는 쪽은 아무 영향이 없다. 그래도 공유 DB에 쓰는 일이라 `IF NOT EXISTS`를 붙여 두 번 돌아도 안전하게 뒀다.

그다음 8080은 IDE가 잡고 있어 못 죽이니 8082에 두 번째 인스턴스를 띄웠다. `.claude/launch.json`에 이미 `backend-8082` 항목이 있어서 그대로 썼다.

## 2. 새 계약을 눈으로 봤다

8082에서 받은 실응답이다.

```json
{
  "code": "OK",
  "data": {
    "withImage": [],
    "withoutImage": [
      {
        "articleSummaryId": 8032,
        "title": "맨체스터 유나이티드, 킷 마게트슨 영입 확정",
        "summaryShort": "맨체스터 유나이티드가 웨일스 U-21 골키퍼 킷 마게트슨의 영입을 확정했다.",
        "rumorStage": "OFFICIAL",
        "publishedAt": "2026-07-27T18:25:23.735+09:00",
        "imageUrl": null,
        "teams": [1],
        "logoUrl": null,
        "sourceUrl": "https://x.com/JacobsBen/status/2081672288076714166",
        "reporter": { "name": "Ben Jacobs", "tier": null },
        "likeCount": 1,
        "commentCount": 8,
        "viewCount": 11,
        "likedByMe": false
      }
    ]
  }
}
```

세 가지를 확인했다.

첫째, `data`가 배열에서 객체로 바뀌었고 키는 `withImage`·`withoutImage`다. 기존 `getHotArticles()`는 `apiFetch<HotCardResponse[]>`로 받아 `cards.map(...)`을 돌리므로, 이대로 두면 배포하는 순간 홈이 런타임 에러로 죽는다.

둘째, 카드 필드는 `summaryShort` 하나만 늘었고 나머지는 그대로다. 그래서 `toHotArticle` 변환 함수는 손대지 않고 재사용할 수 있었다.

셋째 — 이게 제일 중요했다 — **`size` 파라미터가 전체가 아니라 그룹마다 걸린다.** `size=5`(기본)면 최대 5건이 아니라 `withImage` 5건 + `withoutImage` 5건, 합쳐서 10건이다. 사이드바 "실시간 인기"가 이 데이터를 그대로 쓰고 있었으니 아무 생각 없이 두 배열을 이어 붙였으면 랭킹이 5줄에서 10줄로 늘어났을 것이다.

### 제일 헷갈린 함정: `withImage`와 `imageUrl`은 다른 컬럼이다

BE 소스를 읽다가 걸린 대목이다. 그룹을 가르는 기준은 `raw_articles.media_url`, 즉 **원문 X 게시물에 사진이 붙어 있었는지**다. 그런데 카드가 화면에 그리는 `imageUrl`은 `article_summaries.image_url`, 즉 **기사 대표 이미지**다. 서로 다른 테이블의 다른 컬럼이다.

그래서 `withImage`에 담겨 온 기사라도 `imageUrl`이 null일 수 있다. "사진 있는 그룹이니까 썸네일은 반드시 있겠지"라고 믿고 `HotCard`의 트윗 임베드 폴백을 지웠다면, 그런 기사에서 카드가 배경색만 남은 빈 상자가 된다. 폴백은 그대로 남겼고, 왜 남겼는지를 `HotCard`·`HotHeroCard` 주석에 적어 뒀다. 다음에 누가 "이제 분리됐는데 이 폴백 왜 있지"하고 지우는 걸 막기 위해서다.

## 3. 데이터 레이어

`packages/core/src/articles.ts`의 `getHotArticles()` 반환 타입을 `HotArticle[]`에서 두 목록을 담은 `HotArticles`로 바꿨다. 도메인 타입은 `@plick/domain/types`에 새로 뒀다.

```ts
export interface HotArticles {
  withImage: HotArticle[];
  withoutImage: HotArticle[];
}
```

`HotArticle`에는 `summaryShort: string | null`을 더했다. 사진이 덮는 카드에는 요약을 깔 자리가 없어서, 실제로 쓰는 건 사진 없는 텍스트 카드뿐이다. BE 응답 타입 쪽은 `summaryShort?: string | null`로 옵셔널을 줬는데, FE가 BE보다 먼저 배포되면 키 자체가 없기 때문이다. 변환에서 `r.summaryShort?.trim() || null`로 눕혀서 빈 문자열이 와도 카드에 빈 줄이 생기지 않게 했다.

### "실시간 인기"를 어떻게 다시 세웠나

사이드바 랭킹은 홈과 기사 세부 두 군데가 같은 핫이슈 데이터를 prop으로 받아 쓴다. 나뉘기 전에는 BE가 준 배열이 곧 조회수 순위였는데, 이제는 그룹 '안에서만' 순위가 매겨진다. 그러니 `[...withImage, ...withoutImage]`로 그냥 이어 붙이면 조회수 3인 사진 있는 기사가 조회수 300인 사진 없는 기사보다 위에 온다. 랭킹이 아니라 그냥 두 덩어리가 된다.

그래서 합친 뒤 조회수로 다시 세우는 함수를 뒀다.

```ts
export function toTrendingArticles(hot: HotArticles, count = TRENDING_COUNT) {
  return [...hot.withImage, ...hot.withoutImage]
    .sort(
      (a, b) =>
        b.views - a.views ||
        Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    )
    .slice(0, count);
}
```

동률일 때 최신 발행을 위에 두는 건 BE가 그룹 안에서 쓰는 정렬 기준과 같다. 표시 건수(5)도 여기서 자르므로 `size`가 그룹마다 걸리는 것과 무관하게 사이드바는 늘 5줄이다.

## 4. 캐러셀 — 상수를 버리고 재기로 했다

여기가 이번 작업의 대부분이었다.

`HotCarousel`은 모바일 홈 전용으로 태어나 웹이 두 번째 소비자가 되면서 `@plick/ui`로 올라간 컴포넌트다(KAN-338). 무한 루프, 자체 rAF 스크롤 애니메이션, 스냅 되감기까지 들어 있어서 이 저장소에서 제일 예민한 코드 중 하나다. 그리고 그 모든 계산이 상수 하나에 기대고 있었다.

```ts
/** 카드 폭 (트랙 폭 대비 비율) — 트랙의 `w-[86%]`와 일치해야 한다 */
const CARD_W = 0.86;
```

카드가 언제나 트랙의 86%라는 전제다. 데스크톱에서 네 장을 깔려면 이 전제가 깨진다. 카드 폭이 뷰포트에 따라 86%도 되고 25%도 되어야 한다.

### 시도했다가 버린 것들

**(a) JS가 브레이크포인트를 알게 하기.** `matchMedia("(min-width: 1024px)")`를 컴포넌트 안에서 보면 제일 쉽다. 그런데 `@plick/ui`는 앱을 몰라야 하는 패키지다(ADR 0011 게이트 A). `lg`가 1024px이라는 건 앱의 레이아웃 지식이지 캐러셀의 지식이 아니다. 지금은 웹 홈 하나지만, 다른 화면이 다른 폭에서 다른 장수를 원하면 그때마다 컴포넌트를 고치게 된다. 버렸다.

**(b) 웹에서 캐러셀을 두 벌 렌더하고 CSS로 토글하기.** `lg:hidden` 한 벌, `hidden lg:block` 한 벌. 마크업은 단순해지지만 카드 이미지가 두 벌 다 로드된다. 핫이슈는 홈 최상단이라 LCP를 직접 때리는 자리다. 게다가 캐러셀은 무한 루프용으로 카드를 세 벌 복제하니까, 두 벌이면 DOM에 슬라이드가 서른 개다. 버렸다.

**(c) 슬라이드 폭·정렬·여백을 전부 클래스 prop으로 받기.** 결국 이 방향으로 갔는데, 처음엔 `slideClassName`·`leadEdgeClassName`·`tailEdgeClassName`처럼 prop이 계속 늘어났다. 공용 컴포넌트 API가 "Tailwind 클래스 문자열을 세 개 넘겨라"가 되면 아무도 제대로 못 쓴다.

### 정한 것: CSS가 기하를 정하고 JS는 잰다

JS가 상수로 알고 있던 걸 전부 DOM에서 실측하기로 했다. 그러면 CSS를 어떻게 바꾸든 JS가 따라오므로 둘이 어긋날 자리가 없어진다.

```ts
interface Metrics {
  step: number; // 스냅 한 칸의 폭 = 카드 폭 + 간격
  origin: number; // 0번 슬라이드가 제자리에 앉는 scrollLeft
  perView: number; // 한 화면에 들어가는 카드 수
}
```

- `step`은 첫 슬라이드의 `getBoundingClientRect().width`에 간격 10px을 더해 구한다. `offsetWidth`가 아니라 `getBoundingClientRect`인 건 소수점 폭이 필요해서다. 뒤에 나오는 되감기 계산이 소수점 단위로 맞물려 돈다.
- `perView`는 `트랙 폭 / step`을 반올림한다. 모바일(카드 86%)이면 `100 / 86.x ≈ 1.16 → 1`, 데스크톱(카드 25%)이면 `≈ 3.97 → 4`가 나온다. 브레이크포인트를 몰라도 답이 나온다.
- `origin`은 설명이 좀 필요하다.

### `origin`이 왜 필요했나

기존 코드는 "i번 슬라이드가 제자리인 scrollLeft = `i * step`"이라고 계산했다. 이게 맞았던 건 모바일이 **가운데 스냅**(`snap-center`)이고 좌우 스페이서가 `calc(7% - 10px)`라서였다. 계산해 보면 0번 슬라이드의 왼쪽은 트랙의 7% 지점이고, 카드 폭이 86%니까 카드 중심은 정확히 트랙 중앙(50%)에 온다. 즉 scrollLeft 0이 곧 0번 슬라이드의 제자리다.

네 장을 깔 때는 가운데 스냅이 말이 안 된다. 한 장을 트랙 중앙에 맞추면 양옆에 카드가 한 장 반씩 걸쳐서 줄이 어긋난다. 그래서 **왼쪽 스냅**(`snap-start`)에 스페이서 0이다. 그런데 트랙이 `flex gap-2.5`라서, 폭 0인 스페이서가 있어도 그 뒤의 gap 10px은 그대로 남는다. 0번 슬라이드가 10px 밀린 자리에 선다. `i * step`으로 계산하면 전부 10px씩 어긋난다.

여기서 잠깐 헤맸다. 스페이서 폭을 `calc(0px - 10px)`로 주면 될 것 같았지만 음수 폭은 0으로 눌린다. 음수 마진(`-ml-2.5`)으로 상쇄하는 방법도 생각했는데, 스크롤 컨테이너에서 왼쪽으로 삐져나간 영역은 스크롤 가능 범위에 안 들어가서 동작이 브라우저마다 다를 수 있다. gap을 없애고 슬라이드에 마진을 주는 리팩터도 해 봤는데 앞뒤 스페이서가 서로 다른 값이 되어 prop이 또 늘었다.

결국 제일 단순한 답은 어긋난 만큼을 그냥 재는 것이었다. 그리고 얼마나 어긋났는지는 **CSS에게 물어보면 된다.**

```ts
const inset = getComputedStyle(first).scrollSnapAlign.includes("center")
  ? (el.clientWidth - slideWidth) / 2
  : 0;
const left = first.getBoundingClientRect().left
  - el.getBoundingClientRect().left + el.scrollLeft;
metricsRef.current = { step, origin: left - inset, perView: ... };
```

`scroll-snap-align`의 계산값을 읽으니 JS가 브레이크포인트를 몰라도 정렬 방식을 안다. 가운데 정렬이면 `origin`이 0으로 나오고(기존 동작과 완전히 같다), 왼쪽 정렬이면 10으로 나온다. 실측으로 확인했다.

```
모바일 375px: origin 0,  step 333, align "center", perView 1
데스크톱 1440px: origin 10, step 287, align "start",  perView 4
```

슬라이드의 콘텐츠 좌표를 `offsetLeft`가 아니라 "화면 좌표 차이 + 현재 스크롤"로 구한 이유도 있다. `offsetLeft`는 기준이 되는 조상이 무엇이냐에 따라 값이 달라지는데, 이 계산은 트랙 자신을 기준으로 하므로 나중에 래퍼가 하나 더 끼어도 안 깨진다.

그리고 `i * step`을 쓰던 자리를 전부 `leftOf(i) = origin + i * step`으로 바꿨다. 되감기(`fold`)와 스냅 정리(`wrap`)도 `el.scrollLeft - origin`으로 좌표를 옮겨 계산한다.

### 점과 자동 넘김을 없애는 조건

"PC는 점 빼고 자동 넘김 없애고"를 prop으로 받을 수도 있었지만, 그러면 호출부가 브레이크포인트와 옵션을 따로따로 맞춰야 한다. `perView`에서 유도하는 편이 훨씬 정직했다.

- 점 인디케이터: `perView === 1`일 때만 그린다. 네 장이 한꺼번에 보이는데 점 다섯 개가 있으면 어느 점이 어느 카드인지 읽히지 않는다.
- 자동 넘김: `perView === 1`일 때만 타이머를 건다. 네 장을 읽는 중에 네 장이 통째로 바뀌면 방해다.
- 핸들 이동량: `perView`만큼. 모바일은 한 칸, 데스크톱은 네 칸이 통째로 넘어간다.

요구사항 세 개가 옵션 세 개가 아니라 실측값 하나에서 나온다. 창이 줄어 한 장짜리가 되면 점과 자동 넘김이 알아서 돌아오는 것도 덤이다.

호출부가 덮을 게 하나 남는데, 좌우 여백이다. 이건 CSS 변수로 뺐다.

```tsx
<HotCarousel
  className="lg:[--hot-edge:0px]"
  slideClassName="w-[86%] snap-center aspect-[181/131] lg:w-[calc((100%-30px)/4)] lg:snap-start"
>
```

`--hot-edge`가 스페이서 폭과 좌우 핸들 위치를 함께 정한다. 기본값 7%는 모바일 기하 그대로다. `calc((100%-30px)/4)`의 30px은 카드 네 장 사이의 간격 세 칸이다.

### `looping` 조건도 바꿨다

원래는 `count > 1`이면 복제를 켰다. 네 장이 보이는 화면에서는 카드가 세 장뿐이면 넘길 게 없으므로 `count > perView`로 바꿨다. `perView`는 마운트 뒤에야 알 수 있는 값이라 state로 뒀는데, 실측을 `useLayoutEffect`에서 하므로 React가 페인트 전에 다시 렌더한다. 깜빡임은 없다.

## 5. 세 칸은 앱별 카드로 뒀다

`HotTextCard`를 웹과 모바일에 각각 만들었다. 마크업이 거의 같아서 `@plick/ui`로 올릴까 한참 고민했는데, ADR 0011 게이트에 대 보니 올릴 때가 아니었다.

게이트 B(스케일·인터랙션이 동일한가)에서 이미 갈린다. 웹은 hover로 테두리가 밝아지고 `focus-visible` 링이 필요하다. 모바일은 hover가 없고 `active:opacity-70`으로 누른 느낌을 준다. 구조도 다르다 — 웹은 3열 그리드에서 카드 높이를 맞춰야 해서 `<article>` + `h-full` + `mt-auto`로 메타 줄을 바닥에 붙이고 링크를 형제로 깔았고, 모바일은 세로로 쌓이니 그럴 필요가 없어 `<Link>` 자체가 카드다. 요약 줄도 웹은 두 줄, 모바일은 좁아서 한 줄이다.

게이트 C(지금 안정적인가)도 아니다. 오늘 처음 만든 모양이라 어디가 굳었는지 아직 모른다. variant prop을 달아 하나로 만들면 두 파일보다 읽기 어려워지고, 한쪽 디자인을 고칠 때마다 반대편이 흔들린다.

무엇보다 이 저장소에 이미 같은 판단의 선례가 있다. 핫이슈 캐러셀 카드도 웹 `HotCard`와 모바일 `HotHeroCard`로 따로 산다. 거기 맞췄다.

카드 자체는 새 토큰을 하나도 만들지 않았다. 면은 사이드바 랭킹 카드와 같은 `bg-elevate-2` + `border-border` + `rounded-card`, 팀 이름은 `text-accent`, 제목은 `text-body-lg`, 요약은 `text-body text-text-3`, 메타는 `text-caption text-text-4`다. 사진 위에 얹는 카드가 아니라 본문 톤이라 `media-on` 같은 테마 무관 토큰을 쓰지 않고 일반 텍스트 토큰을 그대로 탄다 — 라이트 토글을 되살려도 화면을 다시 만들 필요가 없다.

세 칸으로 자르는 건 `HOT_NO_IMAGE_COUNT = 3`을 `@plick/core`에 두고 두 앱이 같이 쓴다. BE는 그룹마다 5건까지 주므로 자르는 건 화면 몫이다.

## 6. `HotCard`에서 데스크톱 스케일을 걷어냈다

웹 `HotCard`에는 `lg:text-hero`(26px)와 `lg:px-6 lg:pt-8 lg:pb-5.5`가 붙어 있었다. 1200px 컨테이너에 카드 한 장을 띄우던 시절의 스케일이다. 네 장을 깔면 카드가 300px 아래로 줄어드는데 제목이 26px이면 카드를 넘친다. 전부 지우고 모바일 히어로 카드와 같은 밀도(`p-4`·`text-title`)로 통일했다. 카드 비율도 `lg:aspect-video`를 빼고 `aspect-[181/131]`로 되돌렸다 — 비율을 낮춰야 했던 건 카드가 700px씩 길어지던 때 얘기다.

트랙에 걸려 있던 `lg:mx-auto lg:max-w-5xl`도 뺐다. 한 장짜리 카드가 과하게 커지는 걸 막던 장치인데, 이제는 컨테이너 폭을 다 써야 카드 네 장이 292px씩 나온다.

## 7. 검증 — 로컬에 사진이 한 장도 없었다

화면을 확인하려는데 캐러셀이 아예 안 떴다. 당연했다. `withImage`가 빈 배열이었다.

```
select count(*) filter (where image_url is not null), count(*) from article_summaries
→ 0 | 3998
```

3998건 중 이미지가 있는 게 0건이다. `media_url`은 방금 만든 컬럼이라 전부 null이고, 수집기가 채우기 시작한 뒤 48시간이 지나야 값이 생긴다. 즉 **지금 로컬에서는 `withImage`가 항상 비어 있다.**

공유 DB의 기존 행에 `media_url`을 박아 넣으면 그룹이 갈리긴 하겠지만, 남의 데이터를 건드리는 일이라 하지 않았다. 대신 `getHotArticles()` 안에 커밋하지 않을 임시 코드를 넣어 카드 다섯 장을 `withImage`로 복사하고 `picsum.photos` 이미지를 붙였다. `TEMP-KAN480-VERIFY` 주석을 달아 두고 확인이 끝나자마자 지웠다.

이 임시 코드 때문에 콘솔에 React 키 중복 경고가 떴는데, 같은 기사가 두 그룹에 다 들어가서 `toTrendingArticles`가 중복을 만든 탓이었다. 실계약에서는 그룹이 `EXISTS`/`NOT EXISTS`로 배타적이라 생길 수 없는 일이다. 임시 코드를 지운 뒤 DOM을 다시 확인해 중복이 0인 것과 랭킹이 조회수 순(11, 5, 3, 3, 2)인 것을 봤다.

### 되감기가 안 깨졌는지

캐러셀 계산을 전부 바꿨으니 무한 루프가 제일 걱정이었다. 손으로 밀어 가운데 벌 밖으로 나간 상황을 만들고, 터치 이벤트를 직접 쏴서 `fold`와 `wrap`이 제자리를 찾는지 봤다.

모바일(origin 0):

```
밖으로 밀어 놓음     → index 11 "맨체스터 시티, 아유브 부"
touchstart(fold)   → index 6  "맨체스터 시티, 아유브 부"
touchend 후 wrap   → index 6, 가운데 벌 안
```

데스크톱(origin 10)에서도 같은 경로로 11 → 6이 나왔다. 복제본과 원본이 같은 카드를 가리키니 화면은 한 픽셀도 안 움직이고 양옆 여유만 돌아온다. 의도대로다.

### -1432에 한 번 속았다

핸들이 네 장씩 넘기는지 보려고 클릭 전후의 `scrollLeft` 차이를 쟀는데 `-1432`가 나왔다. 기대값은 `+1146`(= 287 × 4)이었다. 한참 코드를 다시 읽었다.

원인은 코드가 아니라 내 측정이었다. rAF 애니메이션이 350ms 도는 동안 중간 위치를 읽고 있었다. 그리고 `-1432`는 우연한 값이 아니라 정확히 한 벌 폭(`5 × 286.5`)이다. 되감기가 한 벌을 접은 직후, 애니메이션이 아직 출발하기 전의 좌표였던 것이다.

기다린 뒤 다시 재니 이렇게 나왔다.

```
start  1443
next0  2589  (+1146 = +4칸)
next1  2302  (-286)
next2  2016  (-286)
next3  1729  (-286)
prev0  2016  (+287)
prev1  2302  (+287)
```

`-286`도 정상이다. `-286.5 = -1432.5(한 벌 접기) + 1146(네 칸 전진)`이다. 한 벌 접기는 화면상 아무 일도 아니니까, 눈에 보이는 건 네 칸 전진뿐이다. 실제로 인덱스를 카드로 환산해 보면 `9 → 8`인데 5장짜리 루프에서 `(4 + 4) mod 5 = 3`이라 카드 4에서 카드 3으로 가는 게 맞다. 처음엔 뒤로 간 줄 알고 또 놀랐다.

교훈은 단순하다. 애니메이션이 있는 컴포넌트에서 좌표 하나만 보고 판단하면 안 된다. 로그를 시계열로 찍고, 나온 숫자가 우연인지 어떤 값의 정확한 배수인지부터 확인하는 게 빠르다.

### 나머지

- 1440px: 캐러셀 4장 한 줄, 점 0개, 그 밑 3열 그리드
- 900px(lg 미만): 캐러셀 1장 가운데 스냅, 점 5개, 그 밑 1열
- 375px 모바일: 캐러셀 1장 + 점 + 자동 넘김, 그 밑 3행 카드
- 임시 코드를 지운 실데이터 상태: 두 앱 다 캐러셀이 통째로 빠지고 텍스트 카드 3장만 남는다. 빈 배열이 정상 상태라 에러 문구를 띄우지 않는다
- `pnpm check-types`·`pnpm lint`·`pnpm build` 통과

## 8. 남은 것

- **`withImage`는 dev 배포 뒤에야 실물로 볼 수 있다.** admin-server 수집기가 `media_url`을 채우고 48시간이 지나야 값이 생긴다. 그때 데스크톱 4장 캐러셀을 실사진으로 다시 봐야 한다.
- **로컬 `.env.local`의 `API_BASE_URL`을 8082로 바꿔 뒀다.** 8080에 떠 있는 옛 빌드는 아직 배열을 주기 때문에 이 브랜치로는 홈이 죽는다. 각자 BE를 최신으로 재기동하고 8080으로 되돌리면 된다.
- **핫이슈가 다섯 장인데 네 장씩 넘긴다.** 한 장이 겹쳐 도는 모양인데 항목 수 때문에 생기는 일이라 코드 문제가 아니다. `size`를 8이나 12로 올려 페이지가 딱 떨어지게 하는 편이 보기 좋을 수 있는데, 지금은 `withImage`가 비어 있어 판단할 근거가 없다. 실데이터를 보고 정한다.
- `HotTextCard` 두 벌은 모양이 굳으면 `@plick/ui` 승격을 다시 본다(ADR 0011 게이트 C).
