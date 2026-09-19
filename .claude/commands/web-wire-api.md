---
description: 모바일에서 검증된 BE API 하나를 web 화면에 이식(mock→fetch)하고, 두 번째 사용처로서 공용화를 ADR 0011 게이트로 판단해 PR까지 올린다
argument-hint: [KAN-티켓번호] <엔드포인트/화면 스코프>
---

모바일 연결이 끝난 API를 데스크톱 웹(apps/web) 화면에 하나씩 이식한다. 인자: `$ARGUMENTS`
(Jira 티켓 키 `KAN-###`는 있으면 첫 번째로 주고 없으면 생략한다. 나머지는 붙일 엔드포인트나 화면 스코프.)

시작 전에 `api-integration` 스킬과 `web-wiring.md`를 읽고 그 규칙을 따른다. 코드 패턴이 필요하면
`data-layer.md`와 `tanstack-query.md`, 승격 판단은 `docs/adr/0011-shared-code-boundary.md`,
실제 승격 절차는 `docs/adr/0005-web-home-and-ui-promotion.md`를 본다.
화면 작업이 생기면 `web-publishing` 스킬을 따른다.

## 절차

1. 계약 파악. 같은 엔드포인트를 붙인 모바일 코드(`apps/mobile/app/_services/`, `_types/`,
   `_constants/api.ts`)와 해당 ADR(0030~0046)을 읽는다. 이게 검증된 계약이다.
   `be-verify` 서브에이전트는 `web-wiring.md` §1의 조건(새 엔드포인트, BE 변경 정황, DB 재확인)일 때만 부른다.
2. 승격 판단. 이번 엔드포인트가 쓰는 조각(계약 타입, fetcher, 매핑 상수, `apiFetch`, 쿼리키)을
   `web-wiring.md` §2 후보 목록과 대조해 게이트 A/B/C로 정한다. web이 두 번째 사용처라 이 판단이 본편이다.
   승격이면 이동과 모바일 import 교체까지 같은 PR에서 한다. 애매하면 web 로컬 복제로 두고 후보로 기록한다.
3. 브랜치. 티켓이 있으면 `git switch -c feature/KAN-<번호>-<짧은설명> develop`,
   없으면 `git switch -c feature/web-<짧은설명> develop`.
4. 데이터 레이어. 승격분은 패키지에서 import하고, 앱 전용분은 web `_apis/`와 `_services/`에 둔다.
   첫 연결이면 `web-wiring.md` §3의 인프라(rewrites, env)를 같이 깐다.
5. 화면 교체. mock import를 fetcher로 바꾸고 컴포넌트 props 타입을 실계약 타입으로 갈아탄다
   (`FeedPost` 소비처 정리는 `web-wiring.md` §2와 §4). 다 쓴 목데이터는 그 PR에서 지운다.
   로딩과 에러, 빈 상태를 처리한다. 페칭 도구는 스킬 §0 표대로 서버 fetch와 TanStack Query를 가른다.
6. 검증. 계약은 모바일과 같은 코드를 쓰는 것으로 갈음하되, 화면은 dev(:3000)에서 직접 밟는다.
   로딩, 성공, 에러, 빈 상태와 반응형(데스크톱 1280 기준, 330px까지)을 본다. 공용 패키지를 건드렸으면
   `pnpm --filter web build`와 `pnpm --filter mobile build`를 둘 다 돌리고 check-types, lint, format:check를 통과시킨다.
7. 커밋과 PR. 티켓이 있으면 커밋 메시지에 Jira 키를 넣고 없으면 뺀다. `pnpm format` 후 커밋, push,
   `gh pr create --base develop`. PR 본문은 `pr-writing` 스킬의 5절 틀을 따른다.
   CI 통과까지 확인한다. 병합은 사용자가 한다.

## 원칙

엔드포인트 하나가 작업 하나다. 작게 유지한다.

화면 동작은 모바일과 최대한 같게 맞춘다. 다르게 갈 이유가 생기면 사용자에게 확인한다.

미확정 사항은 추측하지 않는다. myTeams 화면 구성, 계약 공백 mock(`NOTIF_COUNT`, `TRENDING_POSTS`) 처리,
요소를 모바일 뷰에서 숨길지 판단은 사용자에게 묻는다.

ADR은 CLAUDE.md `작업 기록`의 회고체로 쓰고, 문서는 `doc-style` 스킬을 따른다.
