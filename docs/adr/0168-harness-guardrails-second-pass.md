# 0168. 하네스 2차 정비: 금지를 문서에서 도구로 옮기고, 하네스를 재고, 저장소 밖으로 꺼내다

- 티켓: KAN-564
- 브랜치: `feature/KAN-564-harness-guardrails`
- 관련: 포트폴리오 11쪽 "하네스 엔지니어링", [ADR 0029](0029-layered-architecture-restructure.md),
  `plugins/plick-harness/README.md`, `tests/hooks/`

## 왜 시작했나

AWS에서 낸 "Claude Code Deep Dive Workshop" 핸즈온 자료(whchoi98.github.io/ccw-hands-on-lab, 챕터 6개와
캡스톤 6개, 레퍼런스 3개)를 통째로 읽고 내 하네스와 대조했다. 내 포트폴리오 11쪽에 정리해 둔 하네스는 네 가지였다.
검증 과정을 서브 에이전트로 분리한 것, 피그마 스크린샷 대신 JSON 노드를 읽게 강제한 것, CLAUDE.md는 최소로 두고
규칙 본문을 스킬로 지연 로딩한 것, 그리고 커맨드로 절차를 고정하고 커밋 훅과 CI를 가드레일로 둔 것.

장표 첫 줄에 이렇게 써 놨었다. "지시는 확률적으로 어겨지지만 도구 권한과 입력 형식, 저장소에 커밋된 절차는 어길 수 없다."
그런데 저장소를 열어 보니 그 문장을 내가 지키지 않고 있었다. CLAUDE.md에는 🚫 이모지까지 붙여 `gh pr create`와
`gh pr merge`를 금지해 놨는데, `.claude/settings.json`의 allow 목록에는 `Bash(gh pr:*)`가 들어 있고 deny는 빈 배열이었다.
금지는 텍스트에만 있고 권한 층은 정반대로 통째로 허용하고 있었던 것이다. 모델이 어느 날 컴팩션으로 그 줄을 잃으면
아무것도 막지 않는다. 워크샵 Ch4가 딱 그 말을 하고 있었다. "반드시"가 붙는 규칙은 지시가 아니라 훅에 둔다.

그래서 이번 세션에서 여섯 가지를 한 번에 했다. 항목마다 전에는 어땠고 무엇이 문제였고 어떻게 바꿨고 바꾸고 나서
무엇이 달라졌는지를 적는다. 포트폴리오에 그대로 옮길 단위가 그것이라서다.

## 개선 전 측정

바꾸기 전에 숫자부터 남겼다. 개선했다는 말은 전후가 있어야 한다.

세션 시작 시 항상 실리는 컨텍스트(always-on)를 추정했다. 정확히 재려면 새 세션에서 `/context`를 봐야 하는데
그건 대화형 커맨드라 이 세션 안에서 못 돌린다. 대안으로 `claude -p "ok" --output-format json`을 자식 프로세스로
띄워 첫 턴 `usage.input_tokens`를 읽으려 했다. 실패했다. "Failed to authenticate: OAuth session expired and could not
be refreshed." 데스크톱 앱 세션의 자격증명과 CLI의 자격증명이 따로라, 앱 안에서 CLI를 자식으로 띄우면 CLI 쪽 토큰이
만료돼 있었다. `ANTHROPIC_BASE_URL` 같은 앱 환경변수를 지워 봐도 같았다. 이 세션에서 헤드리스 실측은 포기하고,
파일 크기로 추정했다. 한글은 글자당 0.9토큰, 그 외는 3.8자당 1토큰으로 잡았다. 절대값은 거칠지만 전후 비교에는 충분하다.

| 항목                              | 개선 전(추정 토큰) |
| --------------------------------- | ------------------ |
| 루트 CLAUDE.md 전문               | 3,638              |
| apps/mobile/CLAUDE.md             | 275                |
| 스킬 7개 frontmatter(항상 실림)   | 992                |
| 커맨드 5개 frontmatter(항상 실림) | 337                |
| be-verify 에이전트 frontmatter    | 166                |
| always-on 합계                    | 약 5,408           |

플러그인 쪽은 `claude plugin details`가 "Projected token cost"를 직접 찍어 준다. 이건 추정이 아니라 도구가 낸 값이다.

| 플러그인                             | always-on |
| ------------------------------------ | --------- |
| claude-seo (스킬 25, 에이전트 18)    | ~3,294    |
| figma (스킬 12, MCP 1)               | ~1,501    |
| humanize-korean (스킬 3, 에이전트 9) | ~896      |

SEO 플러그인 하나가 내 저장소 하네스 전체와 맞먹는 컨텍스트를 매 세션 먹고 있었다. 이 저장소에서 쓴 적이 없다.
"컨텍스트 예산이 최우선"이라고 장표에 써 놓고 정작 무엇이 예산을 쓰는지 본 적이 없었던 셈이다.

하네스 자체의 등급도 받았다. 워크샵이 쓰는 harness-eval 플러그인(whchoi98/harness-eval)의 quick 모드는 LLM 없이
`templates/checklist.json`의 16개 항목을 셸 스크립트로 확인하는 결정적 채점이다. 스크립트가 Bash 4 이상을 요구하는데
macOS 기본은 3.2라 처음엔 `{"error":"Bash 4.0+ is required"}`만 뱉었다. Homebrew로 bash 5.3을 깔고
`/opt/homebrew/bin/bash`로 돌렸다.

개선 전 결과는 5.5점, F였다. 실패 항목은 다섯 개. PreToolUse 훅 없음(`func-hook-events`), 자동 테스트 없음
(`robust-tests`), 커맨드에 오류 복구 절 없음(`robust-error-recovery`), E2E 없음, 마이그레이션 문서 없음.
반대로 `robust-deny-list`는 통과로 나왔는데 deny가 빈 배열인데도 키가 있다는 이유로 PASS였다. 이 지표를 곧이곧대로
믿으면 안 된다는 첫 번째 신호였다.

## 1. 금지를 문서에서 훅과 권한 규칙으로 옮겼다

### 전에는

CLAUDE.md `Git · PR` 절에 금지가 다섯 개 있었다. PR 생성 금지, 병합 금지, main·develop 직접 커밋 금지,
`node_modules`·`.next`·`pnpm-lock.yaml` 손대지 않기. 전부 문장이었다. 실제 도구 층은 `.claude/settings.json`의
allow에 `Bash(gh pr:*)`와 `Bash(git push:*)`가 있었고 deny는 비어 있었다. 사후 가드레일은 husky의 lint-staged와
CI(format, lint, types, build)뿐이라, 모델이 다 저지른 뒤에 걸러졌다. 그나마 `gh pr create`는 CI가 볼 수도 없다.

### 무엇이 문제였나

권한 규칙과 훅이 다른 층이라는 걸 정확히 이해하지 못하고 있었다. 워크샵 Ch4 A2와 A3, Ch3 Task 4를 읽고 정리하면
이렇다.

- 권한 규칙(`permissions.allow/ask/deny`)은 도구 호출의 접두어를 문자열로 대조한다. `Bash(gh pr create:*)`는
  명령이 `gh pr create`로 시작할 때 걸린다. deny는 어떤 permission mode(default, acceptEdits, auto, bypassPermissions)보다
  우선한다. 모드는 규칙에 안 걸린 호출의 기본값만 정한다.
- 접두어 대조라 `cd apps && gh pr create`나 `git commit -m x; gh pr merge 3`처럼 복합 명령 뒤에 숨으면 못 본다.
  워크샵도 "래퍼 스트리핑과 복합 명령 우회"를 함정으로 짚는다.
- PreToolUse 훅은 그 빈틈을 메운다. 도구 호출마다 런타임이 예외 없이 실행하는 셸 명령이고, stdin으로
  `{tool_name, tool_input, cwd}` JSON을 받는다. exit 2로 끝내면 호출이 차단되고 stderr가 모델에게 전달된다.
  명령 문자열 전체를 정규식으로 보므로 복합 명령 안의 금지어도 잡는다.
- PostToolUse 훅은 실행 후 피드백이다. exit 2여도 편집이 되돌아가진 않지만 stderr가 모델에게 가서 그 자리에서
  고치는 루프가 생긴다.

즉 세 겹이다. 문서는 판단이 필요한 것, 권한 규칙은 접두어로 확정되는 금지, 훅은 복합 명령까지 보는 금지와 사후 검사.
내 하네스는 첫 겹만 있었다.

### 어떻게 바꿨나

`plugins/plick-harness/hooks/guard.mjs`를 PreToolUse에 걸었다(matcher `Bash|Edit|Write|MultiEdit`). 막는 것은
`gh pr create|merge`, main·develop을 refspec으로 갖는 `git push`, 현재 브랜치가 main·develop일 때의
commit·merge·push·rebase·cherry-pick·reset·revert, `git commit --no-verify`(-n), 그리고 Edit/Write의 대상이
`pnpm-lock.yaml`·`node_modules/`·`.next/`일 때다. 현재 브랜치는 훅 안에서 `git rev-parse --abbrev-ref HEAD`로 읽는다.

훅 자체의 오류(JSON 파싱 실패 등)는 exit 0으로 흘려보낸다. 가드 버그가 세션을 멈추게 하면 사람이 훅을 통째로 끄게
되고 그 순간 모든 규칙이 사라진다. 실패는 열어 두고 stderr에 남긴다.

`.claude/settings.json`에는 deny 13개를 넣었다. `Bash(gh pr create:*)`, `Bash(gh pr merge:*)`,
`Bash(git push origin main:*)`, `Bash(git push origin develop:*)`, `Bash(git push --force:*)`, `Bash(git push -f:*)`,
`Bash(git commit --no-verify:*)`, `Edit/Write(pnpm-lock.yaml)`, `Edit/Write(**/node_modules/**)`,
`Edit/Write(**/.next/**)`. allow의 `Bash(gh pr:*)`는 `view`, `list`, `diff`, `checks`, `status`로 좁혔다.

PostToolUse에는 `.claude/hooks/convention-check.mjs`를 추가했다. 기존 `format.mjs`(Prettier) 다음에 돈다.
`apps/*/app/` 아래 `.ts`·`.tsx`만 보고, 부모 탐색 import(`from "../…"`), barrel(`index.ts`), Tailwind 임의값 색
(`bg-[#fff]`), 인라인 style의 hex 색을 잡는다. px 임의값은 넣지 않았다. `max-w-[480px]`처럼 뼈대 폭에 쓰는 정당한
예외가 8곳 있어서 잔소리가 되면 신뢰를 잃는다. 기존 앱 파일 509개에 훅을 전부 돌려 0건이 걸리는 것을 확인하고 넣었다.
새 규칙이 옛 코드를 갑자기 위반으로 만들지 않아야 편집 때마다 뜨는 지적이 진짜 지적이 된다.

훅은 프로세스 경계로 동작하므로 테스트도 그렇게 짰다. `tests/hooks/*.test.mjs`가 node:test로 훅을 자식 프로세스로
띄우고 stdin JSON을 넣어 exit code를 본다. 25개 케이스. `pnpm test:hooks`로 돌고 CI의 format 다음 단계에 넣었다.
워크샵 Ch2에서 서브에이전트가 찾아낸 "테스트가 실패해도 exit code 0"인 하네스가 생각나서다. 가드레일에도 가드레일이 있어야
한다.

### 여기서 막힌 것

훅을 settings.json에 넣는 순간 이 세션에도 바로 적용됐다. 그리고 첫 실전에서 내 커밋을 막았다.
커밋 메시지 본문에 "PreToolUse 가드 훅(gh pr create/merge, …)"라고 써 놨더니 `\bgh\s+pr\s+(create|merge)\b`가
heredoc 안의 그 글자에 걸린 것이다. 고치려고 python heredoc으로 `s.replace('gh pr create', …)`를 돌렸더니 그것도
같은 이유로 막혔다. 훅이 자기 자신을 고치는 명령을 막는 상황이라 Bash 대신 Edit 도구로 파일을 고쳤다.

수정은 `stripLiterals`다. 검사 전에 heredoc 본문(`<<'EOF' … EOF`)과 따옴표 안 문자열을 걷어낸다. 명령 위치에 있는
토큰만 보겠다는 뜻이다. 대가로 `git push origin "HEAD:main"`처럼 따옴표로 감싼 refspec은 훅이 못 본다. 그건
settings.json의 deny 접두어와 현재 브랜치 검사가 나눠 맡는다. 세 겹이 서로의 빈틈을 메우는 구조가 여기서 실제로 쓰였다.
이 사례를 테스트 4개로 박아 뒀다. 커밋 메시지에 금지어, heredoc에 금지어, python heredoc 안 문자열은 통과하고,
따옴표 밖 `gh pr create`와 `echo done && gh pr merge 3`은 여전히 막힌다.

### 바꾸고 나서

- CLAUDE.md의 금지 다섯 개가 전부 "문서에도 있고 도구도 막는" 상태가 됐다. 문서 쪽 🚫 이모지는 뺐다. 강조로 지키게
  하려던 흔적이라 이제 필요 없다.
- 가드 훅 시험 결과: 차단 케이스 12개 전부 exit 2, 통과 케이스 9개 전부 exit 0, 깨진 JSON은 exit 0으로 열림.
- 컨벤션 훅: 위반 파일에서 3건 검출, 기존 509개 파일 0건.
- harness-eval `func-hook-events` FAIL → PASS, `robust-tests` FAIL → PASS.
- 부수 효과로 `.claude/settings.local.json`에 쌓여 있던 60줄 넘는 일회성 승인 목록(특정 커밋 메시지 전체가 allow에
  들어가 있는 것도 있었다)이 위험 동작에 대해선 의미가 없어졌다. deny가 allow보다 항상 이기기 때문이다.

## 2. be-verify 출력을 JSON 계약으로 고정하고 모델을 지정했다

### 전에는

be-verify는 스웨거 파싱, JWT 민팅, 테스트 유저 생성, curl, DB 대조까지 도구 호출 30회를 흡수하고 "리포트 한 장"을
돌려주는 서브에이전트다. 그 리포트가 자유 산문이었다. 절 제목만 정해 두고 안은 모델이 알아서 썼다. 모델도 지정하지
않아 메인과 같은 모델(Opus급)이 curl과 psql을 두들겼다.

### 무엇이 문제였나

메인이 리포트를 다시 해석해야 했다. "에러: 409 → USER_ALREADY_ONBOARDED"라고 써 있는 줄을 찾아 분기 코드를 짜는 식이다.
정리가 끝났는지도 문장을 읽어야 알았다. 워크샵 Ch5의 `--json-schema`와 캡스톤 6(뉴스룸 렌즈)의 "LLM 출력에 JSON 계약을
걸어 파싱 가능성을 신뢰성으로 바꾼다"는 대목이 그대로 해당됐다. 산문은 누락돼도 티가 안 나고, 스키마는 필드가 빠지면
바로 드러난다.

### 어떻게 바꿨나

`scripts/be-verify/report.schema.json`을 만들고 에이전트 정의의 "리포트 형식" 절을 그 스키마를 따르는 JSON 블록 하나로
바꿨다. 필수 필드는 `endpoint`, `auth`, `blocked`, `swaggerDiffs`, `scenarios`, `cleanup`. `blocked`는 검증을 못 했을 때
이유를 담는 자리라 추측으로 채우는 길을 막는다. `swaggerDiffs`가 빈 배열이면 문서대로였다는 뜻이고, `errors[].code`는
BE 문자열 그대로다. `cleanup.remaining`은 마지막 정리 쿼리의 실제 결과라 0이 아니면 메인이 보고 다시 시킨다.
frontmatter에 `model: sonnet`을 넣었다. curl과 psql을 돌리는 일에 Opus급을 쓸 이유가 없다.

`/wire-api`와 `/web-wire-api` 스킬, `api-integration/data-layer.md`가 리포트를 언급하는 자리를 전부 JSON 필드명으로
바꿨다. "리포트의 스웨거와 다른 점이 실제 계약이다"가 "`swaggerDiffs`가 실제 계약이다"가 됐다.

### 바꾸고 나서

- 메인이 읽는 것이 산문에서 필드가 됐다. `blocked`가 null이 아니면 멈추고, `errors[].code`를 빠짐없이 화면에 반영하라는
  절차가 스킬에 들어갔다.
- 나중에 헤드리스로 돌릴 때 같은 스키마로 검증할 수 있다. 헤드리스 리뷰 스크립트(5절)와 같은 패턴이다.
- 실측 비교는 다음 `/wire-api` 때 남긴다. 이번 세션엔 BE를 띄우지 않았다.

## 3. 하네스를 쟀다

전에는 하네스가 잘 도는지를 결과물(PR)로만 알았다. 하네스 품질을 재는 지표도, 컨텍스트를 얼마나 쓰는지 보는 습관도
없었다. 이번에 세 가지를 쟀고 위 "개선 전 측정"이 그 결과다. 여기엔 개선 후와 지표의 한계를 적는다.

### always-on 컨텍스트

| 항목                             | 전    | 후    |
| -------------------------------- | ----- | ----- |
| 루트 CLAUDE.md                   | 3,638 | 2,677 |
| always-on 합계(저장소 하네스)    | 5,408 | 4,322 |
| apps/CLAUDE.md(디렉터리 진입 시) | 없음  | 1,087 |
| adr-writing 스킬 본문(호출 시)   | 없음  | 874   |

루트에서 약 1,000토큰이 빠져 앱 컨벤션(`apps/CLAUDE.md`)으로 내려갔고, 약 500토큰이 ADR 문체(`adr-writing` 스킬)로
내려갔다. 인프라나 포트폴리오 작업처럼 앱 코드를 안 만지는 세션(최근 ADR 절반이 그렇다)은 그 1,600토큰을 안 낸다.
숫자 자체보다 "어디가 예산을 쓰는지 표로 볼 수 있게 됐다"가 얻은 것이다.

플러그인은 건드리지 않았다. 다만 표를 보고 나면 claude-seo 3,294토큰을 이 저장소에서 계속 낼 이유가 없다는 게 분명하다.
사용자 스코프 설정이라 이 PR에서 끄진 않고 판단을 남긴다. harness-eval도 채점용으로 깔아 둔 게 523토큰을 매 세션 더한다.

### harness-eval quick

| 항목       | 전      | 후      |
| ---------- | ------- | ------- |
| 점수/등급  | 5.5 / F | 5.8 / F |
| basic      | 4/4     | 3/4     |
| functional | 3/4     | 4/4     |
| robust     | 3/5     | 4/5     |
| production | 1/3     | 1/3     |

기대만큼 오르지 않았다. 이유는 지표 쪽에 있다. `basic-command-exists`와 `robust-error-recovery` 두 항목이
`.claude/commands/*.md` 글롭만 본다. 그런데 같은 워크샵의 레퍼런스 2가 "커스텀 커맨드는 이제 `.claude/skills/이름/SKILL.md`가
표준이고 `commands/*.md`는 legacy"라고 말한다. 4절에서 워크샵 말대로 스킬로 옮겼더니 워크샵 채점기가 감점했다.
`robust-error-recovery`는 스킬마다 "막혔을 때" 절을 넣었는데도 commands 폴더가 없으니 FAIL이다. 등급을 올리려고
빈 commands 파일을 두는 건 지표를 속이는 일이라 하지 않았다. 대신 여기 적어 둔다. 지표는 빌려 쓰되 채점 기준은 읽고 써야
한다. `robust-deny-list`가 빈 deny로 PASS였던 것과 같은 교훈이다.

남은 FAIL 중 `prod-e2e-tests`와 `prod-migration-guide`는 이 저장소 성격상 당장 필요 없다고 판단했다.

### 재지 못한 것

세션 시작 컨텍스트의 실측(`/context`), 그리고 `/screen` 한 번에 드는 토큰과 비용의 실측은 이 세션에서 못 했다.
전자는 대화형 커맨드고, 후자는 화면 작업이 없었다. 다음 `/screen` 세션에서 `/cost`를 세 번 찍어 평균을 남기기로 한다.

## 4. 커맨드를 스킬로 옮기고 CLAUDE.md를 디렉터리로 나눴다

### 전에는

`/screen`, `/web-screen`, `/wire-api`, `/web-wire-api`, `/audit`이 `.claude/commands/*.md`에 있었다. 루트 CLAUDE.md
하나가 앱 컨벤션(토큰, import, 레이어 폴더)과 ADR 문체 25줄까지 전부 들고 있었다. `apps/mobile/CLAUDE.md`만 있고
`apps/web/CLAUDE.md`는 없었다.

### 무엇이 문제였나

세 가지다. 첫째, 워크샵 레퍼런스 2 기준으로 commands 폴더는 legacy다. 둘째, 커맨드는 모델이 알아서 부를 수 있었다.
`/wire-api`처럼 티켓과 브랜치를 만드는 절차를 모델이 "이게 맞겠다" 싶어 자동으로 시작하면 안 된다. 셋째, 규칙의 지연
로딩을 스킬 축으로만 하고 디렉터리 축으로는 안 했다. CLAUDE.md는 설정 우선순위와 달리 계층 합산된다. 루트에 있으면
모든 세션이 내고, 하위 디렉터리에 있으면 그 디렉터리 파일을 열 때 로드된다. 앱 컨벤션은 앱 파일을 열 때만 필요하다.

### 어떻게 바꿨나

다섯 커맨드를 `.claude/skills/<이름>/SKILL.md`로 옮기고 frontmatter에 `disable-model-invocation: true`를 넣었다.
사람이 슬래시로 부를 때만 돈다. `/audit`에는 `context: fork`를 더했다. 수백 파일을 읽는 탐색은 포크된 컨텍스트에서
소비되고 메인에는 리포트 경로와 요약만 돌아온다. 워크샵은 `agent: Explore`까지 붙였지만 audit는 리포트 파일을 써야
해서 읽기 전용 에이전트는 못 쓴다. 대신 스킬 안에서 "수정은 여기서 하지 않는다"고 못 박았다.

옮기면서 절차에 두 가지를 더했다. 구현 전에 계획(컴포넌트 분해, 새 파일, 승격 대상)을 한 번 보여주는 단계와,
push 전에 헤드리스 리뷰(5절)를 돌리는 단계다. 워크샵 캡스톤의 superpowers 3단(brainstorm → write-plan 승인 → execute)에서
승인 게이트만 가져왔다. 그리고 스킬마다 "막혔을 때" 절을 넣었다. Jira나 Figma MCP가 안 붙을 때, 빌드가 깨질 때,
가드 훅에 막혔을 때, 헤드리스 리뷰가 인증 오류일 때 무엇을 하고 무엇을 하지 않는지.

CLAUDE.md는 셋으로 나눴다. 루트에는 프로젝트, 구조, 명령어, 하네스 세 겹 설명, Git 절차, 더 읽을 것만 남겼다.
`apps/CLAUDE.md`에 두 앱 공통 컨벤션(스타일, `@/` import, 레이어 폴더)을 내렸다. `apps/mobile/CLAUDE.md`와 새로 만든
`apps/web/CLAUDE.md`는 첫 줄에 `@../CLAUDE.md`로 공통을 import하고 앱 전용 몇 줄만 둔다. 중간 디렉터리 CLAUDE.md가
자동 로드되는지 확신이 없어 import를 겹쳐 뒀다. 둘 중 하나만 동작해도 로드된다.
ADR 문체 25줄은 `adr-writing` 스킬로 뺐다. 루트에는 "세션마다 ADR을 남긴다, 문체는 adr-writing"만 남는다.

### 바꾸고 나서

- 루트 CLAUDE.md 3,638 → 2,677토큰(추정). 앱 컨벤션은 앱 파일을 열 때, ADR 문체는 ADR을 쓸 때만 실린다.
- 다섯 스킬이 모델의 자동 호출 대상에서 빠졌다. `/audit`는 격리 실행이다.
- 스킬 디렉터리는 세션 중에도 감시된다는 걸 확인했다. 심링크를 만들자마자 이 세션의 스킬 목록에 `adr-writing`이 떴다.
- `claude plugin validate .claude/skills`는 심링크를 따라가지 않는다는 경고를 낸다. 실체가 있는 `plugins/plick-harness/skills`를
  따로 검증해 통과시켰다.

## 5. PR 전 헤드리스 리뷰 게이트를 만들었다

### 전에는

하네스가 전부 대화형이었다. PR 본문을 채팅에 써 주면 사용자가 복사해 올리는 절차에 자동 리뷰 패스가 없었다.

### 어떻게 바꿨나

`scripts/review/pr-review.sh`. base(기본 develop)와의 merge-base 이후 diff를 `claude -p`로 리뷰시키고,
`--json-schema`로 `{summary, findings[{severity, title, file, line, reason, suggestion}]}` 형태를 강제한다.
CRITICAL이 하나라도 있으면 exit 1이다. 도구는 `Read, Grep, Glob, Bash(git diff|log|show:*)`만 허용하고
`--max-turns 12`, `--max-budget-usd 1.00`, 벽시계 300초(macOS엔 `timeout`이 없어 perl alarm으로 대체)로 세 겹 잠갔다.
결과는 `.review/latest.json`에 남고 `.gitignore`에 넣었다. 각 커맨드형 스킬의 마지막 단계와 CLAUDE.md `Git · PR`에
"push 전에 돌린다"를 넣었다.

### 여기서 막힌 것

첫 실행에서 두 가지가 깨졌다. `--json-schema`가 스키마 파일의 `$schema: https://json-schema.org/draft/2020-12/schema`를
보고 "no schema with key or ref"라며 거부했다. CLI의 검증기가 그 메타스키마를 모른다. `$schema` 키를 뺐다.
그리고 stdin을 안 닫으면 3초를 기다리는 경고가 나서 `< /dev/null`을 붙였다.

그 다음은 인증이었다. 위에서 적은 그 문제다. 이 세션(데스크톱 앱) 안에서 띄운 CLI는 OAuth가 만료돼 있다. 스크립트는
설계대로 `is_error`를 읽고 exit 3으로 멈추며 이유를 찍었다. 즉 스크립트의 실패 경로는 검증됐고 성공 경로는 터미널에서
`claude login`을 한 뒤에야 볼 수 있다. 스킬의 "막혔을 때"에 이 경우를 넣어 뒀다. 리뷰 없이 진행했으면 PR 본문 검증
절에 그렇게 적는다.

## 6. 하네스를 플러그인으로 묶었다

### 전에는

문체 스킬, PR 틀, 가드 훅이 전부 plick-frontend 저장소 `.claude/`에만 있었다. AppShell 저장소와 BE 저장소에는 같은
규칙이 없다.

### 어떻게 바꿨나

`plugins/plick-harness/`에 `.claude-plugin/plugin.json`, `hooks/hooks.json`(PreToolUse → `${CLAUDE_PLUGIN_ROOT}/hooks/guard.mjs`),
`skills/{doc-style, pr-writing, adr-writing}`을 뒀다. 실체는 플러그인 폴더에 있고 `.claude/skills/`의 세 항목은 거기로
가는 심링크다. `.claude/settings.json`의 PreToolUse도 플러그인 폴더의 guard.mjs를 직접 가리킨다. 한 파일이 두 경로로
쓰인다. 저장소 루트의 `.claude-plugin/marketplace.json`이 이 저장소를 마켓으로 만든다. 다른 저장소에선
`claude plugin marketplace add big-cute-team/plick-frontend` 후 `claude plugin install plick-harness@plick`이다.

로컬 경로를 마켓으로 등록해 `-s local`로 설치해 봤다. `claude plugin details`가 스킬 3개와 PreToolUse 훅 1개, always-on
약 226토큰으로 잡았다. 확인 후 이 저장소에서 이중 로딩되지 않게 바로 제거했다.

### 여기서 막힌 것

심링크가 커밋을 막았다. lint-staged는 pre-commit에서 `git stash`로 원본을 백업하는데, 인덱스에
`.claude/skills/doc-style/SKILL.md`의 삭제(rename의 원본)가 있고 작업 트리의 그 자리에 심링크 디렉터리가 있으니
git이 "beyond a symbolic link"로 거부했다. 이 전환 커밋에만 생기는 문제라 커밋을 둘로 나눴다. 심링크 세 개를 잠시
치우고 나머지를 커밋한 뒤, 심링크를 되돌려 두 번째 커밋으로 넣었다. 두 번째 커밋은 인덱스에 심링크 항목 자체만 있어
문제가 없다. 이전부터 있던 `vercel-react-best-practices` 심링크가 두 달간 문제없던 이유도 같다.

## 리뷰 게이트 실전: 게이트가 게이트를 리뷰하다

사용자가 터미널에서 `claude login`을 하고 나서 `pr-review.sh`의 성공 경로를 실제로 돌렸다. 리뷰 대상이 이 PR, 즉 가드 훅과
리뷰 스크립트 자신이었다. 결과가 예상보다 좋았다. 첫 실행에서 CRITICAL 0, WARN 5, INFO 3을 58초, 약 0.40달러에 돌려줬는데
WARN 다섯 개가 전부 진짜였다.

| 회차 | 소요 | 비용  | WARN | 고친 것                                                                                                                                                                                                                                          |
| ---- | ---- | ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | 58초 | $0.40 | 5    | `\b` 경계 때문에 `feature/KAN-600-develop-tooling` push를 오탐, `git -C . push`·`gh -R o/r pr create` 우회, 테스트가 현재 체크아웃 브랜치에 의존(develop 푸시 CI에서 뒤집힘), develop 테스트가 조용히 skip, 파이썬 예외와 CRITICAL이 같은 exit 1 |
| 2    | 65초 | $0.38 | 4    | 작은따옴표를 먼저 지워 `"it's" … 'x'` 사이 명령이 통째로 사라지는 우회, `-nm`·`-an` 결합 플래그, `git checkout main && git commit` 같은 명령 안 브랜치 전환, 프롬프트 주입 안내                                                                  |
| 3    | 63초 | $0.31 | 4    | heredoc 구분자 뒤 같은 줄 명령이 지워짐, 개행을 구분자로 안 봐 다음 줄 인자가 섞임, `commit && switch -c`처럼 순서가 뒤바뀐 예외, 따옴표로 감싼 refspec                                                                                          |
| 4    | 55초 | $0.27 | 3    | 리뷰어에게 준 `Bash(git diff:*)`가 `--output`으로 파일 쓰기를 여는 문제(diff를 파일로 떠 넘기고 Bash 제거), `HUSKY=0`·`core.hooksPath` 우회, `-uno`(`--untracked-files=no`) 오탐                                                                 |
| 5    | 70초 | $0.37 | 4    | `--no-verif` 같은 긴 옵션 축약형, `git diff --output` 쓰기, audit 스킬의 포크 안 서브에이전트 의존 문구, README 이중 등록 안내                                                                                                                   |

다섯 번에 WARN 20건. 셸을 파싱하지 않고 정규식으로 보는 가드의 빈틈을 리뷰어가 회차마다 새로 찾아냈고, 그때마다 테스트를
붙여 25건이 40건이 됐다. 특히 1회차의 "테스트가 현재 브랜치에 의존한다"는 지적은 내가 못 본 CI 사고였다. 테스트가 `cwd=ROOT`로
훅을 부르면 훅이 저장소의 실제 브랜치를 읽는데, CI는 develop 푸시에서도 돈다. 그 순간 "feature에서 commit은 통과한다" 테스트가
develop 위에서 실행돼 exit 2가 나고 develop CI가 빨개진다. 임시 git 저장소를 만들어 원하는 브랜치를 체크아웃한 cwd를 넘기는 걸로
고쳤다.

4회차 지적도 아팠다. 리뷰어에게 읽기용으로 `Bash(git diff:*)`를 줬는데 `git diff --output=<경로>`는 파일을 쓴다. 접두어 허용의
빈틈이 리뷰어 안에서 그대로 재현된 것이다. diff를 스크립트가 미리 파일로 떠서 프롬프트에 경로를 주고 도구는 Read·Grep·Glob만
남겼다. 같은 이유로 메인 세션의 가드에도 `git diff|log|show --output` 차단을 넣었다.

5회차에서 멈췄다. 남은 지적은 "앞 명령에서 `git config core.hooksPath`를 바꾸고 다음 명령에서 commit", "`bash -c "…"`로 명령을
문자열로 넘기기"처럼 명령 간 상태나 셸 재진입이라 정규식 가드의 범위 밖이다. 파일 상단 주석에 한계로 적었다. 이 층이 못 보는 건
문서 규칙과 리뷰가 맡는다는 게 세 겹의 뜻이다.

리뷰 비용은 회당 1분 안팎, 0.3달러 안팎이었다. PR마다 돌려도 부담이 없는 크기다.

## 포트폴리오 장표

피그마 "포트폴리오 11 하네스 엔지니어링" 장표는 그대로 두고 바로 아래에 "최종" 사본을 만들었다. 디자인과 4절 구성, 분리 전후 막대,
하단 스크린샷은 유지하고 본문만 이번 작업을 반영해 다시 썼다. 개요에 "반드시가 붙는 규칙은 문서가 아니라 권한 규칙과 훅으로,
판단 근거는 체감이 아니라 수치로"를 더했고, 서브 에이전트 절에 JSON 계약과 모델 지정, 지연 로딩 절에 디렉터리 축과 측정값,
마지막 절은 "세 겹 가드레일"로 바꿔 allow 모순 발견, 훅 테스트, 자기 커밋 차단 사례, 리뷰 게이트 20건, 플러그인화를 넣었다.
본문이 길어져 스크린샷 두 장은 0.92배로 줄여 하단에 맞췄다.

## 정리

| 항목           | 전                                | 후                                                                      |
| -------------- | --------------------------------- | ----------------------------------------------------------------------- |
| 금지 동작      | CLAUDE.md 문장, allow에 `gh pr:*` | deny 13개 + PreToolUse 훅, 테스트 25개, CI                              |
| 컨벤션 검사    | 사람 리뷰                         | PostToolUse 훅이 편집 직후 stderr로 지적(509파일 0 오탐)                |
| be-verify 출력 | 자유 산문, 모델 미지정            | report.schema.json JSON, sonnet                                         |
| 측정           | 없음                              | always-on 5,408 → 4,322(추정), 플러그인 비용 표, harness-eval 5.5 → 5.8 |
| 커맨드         | commands/\*.md, 자동 호출 가능    | skills/, disable-model-invocation, audit는 fork                         |
| CLAUDE.md      | 루트 하나 3,638                   | 루트 2,677 + apps/ 1,087(진입 시) + adr-writing(호출 시)                |
| 헤드리스       | 없음                              | pr-review.sh(스키마 고정, 3중 잠금). 성공 경로는 로그인 후 확인         |
| 배포 단위      | 저장소 하나                       | plick-harness 플러그인 + 저장소 마켓                                    |

이번에 가장 크게 배운 건 훅이 자기 자신을 막은 사건이다. "지시는 확률적, 도구는 확정적"이라고 써 놓고, 확정적인 도구가
글자와 명령을 구분하지 못하면 그것대로 일이 멈춘다. 정규식 한 줄짜리 가드도 리터럴을 걷어내는 전처리와 테스트, 그리고
빈틈을 메우는 다른 층이 있어야 신뢰할 수 있다. 세 겹이라고 쓴 건 멋 부린 게 아니라 하루 만에 실제로 필요했던 구조다.

## TODO

- 다음 `/screen` 세션에서 `/cost`를 세 번 찍어 평균 토큰과 비용을 남긴다. `/context`로 세션 시작 컨텍스트 실측도 남긴다.
- claude-seo 플러그인(always-on ~3,294토큰)을 이 계정에서 끌지 판단한다.
- be-verify JSON 계약의 첫 실전 결과를 다음 `/wire-api` ADR에 남긴다.
- 포트폴리오 11쪽 최종본의 문안을 한 번 더 다듬고 옛 장표를 정리할지 정한다.
