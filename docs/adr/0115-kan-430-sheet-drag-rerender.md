# 0115. 시트 드래그 리렌더 제거 — 7.6fps가 61.5fps가 되기까지 (KAN-430)

2026-08-31. 성능 포트폴리오 덩어리 5(인터랙션)의 첫 레버. 성능 감사
([2026-08-31-performance-audit.md](../audits/2026-08-31-performance-audit.md) #16)가 지적한
"시트 드래그 중 프레임당 전체 리렌더"를 없앴다. 결과부터 쓰면, CPU 4배 감속 조건에서
드래그가 7.6fps에서 61.5fps가 됐고 React 커밋은 드래그당 77회에서 2회가 됐다. 그런데
한 번에 간 게 아니라 중간에 가설 하나가 실측으로 깨졌고, 그 깨진 자리에서 진짜 병목을
찾았다. 이 문서는 그 과정 기록이다.

## before를 먼저 떠 놓고 시작했다

이번 챕터는 시작하는 방식부터 정했다. 코드를 한 줄이라도 고치기 전에 "지금 얼마나
나쁜가"를 실사진으로 떠 두는 것. 지난 피그마 장표들이 재현 그림 위주라 아쉬웠던 것도
있고, 덩어리 5는 여섯 축 중에 도구 화면 자체가 증거가 되는 유일한 챕터라 그렇다.
DevTools Performance의 flame chart, React Profiler의 커밋 막대와 "Why did this
render?" 패널은 다시 그릴 필요 없이 그 자체로 장표가 된다. 그리고 코드를 고치는 순간
이 장면들은 영영 다시 못 찍는다.

측정 조건은 임베드 LCP 챕터(ADR 0113·0114)에서 정착한 방식 그대로다. develop
`b4506f2`를 prod standalone으로 빌드해 3001에 띄우고(`next start`가 안 되는 구조라
`.next/static`·`public`을 손으로 복사해 `node .next/standalone/.../server.js`),
로컬 BE 실데이터로 릴 30장을 누적한 뒤 세부 시트를 잡고 2~3초 위아래로 드래그했다.

before 수치가 생각보다 심했다.

| 조건                  | 드래그 중                                                         |
| --------------------- | ----------------------------------------------------------------- |
| CPU 무스로틀 (M칩 맥) | 평균 32fps, 드랍 123프레임, 16.7ms 초과 태스크 117개(최장 41.7ms) |
| CPU 4배 감속          | 평균 7.6fps, 드랍 207프레임, 태스크 최장 128ms                    |

스로틀 없는 데스크톱에서도 프레임 절반이 드랍된다. React Profiler로 열어 보면 이유가
한 장에 나온다. 드래그 2.87초 동안 커밋 77회, 그리고 매 커밋마다 파이버 정확히
1,042개 — 트리 전체다. 예외인 커밋이 하나도 없다. 오른쪽 패널의 `ReelItem`엔 "Why did
this render? Props changed: (onOpenDetail)"과 함께 6~9ms짜리 렌더가 수십 줄 이어진다.
감사 리포트가 코드만 보고 지적한 "인라인 props 때문에 릴 전량 재조정"이 도구 화면으로
그대로 확인된 셈이다.

참고로 React Profiler는 배포용 React에선 아예 안 붙는다("Profiling not supported").
`next build --profile`로 프로파일링 빌드를 따로 떠야 하고, 그냥 뜨면 컴포넌트 이름이
전부 minify돼 `F`, `M` 같은 한 글자로 나온다. `--no-mangling`까지 붙여야 `ReelsFeed`가
실명으로 찍힌다. 대신 프로파일링 빌드는 계측 오버헤드가 있어서 프레임 시간은 순정
빌드의 Performance 트레이스로, 리렌더 횟수는 프로파일링 빌드의 Profiler로 나눠 쟀다.
같은 장표에 섞을 땐 조건을 병기해야 한다.

원본 트레이스와 스크린샷은 `_workspace/perf-raw/chunk5-before/`에 있다(git 밖 로컬
보관 — 트레이스 한 파일이 425MB라 커밋할 물건이 아니다. 여담으로 prettier가 이
파일을 읽다 heap OOM으로 죽는 바람에 `_workspace`를 `.prettierignore`에 추가했다).

## 왜 프레임마다 전체가 리렌더됐나

구조를 보면 필연이었다. 시트(ReelDetailSheet)와 릴의 칩·제목(ReelItem)이 한 몸으로
움직여야 해서 개폐·드래그 상태를 부모(ReelsFeed)가 소유한다(`useReelDetailMotion`).
그중 `dragY`가 React state였다. pointermove마다 `setDragY(dy)` → ReelsFeed 리렌더 →
memo가 하나도 없고 `onOpenDetail={(lift) => ...}` 같은 인라인 props까지 겹쳐 릴 30장이
전부 다시 그려진다. 이벤트는 초당 60~120번 온다.

리포엔 이미 정답 패턴이 있었다. 팀 탭 스와이프(`useTeamSwipePager`, KAN-388)는 같은
문제를 "transform은 ref로 직접 대입하고 React 상태는 마운트가 바뀔 때만" 원칙으로
풀어 놨다. 이번 것도 같은 원리인데 한 가지가 달랐다. 따라 움직일 요소가 하나가 아니라
셋(시트 본체·제목 블록·스크림)이고, 그 셋이 두 컴포넌트에 흩어져 있다.

그래서 ref 하나 대신 CSS 변수로 퍼뜨리기로 했다. 드래그 핸들러가
`--reel-sheet-drag-y`에 픽셀값을 쓰고, 세 요소는 각자 transform에서 그 변수를 읽는다.
제목엔 클램프 로직(도킹 지점 위~원래 자리 0 사이)이 있었는데 이것도 CSS로 옮겼다 —
`translateY(min(0px, calc(lift + var(--reel-sheet-drag-y, 0px))))`. `Math.min`을 하던
`clampTitleOffset` 유틸은 그대로 삭제. 여기에 `memo(ReelItem)` + `onOpenDetail`을
릴을 인자로 받는 공유 `useCallback`으로 바꿔 props 정체성을 고정했다.

리셋 타이밍에 함정이 하나 있었다. 손을 뗐을 때 변수를 바로 0으로 쓰면 transition이
아직 `none`인 채라(dragging=false 리렌더 전) 시트가 제자리로 뚝 떨어진다. state 시절엔
transition 복원과 transform 리셋이 같은 커밋에 묶여 있어서 공짜로 맞던 타이밍이다.
`useLayoutEffect(() => { if (!dragging) writeDragY(0) })`로 커밋 직후 페인트 전에
리셋하면 두 스타일 변화가 같은 recalc에 묶여 전환이 재생된다.

## 검증하다 두 번 헛돌았다

첫 번째는 내 검증 환경 문제. 브라우저 패널이 숨겨져 있으면 rAF가 얼어 있는데(지난
세션에 메모까지 해 둔 함정인데 또 걸렸다), 시트 열림이 double-rAF로 시작되는 구조라
`shown`이 영영 안 켜져서 "시트가 안 열린다"로 보였다. 합성 PointerEvent로 드래그를
흉내 내다 `setPointerCapture`가 가짜 pointerId에 NotFoundError를 던지는 것까지 겹쳐
증상이 뒤섞였다. 결국 기능 검증은 사용자가 실제 브라우저에서 직접 끌어 보는 걸로
정리했다. 제스처 검증은 자동화를 고집할 게 아니다.

두 번째가 진짜 소득이었다. after 트레이스를 떠 보니 무스로틀에선 66fps로 완벽한데
CPU 4배 감속에선 25.6fps에서 멈췄다. 개선은 맞는데(7.6 → 25.6) 60fps엔 한참 못
미친다. 처음엔 감사 #18을 떠올렸다 — 큰 그라데이션 스크림 레이어가 프레임마다 다시
칠해지는 페인트 비용이겠지, `will-change: transform`을 제스처 동안만 붙이면 컴포지터
승격으로 풀리겠지. 붙여서 다시 쟀다. 34.3fps. 오차 범위를 넘는 개선이라 보기 어려웠다.

가설이 틀렸으면 트레이스를 열어 봐야 한다. 드래그 구간의 렌더링 파이프라인을 이벤트
종류별로 합산해 보니 Paint는 초당 19~47ms로 미미했고, UpdateLayoutTree(스타일
recalc)가 초당 524~697ms — 4배 감속된 메인 스레드의 절반 이상이었다. 페인트가 아니라
스타일 재계산이 병목이었던 거다.

원인은 내가 만든 구조에 있었다. CSS 커스텀 프로퍼티는 상속된다. 변수를
`document.documentElement`에 썼으니 값이 바뀔 때마다 문서의 모든 요소가 새 상속값을
받아야 하고, 릴 30장 3천여 노드의 computed style이 프레임마다 통째로 재계산됐다.
React 리렌더를 없앤 자리에 브라우저 스타일 recalc를 문서 전체로 흘려 넣은 셈이다.

## @property inherits: false

해법은 상속을 끊는 것이다. CSS `@property`로 변수를 등록하면 상속 여부를 선언할 수 있다.

```css
@property --reel-sheet-drag-y {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}
```

`inherits: false`면 변수를 쓴 요소 본인만 그 값을 보고, 자식으로 전파되지 않는다.
대신 루트에 한 번 쓰는 걸로는 안 되고(상속이 없으니 소비 요소까지 내려가지 않는다)
소비하는 요소 세 개에 각각 직접 써야 한다. 그래서 `useReelDetailMotion`에
`dragTargetRef`를 만들었다 — 시트 본체·제목·스크림이 ref로 스스로를 Set에 등록하고,
드래그 핸들러는 등록된 요소들에만 `setProperty`를 돈다. React 19부터 콜백 ref가 정리
함수를 반환할 수 있어서 등록 해제가 깔끔하게 떨어진다(노드가 빠질 때 Set에서 지우고
잔값도 걷는다).

프레임당 비용이 "문서 전체 recalc 1번"에서 "요소 3개 recalc 3번"으로 바뀐다. 다시 쟀다.

| CPU 4배 감속       | before          | 1차(루트 변수) | +will-change | 최종(국소화)    |
| ------------------ | --------------- | -------------- | ------------ | --------------- |
| 평균 fps           | 7.6             | 25.6           | 34.3         | 61.5            |
| 드랍 프레임        | 207             | 101            | 128          | 2               |
| 16.7ms 초과 태스크 | 97 (최장 128ms) | 97             | 114          | 0 (최장 13.6ms) |
| 스타일 recalc      | —               | 524ms/s        | 697ms/s      | 31.5ms/s        |

4배 감속에서 61.5fps면 사실상 만점이다. 무스로틀은 66fps(vsync 상한). React
Profiler로도 확인했다 — 같은 드래그에서 커밋 77회 → 2회(제스처 시작과 끝, 둘 다
`dragging` 토글), 커밋당 파이버 1,042개 → 44개, 드래그 중 렌더 시간 합 483ms →
5.3ms. after 플레임그래프에선 릴들이 전부 빗금(렌더 안 됨)으로 나온다. memo가 산다는
뜻이다.

will-change는 최종 구조에도 남겨 뒀다. recalc 병목이 사라진 상태에선 제스처 동안의
컴포지터 승격이 원래 의도대로 동작하고, 상시 부착이 아니라 `dragging` 동안만 붙는
조건부라 ScrollArea에서 실측된 sticky 파괴 문제(조상 transform)와도 무관하다.

## 배운 것

- 바이트 절감이 LCP를 못 움직였던 것(ADR 0114)과 같은 구조의 교훈이 인터랙션에도
  있었다. "React 리렌더 제거"가 곧 "프레임 예산 확보"가 아니다. 리렌더를 없애면 그
  다음 병목(여기선 스타일 recalc)이 드러날 뿐이고, 그건 트레이스를 열어 파이프라인
  단계별로 합산해 봐야 보인다. fps 하나만 보면 "개선됐는데 왜 아직 느리지"에서 멈춘다.
- CSS 변수로 상태를 퍼뜨릴 땐 상속 범위가 곧 recalc 범위다. 루트에 쓰는 순간 문서
  전체가 프레임 예산에 들어온다. `@property inherits: false` + 소비 요소 직접 쓰기가
  세트다.
- will-change는 페인트/컴포지팅 병목에만 레버다. recalc 병목엔 아무 효과가 없다.
  KAN-427 폰트 서브셋처럼, 그럴듯한 가설도 실측이 반증하면 원인을 다시 찾아야 한다.
- 프로파일링 캡처엔 `next build --profile --no-mangling`. 순정 빌드 수치와 섞을 땐
  빌드 종류를 병기한다.

## 남은 것

- 릴 50장 누적 시 DOM 602 → 4,291노드 선형 증가(릴당 92개, 상한 없음)는 이 PR이
  건드리지 않았다. 덩어리 5의 두 번째 레버 KAN-431(DOM 윈도우잉)이 맡는다. before
  시리즈는 `_workspace/perf-raw/chunk5-before/dom-accumulation.json`에 떠 뒀다.
- web(데스크톱) 릴 패널은 구조가 달라(오른쪽 슬라이드) 이번 변경 대상이 아니다.
- 피그마 장표는 임베드 챕터 후반부(8·9쪽)와 함께 이 챕터 것도 밀려 있다. 캡처는 다
  모였으니 장표 작업만 남았다.
