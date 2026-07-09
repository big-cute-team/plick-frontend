---
description: Jira 티켓 + Figma 노드로 모바일 화면 하나를 토큰 기반으로 구현하고 PR까지 올린다
argument-hint: <KAN-티켓번호> <피그마-node-id-URL>
---

너는 PLick 모바일 화면을 퍼블리싱한다. 인자: `$ARGUMENTS`
(첫 번째 = Jira 티켓 키 `KAN-###`, 두 번째 = Figma `node-id`가 포함된 design URL)

**반드시 `screen-publishing` 스킬과 `docs/adr/0002-mobile-home-layout.md`를 먼저 읽고 그 규칙을 따른다.**

절차:

1. **티켓 파악** — Jira에서 해당 티켓을 읽어 요구사항/완료조건을 정리한다.
2. **디자인 파악** — Figma 노드에서 구조·토큰·카피를 가져온다.
   - `get_metadata`(구조) → `get_variable_defs`(토큰) → 필요 시 `get_design_context`.
   - 스크린샷보다 **JSON 노드/메타데이터를 우선**한다.
3. **목데이터 먼저** — 화면에 필요한 데이터를 `apps/mobile/app/_lib/`(types·mock)에 먼저 만든다.
4. **브랜치** — `git switch -c feature/<티켓>-<짧은설명> develop` (develop 기준).
5. **구현** — `AppShell`/`ScrollArea`(+`TopBar`/`TabBar`) 위에 토큰 유틸만으로 작성.
   재사용 조각은 `_components/`로 뽑고, 색·간격 하드코딩 금지, 좌우 패딩 `px-edge`, 다크 기준.
6. **검증** — `pnpm --filter mobile build`(클린) + 로컬 dev(:3001) 모바일 뷰포트 스크린샷으로
   피그마와 대조(간격·정렬·타이포). 다크/라이트 토글 확인.
7. **커밋·PR** — 커밋 메시지에 티켓 키 포함, `pnpm format` 후 커밋, push, `gh pr create --base develop`.
   CI 통과 확인. 병합은 사용자 승인 후.

원칙: 컨텍스트는 얇게(필요한 노드만 읽기), 작게 쪼개기, 피그마를 **그대로** 재현(근사치 금지).
불명확하면 추측하지 말고 사용자에게 확인한다.
