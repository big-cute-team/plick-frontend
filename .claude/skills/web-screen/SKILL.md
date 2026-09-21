---
name: web-screen
description: Jira 티켓 + Figma 노드로 데스크톱 웹 화면 하나를 토큰·공용 컴포넌트 재사용으로 구현하고 PR 제목·본문을 채팅에 건넨다
argument-hint: <KAN-티켓번호> <피그마-node-id-URL>
disable-model-invocation: true
---

너는 PLick 데스크톱 웹(apps/web) 화면을 퍼블리싱한다. 인자: `$ARGUMENTS`
(첫 번째 = Jira 티켓 키 `KAN-###`, 두 번째 = Figma `node-id`가 포함된 design URL)

반드시 `web-publishing` 스킬을 먼저 읽고 그 규칙을 따른다.

## 절차

1. 티켓 파악. Jira에서 해당 티켓을 읽어 요구사항과 완료조건을 정리한다.
2. 디자인 파악. Figma 노드에서 구조, 토큰, 카피를 가져온다.
   `get_metadata`(구조) → `get_variable_defs`(토큰) → 필요 시 `get_design_context`.
   스크린샷보다 JSON 노드와 메타데이터를 우선한다. 데스크톱 프레임 폭과 컨테이너 최대폭을 여기서 확인해 둔다.
3. 재사용 조사. 화면을 쪼개 컴포넌트 목록을 만들고, 각각에 대해
   `packages/ui/src` → `apps/mobile/app/_components` 순으로 기존 구현을 찾는다.
   모바일에 있고 앱 중립적이면 `@plick/ui` 승격 대상으로 표시한다(스킬 §4 절차).
4. 목데이터 먼저. 화면에 필요한 데이터를 `apps/web/app/_types/`와 `_mocks/`에 만든다.
   모바일과 같은 도메인이면 타입 모양을 모바일 `_types/`와 맞춘다.
5. 브랜치. `git switch -c feature/<티켓>-<짧은설명> develop`.
6. 계획 확인. 컴포넌트 분해, 승격 대상, 새 파일 목록을 한 번 보여주고 진행한다.
7. 구현. 승격 대상을 먼저 `@plick/ui`로 옮기고(모바일 import 교체 포함),
   그 위에 토큰 유틸만으로 화면을 작성. 색과 간격 하드코딩 금지, 컨테이너 패턴으로 폭 제한,
   hover/focus-visible 상태 포함, 다크 기준. `convention-check` 훅의 지적은 그 자리에서 고친다.
8. 검증. `pnpm --filter web build`(클린), `@plick/ui`나 tokens를 건드렸으면
   `pnpm --filter mobile build`도. 로컬 dev(:3000) 데스크톱 뷰포트(1280×800+) 스크린샷으로
   피그마와 대조(간격, 정렬, 타이포).
   모바일 반응형 검증 필수: 가로 330px까지 줄여도 레이아웃이 무너지지 않는지 확인한다
   (330px가 최소 기준선, 가로 오버플로 0 = `scrollWidth == innerWidth`, 겹침과 잘림 없음, 스킬 §3의 `lg`
   경계 패턴). 넘치는 가로 목록(팀 필터 탭 등)은 `overflow-x-auto`로 스크롤(스크롤바는 theme.css가 숨김).
   데스크톱만 보고 끝내지 않는다.
   요소를 모바일에서 숨기거나(예: 사이드바) 크게 바꾸는 판단이 필요하면 임의로 정하지 말고
   사용자에게 먼저 물어본다. 단순 재배치나 1열 스택 같은 무너짐 방지의 자명한 조정은 그대로 진행한다.
9. 커밋과 PR 글. 커밋 메시지에 티켓 키 포함, `pnpm format` 후 커밋, push.
   push 전에 `./scripts/review/pr-review.sh`로 헤드리스 리뷰를 한 번 돌리고 CRITICAL이 있으면 먼저 고친다.
   PR은 올리지 않고 제목과 본문(`pr-writing` 스킬의 5절 틀)을 채팅에 쓴다. 사용자가 직접 PR을 만들고 병합한다.

## 원칙

컨텍스트는 얇게(필요한 노드만 읽기), 작게 쪼개기, 피그마를 그대로 재현(근사치 금지).
있는 것을 새로 만들지 않는다. 재사용 조사(3)를 건너뛰지 않는다. 불명확하면 추측하지 말고 사용자에게 확인한다.

ADR을 남길 땐 `adr-writing` 스킬의 회고체로 쓴다.

## 막혔을 때

- Jira나 Figma MCP가 응답하지 않으면 사용자에게 알리고 기다린다. 추정치로 진행하지 않는다.
- 승격 중 모바일 빌드가 깨지면 승격을 되돌리고 web 로컬 복제로 진행한 뒤 후보로만 기록한다.
- 빌드 실패는 원인을 고친다. 타입 무시나 `--no-verify`로 통과시키지 않는다.
- 가드 훅이 차단한 명령은 우회하지 않고 이유를 사용자에게 전한다.
- 헤드리스 리뷰가 인증 오류로 실패하면 `claude login`이 필요하다고 알리고 PR 본문 검증 절에 적는다.
