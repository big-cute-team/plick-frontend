# 0057. teamId=5만 500 나던 사건과 CONFIRMED 단계 정리

`http://localhost:3000/be/api/v1/articles?size=10&teamId=5`만 500이 나고 나머지 팀은 전부
멀쩡하다는 제보로 시작한 세션이다. 원인은 프론트가 아니라 백엔드 JPA enum에 값 하나가 빠진 것이었고,
그걸 추적하는 과정이 이 글의 본편이다. 뒤이어 백엔드가 고친 다음, 프론트가 오래 들고 있던
`CONFIRM`이라는 잘못된 리터럴을 `CONFIRMED`로 맞췄다.

## 제보 내용

팀 아이디 5(첼시)로 필터한 기사 피드만 500이 난다. 웹이든 모바일이든 같다. 백엔드 담당자에게 물었더니
팀 아이디는 그대로고, 백엔드에서 같은 URL을(`/api`부터) 때렸을 땐 정상이었다고 했다.

이 진술 때문에 처음엔 프론트 쪽을 의심하게 된다. 백엔드에서 되는데 프론트에서 안 되면 그 사이에 있는
것이 범인이라는 게 자연스러운 추론이고, 그 사이에 있는 건 Next의 rewrite 프록시다.

## 1. 프록시부터 지웠다

`apps/web/next.config.js`와 `apps/mobile/next.config.js`가 똑같이 이렇게 생겼다.

```js
async rewrites() {
  const base = process.env.API_BASE_URL ?? "http://localhost:8080";
  return [{ source: "/be/:path*", destination: `${base}/:path*` }];
}
```

브라우저가 `localhost:8080`을 직접 부르면 origin이 달라 CORS에 막히니까, BE에 CORS를 여는 대신 Next가
`/be/*`를 같은 origin으로 받아서 8080으로 넘겨주는 구조다(KAN-271, web은 KAN-318). 여기서 쿼리스트링이
망가지거나 헤더가 덧붙는 시나리오를 상상할 수는 있다.

그래서 프록시를 건너뛰고 8080을 직접 때려 봤다.

```
direct 8080 teamId=5: 500
direct 8080 teamId=4: 200
proxy  3000 teamId=5: 500
proxy  3000 teamId=4: 200
```

프록시를 거치든 안 거치든 똑같이 500이다. 이 시점에 프론트와 프록시는 용의선상에서 빠진다. 이런
버그를 만나면 제일 먼저 할 일이 이거다. 중간 계층을 하나 지워서 증상이 그대로인지 보는 것. 그대로면
중간 계층은 범인이 아니다.

그리고 팀 아이디를 1부터 25까지 전부 훑었다. 정확히 5만 500이고 나머지 24개는 전부 200이었다.
백엔드 담당자 말대로 팀 아이디 자체는 멀쩡하다는 뜻이다. 그러면 팀 5에 걸린 데이터 중에 뭔가가
있다는 얘기가 된다.

## 2. size를 줄여 보다가 이상한 걸 봤다

여기서 우연히 결정적인 단서가 나왔다. `size`를 바꿔 가며 때려 봤더니 이랬다.

```
size=1&teamId=5   200
size=2&teamId=5   500
size=3&teamId=5   500
...
size=100&teamId=5 400   (MAX_SIZE=30 초과라 검증에서 걸림)
```

한 건만 달라고 하면 되고, 두 건부터 안 된다. 전체 목록이 아니라 특정 레코드가 문제라는 신호다.
데이터 문제일 때 자주 보이는 패턴이다.

## 3. 커서 페이징으로 한 건씩 훑기

이 API는 오프셋이 아니라 커서 페이징이다. 응답의 `nextCursor`를 그대로 되돌려주면 다음 페이지가 온다.
디코드해 보니 `2026-07-27T07:23:13.242Z|7844` 같은 문자열을 base64url로 감싼 것이었다.
`발행시각|id`를 이어붙인 keyset 커서다.

여기서 잠깐 짚고 갈 게 있다. 커서 페이징(keyset pagination)은 "몇 번째부터 몇 개"가 아니라
"이 값보다 뒤에 있는 것 몇 개"로 페이지를 자르는 방식이다. 오프셋 페이징은 `OFFSET 1000` 같은 걸
쓰는데, DB가 앞의 1000건을 세면서 건너뛰어야 해서 뒤로 갈수록 느려지고, 그 사이에 새 글이 들어오면
같은 글이 두 페이지에 겹쳐 나온다. 커서 방식은 정렬 키 자체를 기준으로 자르니까 인덱스를 그대로 타고,
새 글이 끼어들어도 이미 본 구간이 밀리지 않는다. 대신 "3페이지로 점프" 같은 건 못 한다.

이 커서를 직접 만들어서 팀 5의 목록을 한 건씩 밟아 봤다. DB에서 팀 5의 발행 기사 12건을
정렬 순서대로 뽑고, 각 행의 바로 앞 행을 커서로 삼아 `size=1`로 요청하면 그 행 하나만 조립된다.

```
7844  200
7787  500
7783  500
7779  500
6629  200
6614  200
...
```

7787, 7783, 7779 세 건이 걸린다. 다 2026-07-27 07:20~07:21에 발행된 기사다.

## 4. 처음엔 엉뚱한 걸 의심했다

세 건의 공통점을 찾느라 몇 번 헛짚었다.

먼저 기자를 의심했다. 세 건 모두 `raw_articles`에 `reporter_id=2`(David Ornstein)가 물려 있었고,
정상인 7844는 `reporter_id=4`였다. `ArticleFeedService`가 카드에 기자를 실을 때
`raw.getReporter().getName()`을 부르니까 기자 행이 이상하면 터질 수 있다. 그런데 `reporters` 테이블을
열어 보니 2번도 4번도 11번도 멀쩡했다. 이름 길이가 컬럼 제약을 넘지도 않았고 null도 없었다.

다음엔 `reporter_tier`가 null인 경우 언박싱 NPE가 나는 고전적인 패턴을 의심했다. `ReporterResponse`를
열어 보니 `Integer tier`라 boxed였고, 오히려 tier가 null인 7844가 정상이었다. 반대였다.

`article_summaries` 테이블에 `embedding vector(768)` 컬럼이 있는 것도 잠깐 의심했다. Hibernate가
모르는 타입을 만나면 터질 수 있으니까. 그런데 `ArticleSummary` 엔티티는 그 컬럼을 아예 매핑하지 않아서
조회 대상이 아니었다.

이렇게 셋을 지우고 나서야 엔티티 필드를 하나씩 대조하기 시작했고, 거기서 나왔다.

## 5. 진짜 원인

`ArticleSummary`는 루머 단계를 문자열 enum으로 매핑한다.

```java
@Enumerated(EnumType.STRING)
@Column(length = 20)
private RumorStage rumorStage;
```

그런데 `RumorStage` enum에 값이 셋뿐이었다.

```java
public enum RumorStage { RUMOR, IN_PROGRESS, OFFICIAL }
```

DB의 체크 제약은 넷을 인정한다. BE 저장소 자신의 테스트 스키마(`src/test/resources/schema.sql`)도,
목 데이터(`MockData.java`)도 넷을 쓴다.

```sql
CHECK (rumor_stage IS NULL OR rumor_stage IN ('RUMOR','IN_PROGRESS','CONFIRMED','OFFICIAL'))
```

`CONFIRMED`가 Java enum에만 없다. `@Enumerated(EnumType.STRING)`은 DB 문자열을 enum 상수 이름과
맞춰 보는데, 맞는 상수가 없으면 예외를 던진다. 이건 값을 못 읽는 정도가 아니라 엔티티 하이드레이션
자체가 실패하는 거라 조회 전체가 죽고, 전역 예외 핸들러가 `COMMON_INTERNAL_ERROR` 500으로 감싼다.

DB를 보니 발행 기사 1649건 중 `rumor_stage='CONFIRMED'`인 행이 딱 2건이었다. `article_summary_id`
7779와 7783, 둘 다 팀 태그가 첼시 하나뿐이었다. 그래서 25개 팀 중 5만 터진 것이다.

```
 stage       | count
-------------+-------
 (null)      |   849
 OFFICIAL    |   352
 RUMOR       |   230
 IN_PROGRESS |   216
 CONFIRMED   |     2
```

## 6. 7787은 왜 같이 터졌나

여기가 이 사건에서 제일 헷갈렸던 대목이다. `CONFIRMED`인 건 7779와 7783인데, `IN_PROGRESS`인 7787을
혼자 요청해도 500이 났다. 처음엔 이것 때문에 enum 가설을 한 번 접을 뻔했다.

답은 리포지토리에 있었다.

```java
List<ArticleSummary> fetched = articleFeedRepository.findPage(decoded, teamId, size + 1);
boolean hasNext = fetched.size() > size;
List<ArticleSummary> summaries = hasNext ? fetched.subList(0, size) : fetched;
```

`size`가 아니라 `size + 1`건을 읽는다. 다음 페이지가 있는지 알아내려고 한 건 더 당겨 보는 흔한 수법이다.
커서 페이징은 총 건수를 세지 않으니(그게 장점이다) "다음이 있나"를 알 방법이 이것뿐이다. 한 건 더
읽어서 넘치면 다음이 있는 것이고, 그 여분 한 건은 `subList`로 잘라 응답에 싣지 않는다.

문제는 잘라내는 게 응답 조립 단계라는 점이다. 그전에 이미 JPA가 그 여분 한 건까지 `ArticleSummary`
객체로 만들어 놨다. enum 변환은 객체를 만드는 시점에 일어난다. 그러니까 화면에 절대 안 나올 기사
한 건이 조회 창에 걸치기만 해도 응답 전체가 죽는다.

이걸로 관측이 전부 맞아떨어진다.

- `size=1` 커서 없음: 7844 + 7787을 읽고 7844만 조립. 둘 다 멀쩡 → 200
- `size=2` 커서 없음: 7844 + 7787 + 7783을 읽음. 7783이 `CONFIRMED` → 500
- 커서를 7844에 두고 `size=1`: 7787 + 7783을 읽음. 여기서도 7783 → 500

7787 자체는 죄가 없었다. 옆자리에 앉은 게 죄였다.

## 7. 팀 5만의 문제가 아니었다

팀 필터가 없는 홈 피드도 같은 지뢰를 밟는다. 7783보다 최신인 발행 기사가 정확히 28건이라
`size=27`까지는 200이고 `size=28`부터 500이다(`size+1`이 29가 되면서 7783이 창에 들어온다).
기본 `size`가 10이라 첫 페이지에서 안 걸렸을 뿐, 사용자가 피드를 몇 페이지 넘기거나 `CONFIRMED`
기사가 더 쌓이면 전체 피드도 터진다. 팀 5 필터는 그 지뢰가 앞쪽으로 당겨진 것뿐이었다.

## 8. 백엔드에선 왜 정상이었을까

제보에 있던 "백엔드에서 했을 땐 정상"이 가장 오래 발목을 잡은 정보였다. 확정은 못 했지만 가능성이
셋 있었다.

첫째, 타이밍. 문제의 두 행은 2026-07-27에 만들어졌다. 그 전에 확인했다면 `CONFIRMED` 행 자체가
없었으니 당연히 통과한다.

둘째, 프로필. 실제 컨트롤러·서비스·리포지토리가 전부 `@Profile("!mock")`이다. mock 프로필로 띄우면
`MockArticleController`가 하드코딩 문자열을 내려주고 enum 변환을 아예 안 탄다. 이러면 어떤 팀
아이디를 넣어도 200이다.

셋째, 빌드 차이. 로컬 브랜치에 이미 `CONFIRMED`를 추가해 둔 상태로 돌렸을 수도 있다.

교훈은 "다른 데선 되는데요"를 받았을 때 그 다른 데가 정확히 무엇인지(언제, 어느 프로필, 어느 커밋)를
같이 물어야 한다는 것이다. 이번엔 그걸 안 물어서 프록시를 먼저 뒤졌다.

## 9. 프론트 쪽 뒤처리

백엔드가 enum에 `CONFIRMED`를 추가하면서 API는 살아났다. 그런데 값이 실제로 내려오기 시작하니
프론트에 묵혀 있던 어긋남이 드러났다.

`packages/domain/src/constants.ts`의 `STAGE_BY_BE_VALUE`는 BE가 주는 문자열을 도메인 타입으로
바꿔 주는 테이블인데, 이렇게 되어 있었다.

```ts
export const STAGE_BY_BE_VALUE: Record<string, RumorStage> = {
  RUMOR: "RUMOUR",
  IN_PROGRESS: "IN_PROGRESS",
  /* CONFIRM은 BE 예정 단계 — 아직 enum·DB에 없고 값이 오기 시작하면 그대로 통과한다 (KAN-299) */
  CONFIRM: "CONFIRM",
  OFFICIAL: "OFFICIAL",
};
```

키가 `CONFIRM`인데 BE와 DB의 실제 값은 `CONFIRMED`다. 이 테이블은 모르는 값을 null로 흘리도록
설계돼 있어서(ADR 0032, 잘못된 배지보다 없는 배지가 낫다는 판단) 500이 나거나 앱이 죽지는 않는다.
대신 `CONFIRMED` 기사에서 단계 배지가 조용히 사라진다. 티가 안 나는 종류의 버그라 더 나쁘다.

거슬러 올라가 보니 ADR 0039(KAN-299)에서 "CONFIRM 단계 선반영"으로 넣은 것이었다. 그땐 BE에 그 단계가
없었고, 앞으로 들어올 값의 이름을 프론트가 추측해서 미리 박아 둔 것이다. 그러다 ADR 0036에서 BE 실제
값이 `CONFIRMED`라는 걸 발견했는데, 그때는 "모르는 값은 null" 원칙으로 폴백시키고 TODO로만 남겨 뒀다.
이번에 그 TODO를 닫은 셈이다.

### 어디까지 고칠지

두 갈래가 있었다.

하나는 매핑 테이블의 키만 `CONFIRMED`로 바꾸고 도메인 리터럴은 `CONFIRM`으로 두는 것.
`RUMOR → RUMOUR`처럼 BE 값과 도메인 값이 다른 선례가 이미 있으니 형식상 못 할 건 없다.

다른 하나는 도메인 리터럴까지 전부 `CONFIRMED`로 맞추는 것.

후자를 골랐다. `RUMOR → RUMOUR`는 의도된 차이다. BE와 DB는 미국식 철자를 쓰고 디자인 스펙의 배지
글자는 영국식 `RUMOUR`라서, 표시 스펙을 따르려고 일부러 갈라놓은 것이다. 반면 `CONFIRM`은 그런 근거가
없다. 디자인에서 나온 라벨이 아니라 BE 값 이름을 추측한 결과물이고, ADR 0039에도 색 스펙조차 아직
안 나왔다고 적혀 있다. 근거 없는 철자 차이를 남겨 두면 나중에 읽는 사람이 `RUMOUR`처럼 의도된
차이라고 오해한다. 의도된 갈라짐은 하나로 충분하다.

고친 파일은 넷이다.

- `packages/domain/src/types.ts` — `RumorStage` 유니온의 `"CONFIRM"` → `"CONFIRMED"`
- `packages/domain/src/constants.ts` — `STAGE_BY_BE_VALUE` 키와 값, `STAGE_META` 라벨
- `packages/ui/src/PostChips.tsx` — `PostStage` 유니온, `STAGE_LABEL`, `STAGE_CHIP`
- `packages/ui/src/PostBadges.tsx` — `STAGE_TEXT`

`@plick/ui`가 `@plick/domain`에 의존하지 않으려고 `PostStage`를 같은 리터럴로 따로 선언해 두는 구조라
같은 유니온이 두 군데 있다. 둘 다 고쳐야 한다. `Record<PostStage, string>`와
`Record<RumorStage, {label:string}>` 덕분에 하나라도 빠뜨리면 `check-types`가 잡아 준다.
실제로 이번에도 그 안전망으로 누락 없이 끝냈다.

"선반영"으로 넣은 상수는 이렇게 값을 추측한 만큼의 부채가 된다는 걸 배웠다. 다음에 비슷한 걸 넣을 땐
BE 실제 값을 확인할 수 있을 때까지 미루거나, 최소한 확인 전이라는 걸 타입 이름이나 주석이 아니라
티켓으로 걸어 두는 편이 낫겠다.

## 10. 색이 없다는 피드백, 그리고 전용 토큰

배지가 뜨는 걸 확인하고 넘어가려는데 피드백이 왔다. CONFIRMED 태그가 없어 보인다, 확정 느낌이 나는
다른 색으로 하나 만들어 달라는 것이었다.

맞는 지적이었다. ADR 0039 때 색 스펙이 없어서 `RUMOUR`와 같은 accent(초록)를 빌려 쓰기로 하고 주석에
적어 뒀는데, 그때는 `CONFIRMED` 값이 실제로 내려온 적이 없어서 눈으로 볼 일이 없었다. 이제 값이
내려오기 시작하니 초록 배지가 두 종류가 되어 단계 구분이 안 된다. 배지가 안 보인다기보다는 다른
단계와 구별이 안 돼 없는 것처럼 읽힌 것이다.

색은 이렇게 정했다. 이미 쓰는 단계 색이 초록(accent)·노랑(warn)·파랑(info) 셋이라 셋 다 피해야 했고,
루머 단계 순서가 RUMOUR → IN_PROGRESS → CONFIRMED → OFFICIAL이라 노랑과 파랑 사이에 놓인다.
보라(violet)를 골랐다. 나머지 셋과 색상환에서 충분히 떨어져 있고, 확정이나 검증된 상태를 보라로 쓰는
관용이 있어서 의미도 맞는다.

명도는 기존 토큰과 같은 단계로 맞췄다. 다크의 `info: #60a5fa`·`warn: #fbbf24`가 Tailwind 팔레트의
400 계열이라 `confirmed: #a78bfa`(violet-400)를, 라이트의 `info: #2563eb`·`warn: #d97706`가 600
계열이라 `confirmed: #7c3aed`(violet-600)를 넣었다. 같은 자리에 놓이는 색끼리 명도가 어긋나면 한
배지만 튀어 보인다.

토큰은 기존 상태 보조색과 똑같은 3단 구조로 넣었다.

```css
--plk-confirmed: #a78bfa;
--plk-confirmed-tint: color-mix(in srgb, var(--plk-confirmed) 16%, transparent);
--plk-confirmed-border: color-mix(
  in srgb,
  var(--plk-confirmed) 40%,
  transparent
);
```

여기서 `color-mix`를 `@theme inline`으로 노출하는 방식이 중요하다. 파생 토큰이 `var(--plk-confirmed)`를
값으로 굳히지 않고 참조로 들고 있어서, `[data-theme="light"]`에서 원본만 갈아끼우면 tint와 border가
따라온다. 라이트용 tint를 따로 적을 필요가 없다. 기존 info·warn이 쓰던 수법을 그대로 따랐다.

그다음 `@theme inline` 블록에 `--color-confirmed`, `--color-confirmed-tint`, `--color-confirmed-border`를
매핑해 Tailwind 유틸(`text-confirmed`, `bg-confirmed-tint`, `border-confirmed-border`)로 꺼내 썼다.
`border-confirmed-border`가 말이 겹쳐 어색하지만 `border-info-border`·`border-warn-border`와 같은
꼴이라 그대로 뒀다. 여기서 관용을 깨면 셋 중 하나만 다른 이름이 된다.

이름을 `confirm`이 아니라 `confirmed`로 붙인 건 의도적이다. 이 세션이 통째로 `CONFIRM`과 `CONFIRMED`가
어긋나서 생긴 일인데 토큰에 다시 짧은 쪽을 심으면 같은 혼동을 새로 만든다.

앱은 다크 고정이라 라이트 값은 지금 화면에 안 나온다. 그래도 넣어 둔 건 CLAUDE.md의 방침 그대로,
나중에 토글을 되살릴 때 화면을 다시 만들지 않기 위해서다.

## 검증

BE 수정 후:

```
teamId=5 size=10   200
teamId 없음 size=30 200
```

7783과 7779가 `rumorStage: "CONFIRMED"`로 실제로 내려오는 것도 확인했다.

프론트는 `pnpm check-types`, `pnpm lint`, `pnpm format:check` 전부 통과했고, 모바일 dev(:3001)에서
직접 봤다. `/articles/7783`에서 첼시 엠블럼 옆에 `CONFIRMED` 글자가 보라로 그려지고, 홈에서 첼시
필터를 누르면 원래 500 나던 목록이 정상으로 뜬다. 콘솔 에러도 없다.

토큰은 눈으로만 보지 않고 실제로 풀리는 값을 확인했다. 다크에서 배지 글자색이
`rgb(167, 139, 250)`(`#a78bfa`)로 계산되고, `data-theme`을 임시로 `light`로 바꿨을 때
`--plk-confirmed`가 `#7c3aed`로 뒤집히는 것까지 봤다. 라이트 오버라이드가 파생 토큰까지
따라오는지가 이 구조의 핵심이라 그 부분을 직접 확인했다.

## 남은 것

- `PostChips`의 알약 칩 컴포넌트는 지금 아무 데서도 안 쓴다. `PostBadges`가 같은 파일의
  `STAGE_LABEL`과 `PostStage` 타입만 가져다 쓰는 상태다(KAN-299에서 릴이 배지로 갈아탄 뒤부터).
  단계 색을 만질 때마다 두 군데를 같이 고쳐야 하니 정리 대상이지만 이번 범위는 아니라 남겨 둔다.
- BE의 `size + 1` 조회는 안 보여 줄 한 건까지 하이드레이션한다. 이번엔 그게 증상을 옆 기사로 번지게
  해서 원인 추적을 헷갈리게 했다. BE 몫이라 여기선 기록만 해 둔다.
