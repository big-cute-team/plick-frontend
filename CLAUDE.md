# CLAUDE.md - PLick 프론트엔드

어떤 작업이든 반드시 알아야 할 최소한만 여기 둔다.
앱 코드 컨벤션은 `apps/CLAUDE.md`에 있고 앱 파일을 열면 자동으로 로드된다.
제품과 기술 세부는 필요할 때 아래 "더 읽을 것"에서 골라 읽는다.

## 프로젝트

해축이모(구 PLick)는 프리미어리그 이적 루머와 이슈를 모아 보는 앱이다. 모바일 우선. 저장소 이름과 도메인은 plick을 유지한다.
pnpm과 Turborepo 모노레포이고 스코프는 `@plick/*`.

## 구조

```
apps/
  mobile/   Next 모바일 웹 (dev :3001)  ← 현재 주력
  web/      Next 데스크톱 웹 (dev :3000)
  CLAUDE.md 두 앱 공통 컨벤션(토큰, import, 레이어 폴더)
packages/
  tokens/             @plick/tokens - 디자인 토큰(theme.css)
  ui/                 @plick/ui - 공용 컴포넌트
  domain/             @plick/domain - 도메인 타입·팀 레지스트리·포맷 유틸 (web/mobile 공용)
  eslint-config/      @plick/eslint-config
  typescript-config/  @plick/typescript-config
plugins/
  plick-harness/      팀 하네스 플러그인(doc-style·pr-writing·adr-writing 스킬, Git 가드 훅). .claude/가 심링크로 쓴다
scripts/
  be-verify/          로컬 BE 검증 도구 (JWT 민팅·공유 DB psql·리포트 스키마)
  review/             PR 전 헤드리스 리뷰 게이트
  e2e/                E2E 실패 묶음 변환(bundle.mjs)과 치유 에이전트(heal.sh)
tests/hooks/          훅 회귀 테스트 (pnpm test:hooks, CI 포함)
tests/e2e/            배포된 dev를 타는 Playwright QA 자동화 (@plick/e2e, PR 게이트 아님)
```

## 명령어 (루트에서)

```bash
pnpm install            # 의존성 설치 (+husky)
pnpm dev                # web+mobile 동시 (개별: pnpm --filter mobile dev)
pnpm build              # 전체 빌드
pnpm lint               # ESLint
pnpm check-types        # 타입 검사
pnpm format             # Prettier 적용 (확인만: format:check)
pnpm test:hooks         # Claude Code 훅 회귀 테스트
pnpm test:e2e           # 배포된 dev 상대 E2E (화면 보며: pnpm --filter @plick/e2e test:ui)
```

## 컨벤션

앱 코드 규칙(디자인 토큰만 쓰기, `px-edge`, 다크 고정, 네이밍, JSDoc, `@/` 절대경로, 레이어 폴더, barrel 금지,
`@plick/domain` 단일 출처)은 `apps/CLAUDE.md`에 있다. 기계로 판정되는 항목은 `convention-check` 훅이
편집 직후 잡아 준다.

## 하네스

규칙은 세 겹이다. 문서(CLAUDE.md, 스킬)는 판단이 필요한 것을, 권한 규칙(`.claude/settings.json`의 deny)은
접두어로 확정되는 금지를, 훅(`plugins/plick-harness/hooks/guard.mjs`, `.claude/hooks/convention-check.mjs`)은
복합 명령까지 정규식으로 보는 금지와 편집 직후 검사를 맡는다. "반드시"가 붙는 규칙은 문서에만 두지 않는다.
훅을 고치면 `tests/hooks/`도 같이 고치고 `pnpm test:hooks`를 돌린다.

커맨드형 스킬(`/screen`, `/web-screen`, `/wire-api`, `/web-wire-api`, `/audit`, `/e2e`)은 사람이 부를 때만 돈다
(`disable-model-invocation`). `/audit`는 격리 컨텍스트(fork)에서 돌아 리포트 경로와 요약만 돌아온다.

## 규칙 기록

새 컨벤션이나 작업 방식 피드백은 개인 메모가 아니라 저장소에 기록해 팀 전체 클로드에 적용한다.

팀 공통 규칙(Git 절차, 하네스)은 이 CLAUDE.md에, 앱 코드 규칙(주석 스타일, 네이밍, import, 폴더)은
`apps/CLAUDE.md`에 추가한다. 기계로 판정되는 규칙이면 `convention-check.mjs`에 검사도 넣고 테스트를 붙인다.

화면 퍼블리싱 세부 규칙(아이콘 벡터, 토큰 사용법, 레이아웃 패턴)은 모바일이면 `screen-publishing`,
데스크톱 웹이면 `web-publishing` 스킬에 추가한다. 분량이 크면 스킬 폴더 안에 별도 파일을 만들고
SKILL.md에서 가리킨다.

이런 피드백을 받으면 알아서 위 위치에 반영하고 커밋에 포함한다.

## 문서 문체

CLAUDE.md와 `.claude/` 아래 스킬·서브에이전트, README, PR 본문, 코드 주석은 `doc-style` 스킬을 따른다.
볼드 강조와 em dash를 쓰지 않고 필수만 남겨 컴팩트하게 쓴다.

PR 본문은 문체에 더해 `pr-writing` 스킬의 5절 틀(구현 사항 / 문제 상황 / 해결 방법 / 검증 / TODO)을 쓴다.

`docs/` 아래는 정반대다. 아래 `작업 기록`을 따른다.

## 작업 기록 (세션 단위 ADR)

한 작업 세션에서 의미 있는 구현이나 리팩터, 결정을 하면 반드시 `docs/adr/`에 그 세션의 ADR을 남긴다.
세션을 시작하면 새 ADR 파일 하나를 만들고(`docs/adr/000N-<짧은-설명>.md`), 세션 중 변경은 그 파일에 이어 붙인다.
같은 PR이나 브랜치 작업은 같은 ADR이다.

문체와 분량, 구성은 `adr-writing` 스킬을 따른다. 포트폴리오 블로그 회고체이고, 시행착오와 메커니즘을 끝까지 쓴다.

## Git · PR

`main`과 `develop`에 직접 커밋하지 않는다. `develop`에서 `feature/KAN-<번호>-<설명>` 브랜치를 딴다.

커밋 메시지에 Jira 키(`KAN-###`)를 넣어 이슈를 자동 연결한다.

PR base는 `develop`이다.

PR은 클로드가 올리지 않는다. 커밋과 push까지 하고, PR 제목과 본문을 채팅에 그대로 써 준다.
사용자가 그걸 복사해 직접 PR을 만든다. 제목은 커밋 첫 줄, 본문은 `pr-writing` 스킬의 5절 틀이다.
push 전에 `./scripts/review/pr-review.sh`로 헤드리스 리뷰를 한 번 돌리고 CRITICAL이 있으면 먼저 고친다.
CI(format:check, test:hooks, lint, check-types, build)는 로컬에서 같은 명령을 돌려 미리 확인한다.

`main`은 릴리스용이다. `develop`에서 `main`으로 병합하는 건 사용자가 직접 한다. 병합은 클로드가 하지 않는다.

`gh pr create`, `gh pr merge`, main·develop 직접 push와 commit, `git commit --no-verify`,
`pnpm-lock.yaml`·`node_modules`·`.next` 편집은 권한 deny와 가드 훅이 도구 호출 시점에 막는다.
차단되면 우회하지 않고 사용자에게 이유를 전한다.

환경은 Node 22(`.nvmrc`)와 pnpm 9다.

## 더 읽을 것 (필요할 때만)

- 배포와 운영(재배포, 롤백, 환경변수, 자주 막히는 곳): 현행은 v2
  [docs/deploy-v2.md](docs/deploy-v2.md)다(ASG + CodeDeploy Blue/Green, 운영 절차는 §14).
  판단 근거는 [ADR 0067](docs/adr/0067-deploy-v2-plan.md)과
  [ADR 0068](docs/adr/0068-deploy-v2-groundwork.md).
  [docs/deploy.md](docs/deploy.md)는 v1 기록이지만 ALB·대상 그룹·ACM·Route 53 기반은
  v2가 그대로 물려받았다([ADR 0059](docs/adr/0059-mobile-ec2-deploy.md),
  [ADR 0064](docs/adr/0064-private-ec2-ssm-deploy.md)).
  환경은 dev/prod 두 벌이다: develop 푸시 → dev(dev.plick.co.kr·dev-m.plick.co.kr),
  main 푸시 → prod(plick.co.kr·m.plick.co.kr). 리소스 이름과 경위는
  [ADR 0084](docs/adr/0084-prod-vpc-frontend-stack.md).
  `API_BASE_URL`은 빌드 시점에 산출물로 굳는다
- 정적 자산 CDN 분리(CloudFront + S3): [docs/deploy-v3-cdn.md](docs/deploy-v3-cdn.md),
  판단 근거는 [ADR 0081](docs/adr/0081-cdn-static-split-plan.md). 적용돼 있고 버킷은
  환경별 `plick-static-dev`·`plick-static-prod`다
- 모니터링(프로메테우스 + 그라파나, prod): [docs/monitoring.md](docs/monitoring.md). 앱은
  `instrumentation.ts`가 별도 포트(mobile 9464, web 9465)에 `/metrics`를 열고, 모니터링 EC2는
  `infra/monitoring/`을 user data로 실어 올린다. 판단 근거는
  [ADR 0130](docs/adr/0130-prometheus-grafana-monitoring.md)
- 하네스 2차 정비(사전 차단 훅, 권한 deny, be-verify JSON 계약, 측정, 스킬 이전, 헤드리스 리뷰, 플러그인화)의
  전후 비교와 판단: [ADR 0168](docs/adr/0168-harness-guardrails-second-pass.md)
- 해축이모 리디자인(라이트 토큰, Noto Sans KR, 브랜드 교체, 두 앱 전 화면)의 판단과 시행착오:
  [ADR 0171](docs/adr/0171-haechukimo-redesign.md). 시안 원본은 핸드오프 폴더라 저장소에 없다
- 레이어 폴더 구조의 배경과 판단: [ADR 0029](docs/adr/0029-layered-architecture-restructure.md)
- 모바일 화면과 컴포넌트 구현: `screen-publishing` 스킬 + [ADR 0002](docs/adr/0002-mobile-home-layout.md)
- 데스크톱 웹(apps/web) 화면과 컴포넌트 구현: `web-publishing` 스킬(`@plick/ui` 승격 절차 포함)
  - [ADR 0005](docs/adr/0005-web-home-and-ui-promotion.md): 웹 홈, 공용 컴포넌트 승격, 데스크톱 토큰,
    Tailwind 토큰 충돌 교훈
- 무엇을 공통으로 뺄지 판단하는 모노레포 공용 경계: [ADR 0011](docs/adr/0011-shared-code-boundary.md).
  web과 mobile 조각을 `@plick/ui`나 토큰으로 승격할지 앱별로 둘지의 기준과 근거, 리스크.
  승격 절차 자체는 ADR 0005에 있다.
- BE API 연결(mock에서 fetch로): `api-integration` 스킬 + `/wire-api`(모바일), `/web-wire-api`(웹 이식).
  계약 확인과 검증은 `be-verify` 서브에이전트가 맡고 `scripts/be-verify/report.schema.json` 형태의
  JSON 리포트를 돌려준다. 웹 이식은 모바일 코드가 검증된 계약이라 스킬의 `web-wiring.md`를 따른다.
  단발 읽기는 서버 컴포넌트 fetch, 릴스와 뮤테이션은 TanStack Query. 공용화는 ADR 0011 게이트로 판단한다.
- 문서 문체: `doc-style` 스킬. ADR 문체: `adr-writing` 스킬
- PR 본문 틀(구현 사항 / 문제 상황 / 해결 방법 / 검증 / TODO): `pr-writing` 스킬
- 제품과 UX, 데이터 모델, 화면 IA 전반: [docs/handoff.md](docs/handoff.md)
- 개발 도구(Prettier, Husky, CI) 결정 배경: [ADR 0001](docs/adr/0001-dev-tooling-setup.md)
- 화면 하나를 티켓과 피그마로 구현: 모바일은 `/screen`, 데스크톱 웹은 `/web-screen`
- 코드베이스 전수 감사(중복, 배치, 컨벤션 리스트업): `/audit`(`code-audit` 스킬)
- 하네스를 다른 저장소에 설치: `plugins/plick-harness/README.md`
- E2E QA 자동화(배포된 dev 대상, 실패 리플레이, 치유 에이전트): [tests/e2e/README.md](tests/e2e/README.md),
  판단 근거는 [ADR 0169](docs/adr/0169-e2e-qa-automation.md). dev 배포 뒤와 매일 아침 `E2E` 워크플로우가
  돌고 PR은 막지 않는다. 깨지면 `node scripts/e2e/bundle.mjs`로 묶음을 만들고 `./scripts/e2e/heal.sh`가
  tests/e2e만 고친다. 시나리오는 `/e2e <mobile|web> <의도>`로 만든다(`tests/e2e/tools/explore.mjs`로 실제
  화면을 확인하고 spec을 쓴다)
