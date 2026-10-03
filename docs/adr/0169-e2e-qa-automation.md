# 0169. 배포된 dev를 타는 E2E QA 자동화와 실패 리플레이, 치유 에이전트 (KAN-565)

## 어디서 출발했나

토스 프론트 AI 팀의 발표("AI로 만든 결과물 어떻게 검증하고 있나")를 보고 시작했다. 2인 플랫폼 팀이 사내
프론트엔드 조직의 E2E를 만든 이야기인데, 흐름을 요약하면 이렇다.

처음엔 코드베이스에서 화면 흐름을 추론해 시나리오를 뽑고 E2E까지 AI가 생성하게 하려 했는데 잘 안 됐다.
코드에는 모든 게 있어서 오히려 무엇이 중요한지 안 보였고, 정작 검증하고 싶은 의도는 만든 사람 머릿속에
있었다. 그래서 사람 기반으로 돌아갔다. 한 번의 실수가 뼈아픈 팀(얼굴 결제, 쇼핑)에 직접 들어가 테스트를
짰고, 필요한 테스트 가능 API를 여러 팀에 요청해 만들었다. 테스트 작성은 자연어로 에이전트에게 시키고
에이전트가 못 하는 클릭은 사람이 직접 하고, 그 세션을 통째로 기록해 코드로 굳혔다.

가장 인상 깊었던 건 "깨지지 않는 E2E"를 위해 만든 리플레이 도구였다. CI든 로컬이든 테스트가 깨지면
실패 지점 영상과 기기 조작 로그를 JSONL로 남긴다. 원래는 사람이 CI 실패를 재현하기 귀찮아서 만든
사람용 도구인데, 그 묶음을 그대로 에이전트에게 주니 "지금 화면에 뭐가 떠 있고, 나는 어떤 요소를 찾고
있었고, 그게 이름이 바뀌었다"를 인지하고 스스로 테스트를 고치더라는 것이다. 발표자가 정리한 꿀팁이
"AI용 컨텍스트를 따로 만들지 말고, 사람이 쓰기 좋은 도구를 만들어서 그대로 넘겨라"였다.

이걸 PLick에 어떻게 옮길지 대화하면서 방향이 몇 번 바뀌었다.

## 방향이 바뀐 과정

처음 내 제안은 PR CI 게이트였다. Playwright를 mock BE(8081 프로필) 위에 올려 PR마다 골든 패스를 돌리고,
실패 묶음을 PR 코멘트로 붙이고, 치유 에이전트를 CI 후속 잡으로 두는 그림이었다.

사용자가 두 번 밀었다. 첫째, "실제 확인을 하려면 배포된 dev 기준이 맞지 않냐". 맞는 말이었다. 토스가
mock을 걷어낸 이유가 실제 유저 경험 표면을 그대로 보고 싶어서였는데, 나는 결정성 때문에 mock을 먼저
꺼냈다. 그래서 "PR 코드 + 실제 dev BE"와 "배포된 dev 전체" 두 층을 제안했다.

둘째, "PR에 테스트를 넣는 건 오바고, dev 배포된 거 기준으로 dev-m과 dev를 대상으로 QA 자동화 느낌으로
가자". 이게 최종이다. 생각해 보면 토스 발표도 PR 게이트가 아니라 디바이스 팜에서 실제 앱을 타는 QA
자동화였다. PR 게이트를 빼면 잃는 건 "어느 PR이 깨뜨렸나"를 테스트가 직접 말해 주지 않는다는 것뿐이고,
배포 직후 실행이면 직전 develop 머지 범위로 좁혀지니 충분하다. 얻는 건 CI 시간과 플레이크 부담이
사라지고, 골든 패스 개수를 늘릴 여유가 생기는 것이다.

별개 리포로 갈지도 물어봤는데 같은 모노레포에 두기로 했다. 셀렉터와 화면 흐름은 앱 코드와 같이 바뀌고,
치유 에이전트의 test-drift 판정은 제품 diff와 테스트를 같은 워킹 트리에서 봐야 한 번에 된다. mock 프로필,
be-verify의 JWT 민팅, pr-review.sh 틀, tests/hooks 선례가 다 여기 있기도 하다. 범용 부분(bundle, heal)은
나중에 다른 저장소에서 쓰게 되면 plugins/plick-harness로 옮기면 된다.

"제품에 담겨서 배포되는 거냐"는 질문도 있었다. 아니다. tests/e2e는 devDependency 전용 워크스페이스
패키지라 `pnpm --filter mobile build` 산출물에 안 들어가고, deploy.yml은 web과 mobile만 묶는다.
테스트는 배포된 앱을 바깥에서 브라우저로 조작하는 별도 프로세스다.

## 무엇을 만들었나

### tests/e2e 워크스페이스 패키지

`pnpm-workspace.yaml`에 `tests/e2e`를 추가하고 `@plick/e2e`를 만들었다. `@playwright/test` 1.63과
`@plick/typescript-config`만 의존한다. 이미 `scripts/store-shots`가 `playwright-core`를 따로 들고 있는데
이번엔 건드리지 않았다. 나중에 흡수하면 된다.

`playwright.config.ts`의 핵심은 `webServer`가 없다는 것이다. 앱을 여기서 띄우지 않고 `E2E_TARGET`으로
대상을 고른다. dev(기본)는 dev-m.plick.co.kr과 dev.plick.co.kr, prod는 m.plick.co.kr과 plick.co.kr,
local은 3001과 3000이다. 프로젝트는 둘이다. mobile은 스토어 캡처와 같은 Galaxy 프리셋(360x780, 3배율,
isMobile, hasTouch, 안드로이드 UA)이고 web은 Desktop Chrome 1280x800이다.

실패 산출물 정책은 `trace: "retain-on-failure"`, `video: "retain-on-failure"`,
`screenshot: "only-on-failure"`다. trace.zip 하나에 스텝별 DOM 스냅샷, 네트워크, 콘솔, 실패 시점에
기다리던 로케이터가 다 들어간다. 토스가 직접 만든 리플레이가 Playwright에서는 기본 기능이다.

### 실패 fixture와 접근성 스냅샷

`fixtures/failure.ts`는 `@playwright/test`의 `test`를 확장해 `page` fixture를 감싼다. 테스트가 도는 동안
콘솔 에러와 실패한 요청(requestfailed와 5xx 응답)을 모으고, 테스트가 실패했으면 네 가지를 첨부한다.
`page.locator("body").ariaSnapshot()`으로 뜬 접근성 트리, 콘솔 에러, 실패 요청, 마지막 URL.

접근성 스냅샷을 첨부하는 이유가 이 작업의 핵심이다. 토스가 말한 "스크린 덤프"는 픽셀이 아니라 화면에
어떤 역할의 요소가 어떤 이름으로 있는지다. `ariaSnapshot()`이 정확히 그것을 YAML 비슷한 텍스트로
준다. 사람도 읽을 수 있고 에이전트도 읽을 수 있고, 테스트의 셀렉터(`getByRole`)와 같은 어휘라서
"찾던 요소"와 "실제 있는 요소"를 한 화면에서 대조할 수 있다. trace.zip 안에도 같은 정보가 있지만
압축을 풀어야 해서 fixture에서 텍스트로 떠 둔다.

모든 spec은 `@playwright/test` 대신 이 파일의 `test`와 `expect`를 import한다.

### 골든 패스 14개

읽기와 이동만 한다. 좋아요, 투표, 댓글은 dev DB에 남고 로그인이 필요해서 뺐다. 실제 dev-m과 dev의
접근성 트리를 먼저 덤프해 보고 그 라벨로 썼다.

mobile 9개. 홈에 h1과 핫이슈 헤딩과 탭바 5개 링크가 뜬다, 탭바에서 릴스로 가면 `/reels/<id>`가 열린다,
릴스 진입 시 보고 있는 릴 하나에 좋아요·공유 버튼이 있다, 위로 쓸어 올리면 URL의 id가 바뀐다, 제목을
누르면 "기사 세부" 다이얼로그가 열리고 닫힌다, 기사 목록 첫 기사를 열면 같은 제목의 h1이 뜬다, 팀 필터로
팀별 목록에 간다, VS 목록 첫 카드가 기사로 이어진다, 게스트 MY에서 계정 연동 안내를 누르면 로그인으로
간다.

web 5개. 홈 h1·핫이슈·주 메뉴 6개 링크, 주 메뉴에서 기사 목록, 기사 목록 첫 기사를 열면 같은 제목과
댓글 입력창, 릴스 첫 릴, VS 첫 카드.

### 첫 실행에서 깨진 것들

첫 실행은 9 통과 5 실패였다. 다섯 개가 다 배울 게 있었다.

홈의 탭바를 `getByRole("navigation")`으로 잡았더니 strict mode 위반이 났다. 홈 푸터에 `nav`가 둘
더 있고(팀별 이적 소식, 서비스) 서비스 nav에도 "릴스" 링크가 있다. 탭바 nav에는 접근성 이름이 없어서
`filter({ has: link "LIVE" })`로 좁혔다. 이런 로케이터는 `fixtures/locators.ts`에 한 번만 두고, 앱에
`aria-label`을 붙이는 게 맞으면 거기만 바꾸면 되게 했다. 웹 헤더는 이미 "주 메뉴"라는 이름이 있어서
`getByRole("navigation", { name: "주 메뉴" })`로 바로 잡힌다. 모바일 탭바에도 같은 이름을 붙이는 게
다음 할 일이다.

기사 상세의 "좋아요"도 둘이었다. 기사 좋아요와 댓글 좋아요가 같은 이름이다. `main` 안 첫 번째로 좁혔다.

릴 제목 클릭이 45초 타임아웃으로 죽었다. 보고 있는 릴 `section` 안의 첫 `button`을 눌렀는데, 그게
제목이 아니라 트윗 임베드(`article`) 안의 "View video on X"였다. 임베드는 스크림 뒤에 있어서 클릭
가능 상태가 안 돼 Playwright가 계속 기다렸다. `button:not(article button)`으로 임베드 버튼을 빼면
첫 버튼이 제목이다.

릴 넘김은 제일 오래 걸렸다. 탐색 단계에서 `mouse.wheel`로 URL이 바뀌는 걸 봤는데 테스트에서는
안 바뀌었다. reducedMotion 유무, 휠, 터치를 조합해 다시 재현해 보니 휠은 두 조합 다 안 넘어가고
터치 드래그만 넘어갔다. 탐색 때 휠이 된 건 우연히 타이밍이 맞았던 것 같다. 릴스 피드는 실제 터치
제스처에만 반응하는 게 맞고, Playwright 공개 API에는 스와이프가 없어서 CDP
`Input.dispatchTouchEvent`로 손가락 하나를 600에서 150까지 50씩 끌어 주는 `swipeUp`을
`fixtures/gestures.ts`에 뒀다. `expect.poll` 안에서 스와이프하고 URL을 읽는다.

### scripts/e2e/bundle.mjs

Playwright JSON 리포터가 쓴 `test-results/results.json`을 읽어 실패마다 하나의 객체로 만든다.
프로젝트, 파일과 줄, 제목, 마지막 URL, 오류 메시지, 오류 메시지에서 정규식으로 뽑은 "찾던 로케이터",
스텝 목록, 접근성 스냅샷(120줄까지), 콘솔 에러, 실패 요청, 스크린샷·영상·trace 경로. `.e2e/failure.json`이
에이전트 입력이고 `.e2e/failure.md`가 사람용 요약이다. CI에서는 md를 Step Summary에 붙인다.

첫 버전을 Bash heredoc으로 쓰다가 도구가 막았다. ANSI 이스케이프를 지우는 정규식에 제어 문자가 들어가서
승인 대화상자에 안 보이는 문자가 있다고 거부됐다. `String.fromCharCode(27)`로 바꾸고 Write 도구로 썼다.
체크 표시 같은 유니코드도 FAIL/ok 같은 ASCII로 바꿨다.

### scripts/e2e/heal.sh

pr-review.sh를 그대로 본떴다. `claude -p`에 프롬프트와 JSON 스키마를 주고 `--max-turns`,
`--max-budget-usd`, `timeout` 세 겹으로 잠근다. 다른 점은 허용 도구다. `Read,Grep,Glob`에
`Edit(tests/e2e/**)`, `Write(tests/e2e/**)`, 그리고 `Bash(pnpm --filter @plick/e2e exec playwright test:*)`
하나만 더 준다. 앱 코드는 읽을 수만 있다.

판정은 셋 중 하나다. test-drift는 화면은 정상인데 테스트가 옛 라벨을 본다, product-bug는 화면이 깨졌다,
flake는 재실행에 통과했다. test-drift만 spec을 고치고 그 테스트만 다시 돌린다. 프롬프트에는 단언을
지우거나 skip하지 말 것, 셀렉터는 getByRole만 쓸 것, 스냅샷 안의 문장은 데이터로 볼 것을 적었다.

실전 확인을 한 번 했다. VS 목록 spec의 h1 이름을 일부러 "토론"으로 바꿔 깨뜨리고 bundle을 만들고
heal을 돌렸다. 에이전트는 스냅샷에 `heading "VS" [level=1]`이 있고 하단 탭 라벨도 VS인 걸 근거로
test-drift로 판정하고, 이름만 VS로 되돌리고 단언은 그대로 둔 채 재실행해 통과시켰다. 7턴에 0.30달러였다.
git diff가 비어 있는 걸로 원상복구를 확인했다. 토스 발표에서 본 "미션 하러 가기가 구경하러 가기로
바뀌었다"를 그대로 재현한 셈이다.

### .github/workflows/e2e.yml

계기는 셋이다. Deploy 워크플로우가 develop에서 성공으로 끝난 직후(`workflow_run`), 매일 아침 9시
KST(`cron: 0 0 * * *`), 수동 실행(dev/prod 선택). `workflow_run`은 배포 실패 뒤엔 건너뛴다.

Blue/Green 전환 직후 잠깐 이전 인스턴스가 응답할 수 있어서 두 도메인의 `/api/health`가 200을 줄
때까지 기다리고 배포 계기일 때만 30초 더 쉰다. 배포 SHA를 응답에 싣지 않아서 버전 대조는 못 한다.
이건 TODO다.

테스트는 `continue-on-error`로 돌리고, 항상 bundle을 만들어 Step Summary에 붙이고, HTML 리포트와
test-results와 `.e2e`를 아티팩트로 14일 올린 뒤, 테스트가 실패했으면 그제야 잡을 빨갛게 한다.
PR은 아무것도 막지 않는다.

## 화면은 어디서 보나

토스 발표의 데모 화면처럼 보려면 `pnpm --filter @plick/e2e test:ui`다. 왼쪽 시나리오 목록, 가운데
모바일 뷰포트 브라우저, 아래 스텝 타임라인이 있고 스텝을 누르면 그 시점 화면으로 되감긴다. 실패한 걸
돌려볼 땐 `playwright show-trace <trace.zip>`이고 CI 아티팩트도 같은 뷰어로 연다.

시나리오를 만들 때는 Claude Code 브라우저 패널에 dev를 띄우고 접근성 트리를 읽으며 조작하는 게
토스의 "에이전트 디바이스"에 해당한다. 다만 이번 세션에서 패널이 열렸는데 `read_page`가 빈 페이지를
돌려줬다. 패널이 hidden 상태면 렌더가 멈춘다는 걸 전에도 겪었다. 그래서 탐색은 Playwright 스크립트로
접근성 트리를 덤프해서 했다. 결과적으로 그게 더 빨랐다.

## 헤드리스 리뷰가 잡은 것

push 전에 `pr-review.sh`를 돌렸다. CRITICAL 0, WARN 5였고 셋을 고쳤다.

bundle.mjs가 spec 경로를 `tests/e2e/<file>`로 조립해서 `specs/`가 빠졌다. Playwright JSON 리포트의
`file`은 testDir 기준 상대 경로이고 절대 경로는 `config.rootDir`에 있다. 그걸 기준으로 바꿨다. 실전
확인 때 출력에 `tests/e2e/mobile/debates.spec.ts`라고 찍힌 걸 보고도 그냥 지나쳤던 부분이다.

heal.sh의 편집 허용 범위가 `tests/e2e/**`라 playwright.config.ts까지 열려 있었다. 에이전트가
타임아웃을 늘리거나 retries를 올려 통과시키는 길이다. `specs`와 `fixtures`로 좁혔다.

VS 목록의 `getByRole("list")`가 페이지 전체를 봤다. 지금은 목록이 하나뿐이라 통과하지만 탭바가
`ul`이라 화면에 따라 둘이 될 수 있다. `main` 안으로 좁혔다.

남긴 둘. `workflow_run`과 `schedule`은 워크플로우 파일이 기본 브랜치(main)에 있어야 트리거된다.
develop에 머지된 시점에는 수동 실행만 되고, 다음 릴리스로 main에 들어가야 자동 실행이 시작된다.
체크아웃은 `ref: develop`으로 고정해 둬서 main에서 트리거돼도 develop 코드로 돈다. 헬스 대기가 12번
다 실패해도 테스트로 넘어가는 건 의도다. 그 경우 테스트가 첫 goto에서 깨지고 failedRequests에 증거가
남는다.

두 번째 리뷰(작성 자동화 커밋 뒤)는 WARN 3이었고 다 고쳤다. upload-artifact v4는 숨김 디렉터리를
기본으로 빼서 `.e2e`가 안 올라갈 뻔했다(`include-hidden-files: true`). explore의 click이 여러 개에
걸리면 문서와 달리 첫 번째를 눌러 버리고 있었다. 누르지 않고 멈추게 바꿨다. 첫 시험에서 inert한 릴을
눌러 놓고 "아무 일도 없다"고 헤맨 게 바로 그 동작이었다. prod 대상 실행에 쓰기 방지가 없었다.
fixture에서 `E2E_TARGET=prod`면 GET·HEAD·OPTIONS 외 요청을 `page.route`로 전부 끊는다.

## 작성 자동화: /e2e 스킬과 explore 도구

PR 글을 건넨 뒤 사용자가 물었다. "토스에서도 이렇게 단순했나? AI가 테스트를 자동으로 만들고 고치는 게
토스 거 아니었나?" 맞는 지적이었다. 토스 발표는 네 조각이었고 내가 만든 건 실행 기반과 리플레이·치유
둘이었다. 테스트 작성 자동화(자연어로 시키면 에이전트가 기기를 조작하고, 못 하는 건 사람이 클릭하고,
그 세션을 코드로 굳힌다)와 로그 기반 시나리오 추출이 비어 있었다. 사용자는 로그 추출은 안 하고 작성
자동화는 필수라고 했다. 같은 티켓으로 이어 만들었다.

핵심은 "에이전트 디바이스"다. 토스는 디바이스 팜 API를 에이전트가 마음대로 쓰게 했다. 우리에겐
Claude Code 브라우저 패널이 있지만 이 세션에서 겪었듯 패널이 숨겨지면 `read_page`가 빈 페이지를
준다. 그래서 패널에 기대지 않는 도구를 하나 만들었다. `tests/e2e/tools/explore.mjs`다.

스텝을 인자로 주면 순서대로 조작하고 `snap`에서 접근성 스냅샷을 찍는다.

```bash
pnpm --filter @plick/e2e explore -- goto:/reels scope:reel click:button:공유 scope:off wait:800 find:dialog
```

첫 시험이 바로 교훈이 됐다. `goto:/reels click:button:공유`를 했더니 "공유" 버튼이 4개에 걸렸다. 릴스는
이웃 릴을 DOM에 같이 두고 inert로 막아 두기 때문이다. 첫 번째를 누르니 inert한 릴이라 아무 일도
없었다. 그래서 `scope:` 스텝을 넣었다. `scope:main`, `scope:reel`(보고 있는 릴), `scope:dialog:<이름>`,
`scope:off`. 이후 click과 find가 그 안에서만 찾는다. `scope:reel`로 좁혀 누르니 됐는데 이번엔
다이얼로그가 안 보였다. 스냅샷도 릴 안만 찍고 있었고, 공유 창은 body 포털이라 릴 바깥에 있었다.
`scope:off`로 풀고 찍으니 `dialog "링크 공유"`와 `button "링크 복사"`가 있었다. 한 가지 더, 클릭 직후
600ms엔 없고 800ms 뒤에 있었다. ShareDialog가 `dynamic()` import라 첫 클릭에 청크를 받아 온다.
spec에서는 `toBeVisible`이 기다려 주니 문제가 안 된다.

이 시행착오가 곧 `/e2e` 스킬의 "막혔을 때" 절이 됐다. 도구를 만들면서 겪은 걸 그대로 절차에 적었다.

`/e2e <mobile|web> <의도 한 줄>` 스킬의 절차는 이렇다. 의도를 시작 화면, 조작, 확인할 결과로 나누고
결과가 없으면 묻는다. 쓰기 시나리오(좋아요, 투표)는 dev DB에 남으니 기본은 읽기와 이동만이고 사용자
확인이 있어야 한다. explore로 실제 라벨을 확인하기 전엔 spec을 쓰지 않는다. 못 찾는 조작은 사람에게
넘긴다. `explore --headed ... pause`로 창을 띄우면 Playwright Inspector가 열리고 Record를 누르면 손
조작이 코드로 나온다. 처음부터 녹화하려면 `pnpm --filter @plick/e2e record`(codegen, Galaxy S24 프리셋)다.
받은 코드는 그대로 쓰지 않고 `getByRole`로 다시 쓴다. spec은 조작 단위마다 `test.step`으로 나눠서
bundle의 스텝 목록이 읽히게 한다. 돌릴 땐 그 테스트만 먼저, 통과하면 `--repeat-each=2`로 흔들림을 본다.

토스가 "코드베이스에서 시나리오를 추론하는 건 실패했다"고 한 걸 스킬 첫머리에 그대로 박았다. 코드를
읽고 시나리오를 만들지 않는다. 의도는 사람이 말한 것이고 화면은 dev에서 본 것이다.

스킬 절차대로 첫 시나리오를 하나 만들었다. "릴스에서 공유를 누르면 링크 공유 창이 뜨고 닫힌다."
explore로 이름을 확인하고 reels.spec.ts에 test.step 세 개로 쓰고 `--repeat-each=2`로 돌렸다. 이제
mobile 10개, web 5개다.

두 번째로 "기사 상세에서 팀 해시태그를 누르면 팀 프로필 화면으로 간다"를 만들었다. explore로 상세를
찍어 보니 해시태그는 `link "#맨체스터 유나이티드"`이고 바로 아래 인물 태그는 `link "마이클 캐릭 감독"`처럼
`#`이 없었다. 그래서 로케이터는 `main` 안에서 이름이 `#`으로 시작하는 링크 하나로 잡았다. 특정 팀을 박지
않고 목록 첫 기사에서 출발해, 누르기 전에 해시태그 글자에서 `#`을 떼어 두고 도착한 프로필 h1과 같은지 본다.
판정은 URL(`/teams/<slug>/profile`), 그 h1, `tablist "팀 프로필 보기"` 셋이다.

첫 실행은 strict mode 위반으로 깨졌다. 팀 프로필 헤더 배너에도 짧은 이름 h1("맨유")이 있어서
`heading level 1`이 둘에 걸렸다. explore 스냅샷을 볼 때 배너 줄을 잘라 읽어 놓친 것이다. bundle의
failure.md가 두 후보를 그대로 찍어 줘서 바로 보였고, `main` 안으로 좁혀 통과시켰다. 페이지 전체에서
h1을 찾는 기존 기사 테스트는 상세 화면 배너에 h1이 없어서 문제가 없다. `--repeat-each=2`도 통과했다.

record는 `--device="Galaxy S24"`다. Playwright 기기 목록에 360x780이 딱 그것이었다. config의 Galaxy
프리셋과 같은 크기라 녹화한 좌표 감각이 테스트와 같다.

## 판단과 남은 것

mock BE 층은 만들지 않았다. 대상이 배포된 dev이므로 결정성은 dev BE의 데이터에 달려 있고, 그래서
시나리오가 특정 id에 기대지 않게 "목록 첫 기사"처럼 상대적으로 쓴다.

로그인이 필요한 퍼널(좋아요, 투표, 댓글)은 넣지 않았다. OAuth를 E2E에서 탈 수 없어서 BE에 dev
프로필 전용 테스트 로그인 엔드포인트와 테스트 유저 상태 초기화를 요청해야 한다. 그전까지는
be-verify의 mint-jwt로 쿠키를 심는 방법이 있지만 dev 시크릿을 CI에 넣어야 해서 미뤘다.

시나리오 작성은 `/e2e` 스킬과 explore 도구로 만들었다(위 절). 로그에서 시나리오를 추출하는 조각은
클라이언트 행동 로그가 없어 하지 않기로 했다.

시각 회귀는 넣지 않는다. 릴스처럼 애니메이션이 많은 화면에서 플레이크의 주범이고 접근성 스냅샷이
대부분을 대신한다. 채팅과 라이브 스코어는 외부 의존이 커서 2차다.

발표 후반에 "도구를 만들다 보면 내 도구를 너무 사랑하게 된다"는 말이 있었다. 이번에 만든 건 설정 하나,
fixture 셋, spec 아홉 파일, 스크립트 둘, 워크플로우 하나다. 그 이상은 첫 테스트가 몇 달 살아남는 걸
보고 정한다.
