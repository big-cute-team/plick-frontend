---
name: screen
description: Jira 티켓 + Figma 노드로 모바일 화면 하나를 토큰 기반으로 구현하고 PR 제목·본문을 채팅에 건넨다
argument-hint: <KAN-티켓번호> <피그마-node-id-URL>
disable-model-invocation: true
---

너는 PLick 모바일 화면을 퍼블리싱한다. 인자: `$ARGUMENTS`
(첫 번째 = Jira 티켓 키 `KAN-###`, 두 번째 = Figma `node-id`가 포함된 design URL)

반드시 `screen-publishing` 스킬과 `docs/adr/0002-mobile-home-layout.md`를 먼저 읽고 그 규칙을 따른다.

## 절차

1. 티켓 파악. Jira에서 해당 티켓을 읽어 요구사항과 완료조건을 정리한다.
2. 디자인 파악. Figma 노드에서 구조, 토큰, 카피를 가져온다.
   `get_metadata`(구조) → `get_variable_defs`(토큰) → 필요 시 `get_design_context`.
   스크린샷보다 JSON 노드와 메타데이터를 우선한다.
3. 목데이터 먼저. 화면에 필요한 데이터를 `apps/mobile/app/_types/`와 `_mocks/`에 먼저 만든다.
4. 브랜치. `git switch -c feature/<티켓>-<짧은설명> develop`.
5. 계획 확인. 컴포넌트 분해와 재사용할 조각, 새로 만들 파일 목록을 한 번 보여주고 진행한다.
   화면 하나가 커서 Phase를 나눠야 하면 Phase마다 빌드가 통과한 뒤 다음으로 간다.
6. 구현. `AppShell`/`ScrollArea`(+`TopBar`/`TabBar`) 위에 토큰 유틸만으로 작성.
   재사용 조각은 `_components/`로 뽑고, 색과 간격 하드코딩 금지, 좌우 패딩 `px-edge`, 다크 기준.
   편집 직후 `convention-check` 훅이 위반을 stderr로 돌려주면 그 자리에서 고친다.
7. 검증. `pnpm --filter mobile build`(클린) + 로컬 dev(:3001) 모바일 뷰포트 스크린샷으로
   피그마와 대조(간격, 정렬, 타이포).
8. 커밋과 PR 글. 커밋 메시지에 티켓 키 포함, `pnpm format` 후 커밋, push.
   push 전에 `./scripts/review/pr-review.sh`로 헤드리스 리뷰를 한 번 돌리고 CRITICAL이 있으면 먼저 고친다.
   PR은 올리지 않고 제목과 본문(`pr-writing` 스킬의 5절 틀)을 채팅에 쓴다. 사용자가 직접 PR을 만들고 병합한다.

## 원칙

컨텍스트는 얇게(필요한 노드만 읽기), 작게 쪼개기, 피그마를 그대로 재현(근사치 금지).
불명확하면 추측하지 말고 사용자에게 확인한다.

ADR을 남길 땐 `adr-writing` 스킬의 회고체로 쓴다.

## 막혔을 때

- Jira 티켓을 못 읽으면(권한, 연결 끊김) 티켓 본문을 사용자에게 붙여 달라고 한다. 추측으로 요구사항을 채우지 않는다.
- Figma MCP가 응답하지 않으면 데스크톱 앱에서 파일을 열어 달라고 한다. 스크린샷만으로 수치를 추정해 진행하지 않는다.
- 빌드가 실패하면 원인을 고친 뒤 다시 돌린다. `--no-verify`나 타입 무시로 통과시키지 않는다.
- 가드 훅이 명령을 차단하면(예: `gh pr create`) 우회하지 않고 차단 이유를 사용자에게 전한다.
- 헤드리스 리뷰가 인증 오류로 실패하면 `claude login`이 필요하다고 알리고, 리뷰 없이 진행했음을 PR 본문 검증 절에 적는다.
