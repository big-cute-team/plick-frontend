# 0033. 루머 단계 태그와 기자 티어 등급 배지 (KAN-281)

## 티켓이 요구한 것

KAN-281은 두 가지 표시를 요구했다. 루머 단계 `RUMOR`, `IN_PROGRESS`, `OFFICIAL` 세 값을
각각 초록, 노랑, 파랑 태그로 보여주고, 기자 티어 0~3을 S, A, B, C 등급 문자로 바꿔
파랑, 초록, 회색, 회색 배지로 보여주는 것. 적용 대상은 릴스 화면이다.

## 현재 상태 파악

코드를 열어보니 두 표시 모두 이미 자리가 있긴 했다. 릴 한 장(`ReelItem`)의 하단 정보
블록이 `PostChips`로 팀 칩과 단계 칩을 그리고, 기자 이름 옆에 `ReporterTierBadge`를
붙인다. 세부 시트(`ReelDetailSheet`)도 `ReporterLine`을 통해 같은 티어 배지를 쓴다.
둘 다 웹과 공용이라 `@plick/ui`에 있다.

문제는 표시 스펙이 옛날 것이라는 점이다. `PostChips`는 `rumour: boolean`을 받아서
RUMOUR일 때만 accent(초록) 칩을 그렸다. 그러니까 IN_PROGRESS와 OFFICIAL은 단계 칩이
아예 안 나왔다. 실제로 로컬 BE 데이터를 뽑아보니 첫 30건이 전부 OFFICIAL이었는데,
지금 릴스를 열면 단계 표시가 하나도 없는 상태였던 거다. `ReporterTierBadge`는
`T{tier}` 숫자를 그대로 보여줬고, 티켓이 말하는 0티어(S)는 도메인 타입
(`Reporter.tier: 1 | 2 | 3`)에 아예 없었다.

색도 문제였다. 토큰(`packages/tokens/theme.css`)에 초록(accent)과 빨강(danger)은
있는데 노랑과 파랑이 없었다. 하드코딩 금지 컨벤션이라 토큰부터 만들어야 했다.

## 토큰: info와 warn을 추가했다

노랑·파랑을 `--plk-warn`, `--plk-info`라는 이름으로 추가했다. `--plk-official` 같은
용도 박제 이름도 생각했지만, 티어 배지의 S등급도 같은 파랑을 쓰는 걸 보고 범용
상태색 이름으로 갔다. danger가 이미 있으니 accent/danger/info/warn 네 벌이 자연스럽게
한 계열이 된다.

값은 danger의 전례를 따랐다. danger가 다크 `#f87171`(Tailwind red-400급), 라이트
`#e5484d`(더 진한 빨강)로 짝을 이루고 있어서, info는 다크 `#60a5fa`(blue-400) /
라이트 `#2563eb`(blue-600), warn은 다크 `#fbbf24`(amber-400) / 라이트
`#d97706`(amber-600)으로 맞췄다. 다크에서는 밝은 톤, 흰 바탕에서는 진한 톤이어야
글자로 썼을 때 대비가 나온다.

칩 배경·테두리용 파생 토큰(`-tint` 16%, `-border` 40%)도 accent 전례 그대로
`color-mix`로 만들었다. 여기서 짚어둘 게 하나 있는데, 파생 토큰은 `:root`에 한 번만
정의해도 라이트 모드를 따라간다. CSS 커스텀 프로퍼티는 선언 시점에 값이 굳는 게
아니라 사용하는 요소에서 계산될 때 안의 `var()`가 풀리기 때문이다. 그래서
`--plk-info-tint: color-mix(in srgb, var(--plk-info) 16%, transparent)`를 다크 블록에만
써도, 라이트 테마 요소에서 쓰이는 순간 `var(--plk-info)`가 라이트 오버라이드 값으로
풀린다. 기존 accent-tint가 라이트 블록에 없는 이유를 이번에 확실히 이해했다.

Tailwind 유틸 매핑(`@theme inline`)에도 여섯 개(`--color-info`, `--color-info-tint`,
`--color-info-border`, warn 동일)를 추가해서 `text-info`, `bg-warn-tint` 같은 유틸이
생기게 했다.

## PostChips: boolean에서 단계 enum으로

`rumour: boolean` prop을 `stage?: PostStage | null`로 바꿨다. `PostStage`는
`"RUMOUR" | "IN_PROGRESS" | "OFFICIAL"` 리터럴 유니온이고, 컴포넌트 안에 단계별
라벨·색 클래스 맵을 뒀다.

- RUMOUR → 초록 (`bg-accent-tint border-accent-border text-accent`, 기존 그대로)
- IN PROGRESS → 노랑 (`bg-warn-tint border-warn-border text-warn`)
- OFFICIAL → 파랑 (`bg-info-tint border-info-border text-info`)

고민한 지점은 이 매핑을 어디에 둘 것인가였다. `@plick/domain`에 `STAGE_META`(라벨만
있는 맵)가 이미 있어서 거기에 색을 넣고 앱이 꺼내 넘기는 방법도 있었다. 그런데
`@plick/ui`는 domain에 의존하지 않는 게 원칙이고(ADR 0011 게이트 A — 앱이 primitive를
넘긴다), 반대로 라벨과 색은 도메인 지식이 아니라 표시 스펙이다. 기존 코드도 "RUMOUR"
문자열과 accent 클래스를 PostChips 안에 하드코딩하고 있었으니, 표시 스펙은 표시
컴포넌트가 소유한다는 기존 판단을 그대로 확장했다. 도메인 `RumorStage`와 리터럴이
같아서 구조적 타이핑으로 `stage={reel.stage}`가 그냥 통한다. 철자 함정(BE는 미국식
`RUMOR`, 도메인은 영국식 `RUMOUR`)은 fetcher의 `STAGE_BY_BE_VALUE` 변환이 이미 흡수하고
있어서 손댈 게 없었다.

호출부는 네 군데(모바일 `ReelItem`·`ArticleBody`, 웹 `ReelCard`·`ArticleMain`) 전부
`rumour={post.stage === "RUMOUR"}`를 `stage={post.stage}`로 바꿨다. 릴스 티켓이지만
공용 컴포넌트라 기사 세부와 웹도 같이 바뀐다. 어차피 같은 스펙이 적용돼야 할
자리들이라 따로 분기하지 않았다.

## ReporterTierBadge: T숫자에서 S·A·B·C로

`T{tier}` 표기를 등급 문자 맵으로 바꿨다.

- 0 → S, 파랑 (`border-info text-info`)
- 1 → A, 초록 (`border-accent text-accent`)
- 2 → B, 회색 (`border-border-strong text-text-3`)
- 3 → C, 회색 (동일)

회색은 새 토큰 없이 기존 보조 텍스트·테두리 토큰을 썼다. tier가 null이거나 맵에 없는
값이면 안 그리는 방어는 기존 그대로 유지했다. BE 실데이터의 절반이 티어 없이 오고,
모르는 값을 임의 등급으로 보여주는 것보다 안 보여주는 게 낫다는 판단도 그대로다.

도메인 `Reporter.tier`는 `1 | 2 | 3`에서 `0 | 1 | 2 | 3`으로 넓혔다. 0이 최상위(S)라는
게 직관과 반대라 주석에 박아뒀다. 릴스 쪽 `ReelCard.reporter.tier`는 애초에
`number | null`이라 손댈 게 없었다.

## 검증

`pnpm check-types`, `pnpm lint`, `pnpm build` 전부 통과. dev 서버(:3001)를 모바일
뷰포트로 띄워 릴스를 확인했다. OFFICIAL 파랑 칩이 릴 카드와 세부 시트 도킹 위치
양쪽에서 잘 나오고, Simon Stone 옆에 초록 A 배지가 릴 카드와 시트 기자 줄 양쪽에
나온다. 콘솔 에러 없음.

한계도 남긴다. 로컬 BE 실데이터 첫 페이지들이 전부 OFFICIAL이고 티어도 1 아니면
null이라, 노랑 IN PROGRESS 칩과 S·B·C 배지는 실화면으로 못 봤다. 매핑 테이블 한 줄
차이라 코드 리뷰로 충분하다고 보고 넘어갔는데, 시드 데이터에 단계·티어를 골고루 넣어
달라고 BE에 요청해두면 다음부터 눈으로 확인할 수 있겠다.

사소한 삽질 하나: 브라우저 패널로 릴스를 검증할 때 휠 스크롤로는 릴이 안 넘어갔다.
Embla 세로 캐러셀이라 드래그 제스처로 넘겨야 했다.
