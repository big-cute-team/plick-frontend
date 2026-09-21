---
name: e2e
description: 자연어 의도 하나로 배포된 dev 화면을 같이 타면서 Playwright E2E 시나리오를 만들고 통과까지 확인한다. 못 찾는 조작은 사람이 직접 하고 그 기록을 코드로 굳힌다
argument-hint: <mobile|web> <시나리오 의도 한 줄>
disable-model-invocation: true
---

배포된 dev를 타는 E2E 시나리오를 하나 만든다. 인자: `$ARGUMENTS`
(첫 번째는 `mobile` 또는 `web`, 나머지는 시나리오 의도. 예: `mobile 릴스에서 공유 버튼 누르면 공유 창이 뜨고 닫힌다`)

시작 전에 `tests/e2e/README.md`를 읽는다. 셀렉터 규칙과 실행 방법이 거기 있다.
기존 spec은 `tests/e2e/specs/<project>/`에 있고 공용 로케이터는 `tests/e2e/fixtures/locators.ts`다.

코드베이스를 읽고 시나리오를 추론하지 않는다. 의도는 사용자가 말한 것이고, 화면은 실제 dev에서 본 것이다.
두 가지가 만나는 자리가 spec이다.

## 절차

1. 의도를 셋으로 나눈다. 시작 화면, 조작 순서, 확인할 결과. 결과가 빠져 있으면("릴스 넘겨 봐") 무엇이
   보이면 성공인지 사용자에게 한 줄로 묻는다. 추측으로 채우지 않는다.
2. 쓰기 여부를 가른다. 좋아요·투표·댓글·팀 선택은 dev DB에 남는다. 테스트 로그인 엔드포인트가 아직 없어
   기본은 읽기와 이동만이다. 사용자가 쓰기 시나리오를 원하면 dev 데이터에 남는다는 것을 알리고 확인을 받은
   뒤 진행하고, spec 주석 첫 줄에 남기는 데이터를 적는다.
3. 화면을 탐색한다. 실제 라벨을 확인하기 전엔 spec을 쓰지 않는다.
   ```bash
   pnpm --filter @plick/e2e explore -- goto:/reels snap click:button:공유 snap
   ```
   스냅샷의 role과 name이 그대로 셀렉터다. `click`이 여러 개에 걸리면 후보를 찍어 주니 그 자리에서
   `main` 안으로 좁히거나 exact(`=`)를 쓴다. 릴 넘김은 `swipe` 스텝이다.
   Claude Code 브라우저 패널로 봐도 되지만 `read_page`가 빈 페이지를 돌려주면(패널이 숨겨져 렌더가
   멈춘 상태) 싸우지 말고 explore로 간다.
4. 못 찾는 조작이 있으면 사람에게 넘긴다. 셋 중 하나를 안내한다.
   - `pnpm --filter @plick/e2e explore -- --headed goto:/reels pause`: 창이 뜨고 Inspector가 열린다.
     Record를 누르고 손으로 조작하면 코드가 나온다. 그 코드를 채팅에 붙여 달라고 한다.
   - `pnpm --filter @plick/e2e record`: 처음부터 녹화한다(웹은 `record:web`).
   - 어떤 요소를 눌러야 하는지 이름만 말해 달라고 한다.
     받은 코드는 그대로 쓰지 않는다. `getByRole`과 접근성 이름으로 다시 쓰고 CSS·nth·좌표는 버린다.
5. spec을 쓴다. `tests/e2e/specs/<project>/<화면>.spec.ts`에 같은 화면 파일이 있으면 거기 test를 더한다.
   - `import { test, expect } from "../../fixtures/failure"` (실패 산출물 첨부)
   - 조작 단위마다 `await test.step("...", async () => { ... })`. bundle이 스텝 목록을 그대로 보여 준다
   - 특정 id 대신 "목록 첫 기사"처럼 상대적으로 고른다. `networkidle`은 쓰지 않는다
   - 이름 없는 랜드마크를 새로 좁혀야 하면 `fixtures/locators.ts`에 추가한다
   - 결과 확인은 화면에 보이는 것으로 한다(헤딩, 다이얼로그, URL, 버튼 상태). 콘솔이나 네트워크로 판정하지 않는다
6. 돌린다. 먼저 그 테스트만, 통과하면 `--repeat-each=2`로 한 번 더 돌려 흔들림을 본다.
   ```bash
   pnpm --filter @plick/e2e test -- --project=<project> -g "<제목>"
   ```
   깨지면 `node scripts/e2e/bundle.mjs`로 찾던 요소와 스냅샷을 대조해 고친다. 단언을 지우거나
   타임아웃을 늘려 통과시키지 않는다.
7. 앱 쪽에 접근성 이름이 없어서 로케이터가 억지스러우면(`filter({ has })`, `:not()`) spec은 그대로 두고
   앱에 `aria-label`을 붙이는 제안을 사용자에게 한다. 앱 수정은 확인을 받고 한다. 붙였으면 다음 배포 뒤
   locators.ts를 `getByRole(name)`으로 바꾼다.
8. 마무리. 사용자에게 무엇을 밟고 무엇을 확인하는 테스트인지 세 줄로 요약한다. 화면으로 보고 싶으면
   `pnpm --filter @plick/e2e test:ui`라고 알린다. 브랜치 작업 중이면 커밋 메시지에 티켓 키를 넣고,
   그 세션 ADR에 시나리오와 막혔던 지점을 이어 쓴다.

## 막혔을 때

- dev가 502나 빈 화면이면 시나리오 문제가 아니다. `curl -s https://dev-m.plick.co.kr/api/health`로
  확인하고 사용자에게 알린다. BE 상태는 `docs/monitoring.md`.
- 같은 이름의 요소가 둘 이상이면 우선 `getByRole("main")` 안으로, 그다음 가까운 랜드마크(article, dialog)로
  좁힌다. `.first()`는 순서가 의미 있을 때만 쓰고 주석에 왜 첫 번째인지 적는다.
- 트윗 임베드 안의 버튼("View video on X")은 스크림 뒤라 클릭이 영원히 기다린다. 릴 안 버튼은
  `fixtures/locators.ts`의 `reelTitle`처럼 `button:not(article button)`으로 임베드를 뺀다.
- 제스처가 필요한데 explore의 `swipe`로 안 되면 iOS 시뮬레이터로 실제 동작을 확인하고, 코드는
  `fixtures/gestures.ts`의 CDP 터치 헬퍼로 쓴다.
- 로그인이 필요한 화면은 지금 못 만든다. TODO로 남기고 BE 테스트 로그인 엔드포인트 요청을 알린다.
