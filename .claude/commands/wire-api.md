---
description: 로컬 BE(스웨거) API 하나를 화면에 연결(mock→fetch)하고, 공용화 여부를 ADR 0011 기준으로 판단해 PR까지 올린다
argument-hint: <KAN-티켓번호> [엔드포인트/스코프]
---

너는 PLick의 퍼블리싱된 화면에 로컬 백엔드 API를 **스웨거로 확인하며 하나씩** 연결한다. 인자: `$ARGUMENTS`
(첫 번째 = Jira 티켓 키 `KAN-###`, 두 번째(선택) = 붙일 엔드포인트/화면 스코프)

**반드시 `api-integration` 스킬(+ `data-layer.md`·`tanstack-query.md`)과 `docs/adr/0011-shared-code-boundary.md`를
먼저 읽고 그 규칙을 따른다.** 승격을 실제로 할 땐 `docs/adr/0005-web-home-and-ui-promotion.md` 절차도.

확정된 기본값(스킬 §0): 로컬 BE Spring `localhost:8080`, base는 서버 전용 env `API_BASE_URL`, 타입은 **손 매핑**,
인증 없음(공개 API), **단발 읽기=서버 컴포넌트 fetch / 릴스·뮤테이션=TanStack Query**.

절차:

1. **티켓 + 스웨거로 실제 shape 파악** — 티켓 설명을 믿지 말고 스웨거(`/swagger-ui/index.html` 또는
   `/v3/api-docs`)에서 진짜 응답을 읽는다: path·method·파라미터·요청 body·**응답 필드/타입**·페이지네이션·에러 shape
   (스킬 `data-layer.md` §2).
2. **타입 대조** — 응답 shape를 기존 `_lib/types.ts`(BE 목표 shape)와 맞추고, 다르면 타입을 조정하되
   **web·mobile 양쪽을 같은 모양으로 동기화**한다. 필드명 차이는 데이터 레이어 경계 변환으로 흡수.
3. **브랜치** — `git switch -c feature/<티켓>-<짧은설명> develop`.
4. **데이터 레이어 작성/교체** — `apiFetch` 위에 도메인 fetcher를 `_lib`에 두고(경계 변환 포함), 화면은 소비 형태를
   유지한 채 mock 대신 그 결과를 받게 한다. env(`API_BASE_URL`)·(클라 fetch면)프록시 세팅은 `data-layer.md` §1.
5. **페칭 도구 선택** — 단발 읽기면 서버 컴포넌트 fetch. 릴스 페이지네이션/prefetch·뮤테이션이면 TanStack Query
   (`tanstack-query.md`의 도입 트리거·provider·infinite·낙관적 뮤테이션·하이드레이션). 로딩/에러/빈 상태 토큰 처리.
6. **공용화 판단(핵심)** — 스킬 §3의 게이트 A/B/C로:
   **데이터/타입·fetch 규약은 굳으면 공용, 화면 표현은 앱별, 순수 원자·유틸은 두 번째 쓰이면 공용.**
   첫 API는 앱별로, 두 번째에서 같은 shape면 그때 승격. 애매하면 앱별 유지 + 후보로 기록(조기 추상화 금지).
7. **검증** — **로컬 BE(`localhost:8080`)에 실제로 붙여** 네트워크 탭을 보고 로딩→성공→에러→빈 상태를 밟는다.
   CORS 뜨면 프록시(`/be` rewrites) 확인. 공용 건드렸으면 **양쪽 앱 클린 빌드**. check-types·lint·format:check·CI 통과.
8. **커밋·PR** — 티켓 키 포함, `pnpm format` 후 커밋, push, `gh pr create --base develop`. **병합은 사용자.**

원칙: 엔드포인트 하나 = 작업 하나로 작게. 미확정(인증·revalidate·페이지네이션 계약)은 **추측 말고 사용자에게 확인**
(스킬 §7). 기본값은 앱별·주입이라 되돌리기 싸다 — **확신 설 때만 공용으로 뺀다.** RQ도 **트리거가 설 때만** 도입한다.

ADR을 남길 땐 CLAUDE.md `작업 기록`의 **블로그 회고체**(1인칭·짧게·사람 말투, AI 티 금지)로 쓴다.
