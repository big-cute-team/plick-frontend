---
description: 로컬 BE(스웨거) API 하나를 화면에 연결(mock→fetch)하고, 공용화 여부를 ADR 0011 기준으로 판단해 PR까지 올린다
argument-hint: <KAN-티켓번호> [엔드포인트/스코프]
---

퍼블리싱된 화면에 로컬 백엔드 API를 하나씩 연결한다. 인자: `$ARGUMENTS`
(첫 번째는 Jira 티켓 키 `KAN-###`, 두 번째는 선택으로 붙일 엔드포인트나 화면 스코프)

모바일 연결이 끝난 API를 web에 이식하는 작업이면 이 커맨드가 아니라 `/web-wire-api`를 쓴다.

시작 전에 `api-integration` 스킬과 `data-layer.md`, `tanstack-query.md`, `docs/adr/0011-shared-code-boundary.md`를
읽고 그 규칙을 따른다. 승격을 실제로 할 땐 `docs/adr/0005-web-home-and-ui-promotion.md` 절차도 본다.

확정된 기본값은 스킬 §0에 있다. 로컬 BE Spring `localhost:8080`, base는 서버 전용 env `API_BASE_URL`,
타입은 손 매핑, 응답의 `{ code, message, data }` 봉투는 `apiFetch`가 벗김, 인증은 HttpOnly 쿠키를
서버에서 Bearer로 주입, 단발 읽기는 서버 컴포넌트 fetch이고 릴스와 뮤테이션은 TanStack Query.

## 절차

1. 계약 확인은 `be-verify` 서브에이전트에 위임한다. 공개 GET이든 보호 API든 직접 curl과 psql을 두들기지 않는다.
   티켓 키와 엔드포인트를 줘서 맡기면 스웨거 shape 확인, JWT 민팅, 일회용 테스트 유저, curl 시나리오, DB 대조를
   다 밟고 요약 리포트 하나를 돌려준다. 티켓 설명도 스웨거 설명도 믿지 않는다.
   리포트의 "스웨거와 다른 점"이 실제 계약이다(ADR 0025, 0026에서 실제로 틀렸다).
2. 타입 대조. 응답 shape를 기존 `_types/`와 맞추고, 다르면 타입을 조정하되 web과 mobile을 같은 모양으로
   동기화한다. 필드명 차이는 데이터 레이어 경계 변환으로 흡수한다.
3. 브랜치. `git switch -c feature/<티켓>-<짧은설명> develop`.
4. 데이터 레이어 작성이나 교체. `apiFetch` 위에 도메인 fetcher를 `_services/`에 두고 경계 변환도 거기서 한다.
   화면은 소비 형태를 유지한 채 mock 대신 그 결과를 받는다. env와 프록시 세팅은 `data-layer.md` §1.
5. 페칭 도구 선택. 단발 읽기면 서버 컴포넌트 fetch, 릴스 페이지네이션이나 뮤테이션이면 TanStack Query
   (`tanstack-query.md`의 도입 트리거, provider, infinite, 낙관적 뮤테이션, 하이드레이션). 로딩과 에러, 빈 상태도 처리한다.
6. 공용화 판단. 스킬 §3의 게이트 A/B/C를 쓴다. 데이터와 타입, fetch 규약은 굳으면 공용, 화면 표현은 앱별,
   순수 원자와 유틸은 두 번째 쓰이면 공용이다. 첫 API는 앱별로 붙이고 두 번째에서 같은 shape면 그때 승격한다.
   애매하면 앱별로 두고 후보로만 기록한다.
7. 검증은 둘로 갈린다. 계약과 DB(응답 shape가 매핑과 맞는지, 뮤테이션이 DB에 반영되는지, 에러 코드)는
   `be-verify`에 위임한다. 화면(로딩, 성공, 에러, 빈 상태를 브라우저로 밟기)은 직접 한다. 브라우저는 위임하지 않는다.
   CORS가 뜨면 프록시(`/be` rewrites)를 확인한다. 공용을 건드렸으면 양쪽 앱을 클린 빌드하고
   check-types, lint, format:check, CI를 통과시킨다.
8. 커밋과 PR. 티켓 키를 넣고 `pnpm format` 후 커밋, push, `gh pr create --base develop`.
   PR 본문은 `pr-writing` 스킬의 5절 틀을 따른다. 병합은 사용자가 한다.

## 원칙

엔드포인트 하나가 작업 하나다. 작게 유지한다.

미확정 사항(revalidate 전략, 페이지네이션 계약)은 추측하지 말고 사용자에게 확인한다(스킬 §7).

기본값인 앱별과 주입은 되돌리기 싸다. 확신이 설 때만 공용으로 뺀다. TanStack Query도 트리거가 설 때만 도입한다.

ADR은 CLAUDE.md `작업 기록`의 회고체로 쓰고, 문체는 `doc-style` 스킬을 따른다.
