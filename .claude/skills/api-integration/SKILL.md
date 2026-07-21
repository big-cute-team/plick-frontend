---
name: api-integration
description: >-
  PLick에서 퍼블리싱 끝난 화면에 로컬 백엔드(스웨거) API를 하나씩 붙일 때(mock→fetch 교체) 따르는 규칙.
  스웨거로 실제 응답 shape 확인 → 도메인 타입에 손으로 매핑 → 데이터 레이어(_lib) 배치 →
  서버 컴포넌트 fetch(기본) / TanStack Query(릴스·뮤테이션) → 로딩·에러·빈 상태 →
  무엇을 공용(@plick/*)으로 뺄지 ADR 0011 기준 판단. Use when connecting backend APIs,
  replacing mock data with fetch, reading a Swagger/OpenAPI spec, wiring endpoints into
  apps/web or apps/mobile, aligning response types, choosing server fetch vs TanStack Query,
  or deciding whether shared data/types should be promoted to a package.
---

# BE API 연결 (mock → fetch, 스웨거 보며 하나씩)

로컬에 뜬 백엔드를 **스웨거로 확인하며 엔드포인트를 하나씩** 화면에 붙인다. 이 스킬이 잡는 건 넷이다:
**(1) 스웨거 응답을 실제로 읽고 도메인 타입에 맞추기**, **(2) mock을 fetch로 안전하게 갈아끼우기**,
**(3) 서버 fetch냐 TanStack Query냐를 표면 성격으로 가르기**, **(4) web·mobile 공통을 언제·무엇을 공용으로 뺄지**.

세부 코드 패턴은 두 참조 파일에 있다 — 읽고 그대로 따른다:

- **[data-layer.md](data-layer.md)** — env·프록시 세팅, `apiFetch` 클라이언트, 도메인 fetcher, 경계 변환, 서버 컴포넌트 교체, 스웨거 읽는 법, 로컬 BE로 검증(CORS 포함).
- **[tanstack-query.md](tanstack-query.md)** — RQ를 **언제** 도입하는지 + provider·쿼리키·무한스크롤/prefetch(릴스)·낙관적 뮤테이션·서버→클라 하이드레이션.

배경: [ADR 0011 공용 경계](../../docs/adr/0011-shared-code-boundary.md), [ADR 0005 승격 절차](../../docs/adr/0005-web-home-and-ui-promotion.md).

---

## 0. 확정된 아키텍처 결정 (KAN-249 — 이걸 기본으로 박는다)

이 프로젝트의 첫 API 연결에서 아래를 확정했다. 다르게 갈 이유가 생기면 사용자에게 확인하고 이 절을 고친다.

- **로컬 BE**: Spring, `http://localhost:8080`. 스웨거 UI `…/swagger-ui/index.html`, 스펙 JSON `…/v3/api-docs`.
- **base URL**: 서버 전용 env `API_BASE_URL`(클라 노출 X). 클라 fetch가 생기면 Next `rewrites`로 same-origin
  `/be/*` 프록시를 깔아 **CORS를 없애고** base를 한 곳에 둔다 → [data-layer.md](data-layer.md) §1.
- **타입**: **손으로 도메인 타입에 매핑.** 코드젠(openapi-typescript) 안 쓴다. 스웨거 응답 → 기존
  `_lib/types.ts`(`FeedPost`·`Comment` 등)로 경계에서 변환. BE 필드명이 화면 관용과 다르면 데이터 레이어에서 흡수.
- **인증**: **아직 없음(공개 API부터).** 토큰 주입 지점만 `apiFetch`에 봉합(seam)으로 남긴다 — 인증 붙을 때 그 자리만 채운다(§7).
- **페칭 방식(핵심 분기)**: 아래 표대로 표면 성격으로 가른다.

### 페칭: 서버 fetch가 기본, 릴스·뮤테이션만 TanStack Query

| 표면                                  | 성격                   | 도구                                                 |
| ------------------------------------- | ---------------------- | ---------------------------------------------------- |
| 홈 피드 첫 로드, 상세 요약, MY 프로필 | 한 번 읽고 렌더 끝     | **서버 컴포넌트 fetch** (의존성 0, 지금 구조 그대로) |
| 릴스 다음 페이지 prefetch·무한스크롤  | 클라에서 계속 이어짐   | **TanStack Query**                                   |
| 좋아요·투표·댓글                      | 낙관적 업데이트 + 롤백 | **TanStack Query**                                   |

- 갈리는 기준 한 줄: **"클라에서 이어지느냐."** 단발 읽기는 서버, 이어지는 읽기·쓰기는 RQ.
- 둘이 만나는 릴스는 **서버가 1페이지 fetch → `HydrationBoundary`로 RQ에 심어** 클라가 이어받는다(이중 페치 없음).
- **타이밍**: RQ를 지금 깔지 말고, **처음으로 "클라 연속/뮤테이션"이 필요한 엔드포인트**(릴스 페이지네이션 or 첫 좋아요)
  에서 도입한다. 그 전 단순 GET은 서버 fetch로. 조기 의존성도, 나중 대공사도 둘 다 피한다 → 트리거·패턴은 [tanstack-query.md](tanstack-query.md).

---

## 1. 왜 이 단계가 특별한가

퍼블리싱 때는 각 앱 `_lib/mock.ts`가 화면에 데이터를 먹였다(타입은 `_lib/types.ts` = **BE 목표 shape**).
BE가 붙으면 그 mock을 실제 응답으로 교체한다. 이때 **도메인 데이터의 모양이 처음으로 굳으므로**,
"무엇을 공용으로 뺄지"를 판단하기 딱 좋은(그리고 처음으로 정당한) 시점이다 — [ADR 0011 게이트 C](../../docs/adr/0011-shared-code-boundary.md).

지금 소비 패턴은 깔끔하다: 페이지(서버 컴포넌트)가 `HOT_POSTS`/`POSTS` 같은 mock을 import해 `_components`에 props로
내려준다. 교체는 **공급원만 바꾸는 일** — `import { HOT_POSTS }` → `const posts = await getPosts()`(§4).

---

## 2. 순서 (엔드포인트 하나 = 작업 하나 = PR 하나)

1. **티켓 + 스웨거로 실제 shape 파악** — 티켓 설명을 **믿지 말고** 스웨거에서 진짜 응답을 읽는다:
   path·method·path/query 파라미터·요청 body·**응답 필드와 타입**·페이지네이션 모양·에러 shape.
   ([data-layer.md](data-layer.md) §2 — 스웨거 UI 또는 `/v3/api-docs` JSON).
2. **응답 shape ↔ 도메인 타입 대조** — 스웨거 응답을 기존 `types.ts`와 맞춘다.
   - 같으면 그대로. 다르면 **타입을 BE에 맞춰 조정**하고 **web·mobile 양쪽 `types.ts`를 같은 모양으로** 동기화(수동 계약).
   - BE 필드명이 화면 관용과 다르면 **경계에서 변환**(`view_count → views`). 변환은 데이터 레이어에서.
3. **데이터 접근 레이어 작성** — `apiFetch` 위에 도메인 fetcher를 `_lib`에 둔다(`getPosts.ts` 등). 경계 변환도 여기.
   화면 컴포넌트는 **소비 형태를 그대로 유지**하고 mock 대신 이 레이어 결과를 받는다([data-layer.md](data-layer.md) §3~4).
4. **페칭 도구 선택** — §0 표. 단발 읽기 → 서버 fetch. 릴스/뮤테이션 → RQ([tanstack-query.md](tanstack-query.md)).
5. **로딩/에러/빈 상태** — §5. mock의 "항상 성공·즉시"에 속지 말 것.
6. **공용화 판단** — §3. 이 PR에서 뺄지, 후보로만 기록할지 결정.
7. **검증** — 로컬 BE(`localhost:8080`)에 **실제로 붙여** 로딩→성공→에러→빈 상태를 밟는다([data-layer.md](data-layer.md) §5).
   공용(타입/패키지) 건드렸으면 양쪽 앱 클린 빌드.
8. **커밋·PR** — 티켓 키 포함, `develop` 기준 브랜치, CI 통과. **병합은 사용자.**

---

## 3. ⭐ 공용화 판단 — 이 스킬의 핵심

BE를 붙이며 "web·mobile이 같은 걸 쓰네"가 보일 때, **바로 빼지 말고** 아래 규칙으로 나눈다.

### 3-1. 무엇을 어디로 (종류가 기준이다)

| 종류                                                                 | 어떻게                                                                                                                                 | 왜                                                                                      |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **데이터/타입** (응답 shape, `FeedPost`·`Comment`, 팀 레지스트리 등) | BE 확정 + 양쪽이 같은 모양이면 → **공용 승격 검토**(`@plick/types`/`@plick/core` 신설). "수동 동기화"를 **단일 정의 + 양쪽 import**로. | BE가 모양을 정하므로 이때 굳는다. 굳은 계약은 한 곳에 두는 게 드리프트를 막는다.        |
| **화면 표현** (`ArticleBody`·리스트·시트 등)                         | **앱별 유지.** BE 붙어도 안 뺀다.                                                                                                      | 스케일·인터랙션(hover vs active)·레이아웃이 web/mobile에서 다르다. 합치면 variant 폭발. |
| **순수 원자·유틸** (아이콘·썸네일·배지, `formatCount`)               | BE와 무관하게 **두 번째로 쓰이면 언제든** `@plick/ui`로.                                                                               | 도메인이 없어 굳을 걸 기다릴 필요가 없다.                                               |
| **fetch 인프라** (`apiFetch` 래퍼, RQ provider·쿼리키 규약)          | 첫 앱은 앱별 `_lib`. **두 번째 앱이 같은 규약을 쓰면** `@plick/core`로 승격 검토.                                                      | 데이터/타입과 같은 성숙도 게이트를 탄다. 첫 앱에서 미리 빼지 않는다.                    |

> 한 줄: **데이터·fetch 규약은 굳으면 공용, 표현은 앱별, 원자는 두 번째 쓰이면 공용.**

### 3-2. 승격 게이트 (ADR 0011) — 셋 다 통과해야 뺀다

- **A. 앱 역참조 금지(hard)** — 패키지가 `@/_lib/…`·라우트·`TEAMS`를 내부 조회하면 실격. 못 끊으면 승격 불가,
  끊으려면 **값을 prop로 주입**(예: `MediaThumb`은 `TeamCode`가 아니라 `colorVar`를 받음).
- **B. 동일성** — 두 앱에서 스케일·인터랙션·레이아웃이 **정말 같은가.** 갈리면 앱별.
- **C. 성숙도** — **두 번째 실사용처가 이미 있고** 모양이 굳었는가. BE로 shape가 확정된 지금이 이 관문이 서는 때.

### 3-3. 타이밍 — 첫 API는 앱별, 두 번째에서 공용

엔드포인트를 **하나씩** 붙이며 **첫 앱에선 그냥 앱별로** 붙인다. 두 번째 앱에서 **같은 shape를 또 쓰게 될 때**
"이건 공용" 하고 올린다. 첫 번째부터 "언젠가 공유하겠지"로 미리 빼지 않는다(조기 추상화 방지).

### 3-4. 확신 안 서면 앱별로 두고 "후보"로 기록

기본값(앱별·주입)은 **되돌리기 싸다.** 애매하면 승격하지 말고 ADR 0011 §7 열린 후보 목록에 한 줄 남긴다.
근거가 필요하면 추측 말고 `/audit`(code-audit)으로 진짜 중복인지 확인 후 결정.

---

## 4. mock → fetch 교체가 쉬운 이유 (설계 유지)

화면은 **mock을 "데이터"로만 소비**하도록 짜여 있다(props로 받아 렌더). 그래서 교체는 **공급원만 바꾸는 일**이다.

- 서버 컴포넌트는 페이지/레이아웃에서 데이터 레이어를 `await`해 자식에 내려준다
  (`import { HOT_POSTS } from "@/_lib/mock"` → `const posts = await getHotPosts()`).
- **필요 없어진 목데이터는 그 PR에서 바로 지운다(사용자 확정 규칙, KAN-264).** 화면이 실제 데이터를 받게 됐으면
  그 화면에 목을 흘리던 import·초기값을 남기지 않는다 — "임시로 남겨두기" 금지. 실제 초기값이 아직 다른 미연동
  API(예: `GET /users/me`의 자동 닉네임) 몫이면 목으로 때우지 말고 **빈 값으로 시작**시키고 그 API 티켓에서 채운다.
  `mock.ts` 파일 자체는 아직 다른 미연동 화면이 쓰는 동안만 남는다 — 마지막 소비자가 사라지면 파일도 제거.
- 타입은 이미 BE 목표 shape라 대개 그대로. 필드 차이는 §2-2 경계 변환으로 흡수.

구체 코드(서버 컴포넌트 교체 diff, 도메인 fetcher 골격) → [data-layer.md](data-layer.md) §4.

---

## 5. 로딩·에러·빈 상태 (퍼블리싱엔 없던 것)

mock은 항상 성공·즉시였지만 fetch는 아니다. 화면마다 **세 상태**를 토큰으로 처리한다:

- **로딩**: 서버 fetch는 Next `loading.tsx`(라우트) 또는 Suspense. RQ는 `isPending`. 스켈레톤은 `bg-elevate`/`bg-media` 토큰.
- **에러**: 서버는 `error.tsx` 또는 분기. RQ는 `isError`. 재시도 버튼은 기존 버튼 토큰 재사용.
- **빈 상태**: 홈 `NewsFeed`의 "아직 이 팀 소식이 없어요"(`text-text-4`) 같은 기존 패턴을 따른다.

하드코딩 색/문구 금지 — 색은 토큰, 문구는 화면 카피 규칙대로.

---

## 6. 검증

- **로컬 BE에 실제로 붙여 확인** — dev(`pnpm --filter mobile dev`) + `localhost:8080` BE. 네트워크 탭으로 요청/응답을
  직접 보고 로딩→성공→에러→빈 상태를 밟는다(mock 즉시성에 속지 말 것). CORS·프록시 → [data-layer.md](data-layer.md) §5.
- **양쪽 앱 클린 빌드** — 공용(타입/패키지)을 건드렸으면 `pnpm --filter web build` + `pnpm --filter mobile build` 둘 다(회귀).
- **타입/린트** `pnpm check-types`, format:check·lint, CI 통과.

---

## 7. ⚠️ 아직 열린 항목 (생기면 사용자에게 확인 후 이 스킬에 확정)

- **인증** — 지금은 공개 API. 토큰이 생기면 `apiFetch` 봉합점에 주입(저장 위치·헤더 vs 쿠키). **자격증명 처리는 사용자 몫**
  (직접 입력·저장 금지 규칙 준수). → [data-layer.md](data-layer.md) §6.
- **재검증(revalidate) 전략** — 서버 fetch의 `next.revalidate`/`cache` 값은 엔드포인트별 신선도 요구가 나오면 확정.
- **페이지네이션 계약** — 릴스·피드가 cursor냐 offset이냐, 응답의 `hasNext`/`nextCursor` 필드명. 스웨거에서 확인해 [tanstack-query.md](tanstack-query.md)에 맞춘다.
- **공용 타입 패키지 신설**(`@plick/types`/`@plick/core`) — 두 번째 앱이 같은 shape를 쓸 때 §3 게이트로 판단.

불명확하면 **추측하지 말고 사용자에게 확인한다.**

---

## 참고

- [data-layer.md](data-layer.md) · [tanstack-query.md](tanstack-query.md) — 이 스킬의 코드 패턴.
- [ADR 0011 공용 경계](../../docs/adr/0011-shared-code-boundary.md) — 무엇을 공용으로 뺄지(게이트 A/B/C).
- [ADR 0005 승격 절차](../../docs/adr/0005-web-home-and-ui-promotion.md) — 실제로 올릴 때 밟는 절차.
- `screen-publishing`·`web-publishing` — 화면 컴포넌트 규칙(표현은 앱별).
- ADR을 남길 땐 CLAUDE.md `작업 기록`의 **블로그 회고체**(1인칭·짧게·사람 말투, AI 티 금지)로 쓴다.
