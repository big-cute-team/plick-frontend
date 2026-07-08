# ADR 0001 — 프로젝트 세팅 완전 가이드 (개념 + 내부 동작)

- **상태(Status):** Accepted
- **날짜(Date):** 2026-07-02
- **목적:** PLick 프론트엔드를 빈 폴더에서 지금 상태까지 어떻게 만들었는지,
  각 도구가 **무엇이고 · 내부적으로 어떻게 동작하고 · 왜 그렇게 설정했는지**를 정리한다.

> 📖 **읽는 법 / 이 문서의 구성**
> 개념마다 세 겹으로 설명합니다.
>
> 1. **개념** — 한두 줄 직관.
> 2. **내부 동작** — 실제로 무슨 일이 일어나는지(파일·프로세스·알고리즘 수준).
> 3. **우리 저장소에서** — 실제 파일/설정으로 확인.
>
> 2번을 건너뛰고 1·3만 읽어도 되지만, "왜 이렇게 되지?"가 궁금하면 2번을 보세요.
> 급하면 [12. 요약](#12-한눈에-보는-요약)·[13. 용어](#13-용어-사전)만.

---

## 0. 만들고 있는 것

**PLick** = 프리미어리그 이적 루머를 릴스(숏폼)처럼 넘겨보는 앱. 모바일 우선.
이 저장소는 그 **프론트엔드** 코드가 사는 곳이고, 오늘은 코드 작성 전 **개발 환경**을 갖췄다.

---

## 1. 오늘까지의 여정

```
빈 폴더
 └(1) create-turbo 로 모노레포 뼈대 생성        ← 이전 커밋
   └(2) 디자인 토큰 이관                          ← 이전 커밋
     └(3) 개발 도구 정비 ★이 문서★
         Prettier · Husky/lint-staged · CI · Node/에디터 고정
```

---

## 2. 왜 도구가 필요한가

| 문제                                      | 도구                               |
| ----------------------------------------- | ---------------------------------- |
| 여러 앱·공용 코드를 효율적으로 관리·빌드  | 모노레포 · pnpm · Turborepo        |
| 코드 스타일이 사람마다 달라 diff가 지저분 | Prettier                           |
| 문법 오류·나쁜 패턴·타입 오류를 미리 차단 | ESLint · TypeScript                |
| 검사 안 한 코드가 커밋/머지되는 것을 차단 | Husky/lint-staged(로컬) · CI(서버) |
| "내 컴퓨터에선 됨" 편차 제거              | Node 버전 고정 · .editorconfig     |

---

## 3. 패키지 · 모노레포 · pnpm · Turborepo

이 장이 저장소의 뼈대이자 가장 헷갈리는 부분이라 제일 자세히 다룬다.

### 3-1. "패키지"란 정확히 무엇인가

**개념.** 패키지 = **`package.json`을 가진 폴더 하나.** 그게 정의의 전부다.
`package.json`은 그 폴더의 **매니페스트(신분증)**로, 최소한 아래를 담는다.

```jsonc
{
  "name": "web", // 패키지 이름 (다른 패키지가 이 이름으로 가져다 씀)
  "version": "0.1.0",
  "scripts": { "build": "next build" }, // 실행 가능한 명령들
  "dependencies": { "react": "^19.2.0" }, // 이 패키지가 필요로 하는 다른 패키지
  "devDependencies": {}, // 개발할 때만 필요한 것(빌드 산출물엔 불필요)
}
```

**"남의 패키지 vs 우리 패키지"는 정의가 같고 출처만 다르다.**

| 구분        | 예                                            | 어디서 옴                       |
| ----------- | --------------------------------------------- | ------------------------------- |
| 외부 패키지 | `react`, `next`, `prettier`                   | npm 레지스트리에서 **다운로드** |
| 우리 패키지 | `web`, `mobile`, `@plick/ui`, `@plick/tokens` | 이 **저장소 안**에 소스로 존재  |

- `apps/web`, `apps/mobile`도 사실 패키지다(각자 `package.json`이 있으니). 다만 **최종 결과물**이라
  "앱"이라 부르고, `packages/*`는 앱이 **가져다 쓰는 부품**이라 "공용 패키지"라 부를 뿐, **기술적으로는 동일**하다.
- `dependencies`(런타임에 필요) vs `devDependencies`(개발/빌드에만 필요)의 구분은 배포 크기·설치 범위에 영향을 준다.

**우리 저장소에서.** `apps/web/package.json`의 의존성:

```jsonc
"dependencies": {
  "@plick/ui": "workspace:*",  // 우리 패키지 — "저장소 안에서 찾아 써"
  "next": "16.2.0",            // 외부 패키지 — npm에서 받음
  "react": "^19.2.0"
}
```

`workspace:*` = "npm 레지스트리 말고 **이 워크스페이스 안의 로컬 패키지**를 연결하라"는 **pnpm 프로토콜**. (`*`은 로컬 버전 아무거나.)

### 3-2. 모노레포 & 워크스페이스

**개념.** 여러 패키지를 **한 저장소**에 두는 방식. 우리 구성:

```
apps/
  web/     데스크톱 웹  (dev: localhost:3000)   name: "web"
  mobile/  모바일 웹    (dev: localhost:3001)   name: "mobile"
packages/
  ui/                 공용 UI 컴포넌트          name: "@plick/ui"
  tokens/             디자인 토큰(색·글자)      name: "@plick/tokens"
  eslint-config/      공용 ESLint 규칙          name: "@plick/eslint-config"
  typescript-config/  공용 TS 설정              name: "@plick/typescript-config"
```

**내부 동작(워크스페이스 인식).** 루트 `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

pnpm은 설치 시 이 **glob 패턴**에 걸리는 폴더들을 스캔해 각 `package.json`의 `name`을 읽고
**"이 저장소에 어떤 로컬 패키지가 있는지" 목록**을 만든다. 이후 어떤 패키지가 `@plick/ui`를
의존하면, pnpm은 npm에서 받지 않고 **로컬 `packages/ui`를 연결**한다(→ 3-3).

### 3-3. pnpm 내부 동작 (설치·링크가 실제로 하는 일)

**개념.** 외부 패키지를 받아오고, 워크스페이스 패키지를 연결하는 패키지 매니저.

**내부 동작.** `pnpm install`이 하는 일을 단계로:

1. **해석(resolve).** 모든 `package.json`의 의존성 + `pnpm-lock.yaml`을 읽어 **정확한 버전 트리**를 확정.
   락파일 덕에 누가 언제 설치해도 동일한 버전이 나온다.
2. **다운로드 → 전역 스토어.** 외부 패키지를 **콘텐츠 주소 기반 전역 스토어**에 저장.
   우리 머신에선 `~/Library/pnpm/store/v3`. 여기엔 **파일 단위로, 내용 해시를 키로** 딱 한 번만 저장된다.
   (같은 파일을 100개 프로젝트가 써도 디스크엔 1벌.)
3. **가상 스토어 구성.** 프로젝트 안에 `node_modules/.pnpm/<이름>@<버전>/node_modules/<이름>/`을 만들고,
   그 안 파일들을 전역 스토어에서 **하드링크**한다(복사 아님 → 빠르고 디스크 절약).
   실제로 우리 저장소에도 `node_modules/.pnpm/@eslint+js@9.39.1/…` 식으로 버전이 박힌 폴더들이 있다.
4. **심링크로 노출.** 각 패키지의 최상위 `node_modules/<의존성>`은 위 가상 스토어를 가리키는 **심링크**.
   **직접 선언한 의존성만** 최상위에 심링크되므로, 선언 안 한 패키지는 import가 안 된다(**엄격성**).
   - 이 "비평탄(non-flat) node_modules"가 pnpm의 핵심. npm의 평탄한 구조는 선언 안 한 패키지도
     우연히 import되는 "유령 의존성" 사고가 나는데, pnpm은 구조적으로 막는다.
5. **워크스페이스 패키지는 곧장 심링크.** `@plick/ui`처럼 로컬 패키지는 스토어를 거치지 않고
   소스 폴더로 바로 심링크된다. 실제 확인:

   ```
   apps/web/node_modules/@plick/ui -> ../../../../packages/ui   (심링크)
   ```

   그래서 `packages/ui` 소스를 고치면 **빌드/복사 없이 즉시** web에 반영된다.

**우리 저장소에서.**

- `@plick/ui`의 `package.json`엔 `"exports": { "./*": "./src/*.tsx" }`가 있다.
  이건 Node의 **exports 서브패스 매핑**으로, `import { Button } from "@plick/ui/button"` →
  실제 파일 `packages/ui/src/button.tsx`로 해석된다. (별도 빌드 단계 없이 소스를 바로 노출.)
- `@plick/tokens`는 `"./theme.css": "./theme.css"`만 내보낸다(코드가 아니라 CSS 파일 하나).

### 3-4. Turborepo 내부 동작 (병렬·순서·캐시)

**개념.** 모노레포의 여러 패키지에 대해 `build`/`lint` 같은 **작업(task)**을 순서·병렬·캐시를
알아서 관리하며 실행하는 **작업 오케스트레이터**. `pnpm build` → 내부적으로 `turbo run build`.

**내부 동작 ① — 두 개의 그래프.**

1. **패키지 그래프**: 각 `package.json`의 의존성을 읽어 "누가 누구에 의존하는지" 방향 그래프를 만든다.
   예) `web → @plick/tokens`, `web → @plick/ui`.
2. **작업 그래프**: 실행 대상은 패키지가 아니라 **`패키지#작업`** 노드다(예 `web#build`, `mobile#build`).
   각 노드의 선행 조건은 `turbo.json`의 `dependsOn`으로 정한다.

우리 `turbo.json`:

```jsonc
"build": {
  "dependsOn": ["^build"],                 // ^ = "내가 의존하는 패키지들의 build 먼저"
  "outputs": [".next/**", "!.next/cache/**"] // 캐시에 저장할 산출물
}
```

- `^build`의 **캐럿(^)** 이 핵심: "**업스트림(내가 의존하는) 패키지들의 build를 먼저** 끝내라".
  캐럿이 없으면(`"build"`) "같은 패키지 안의 다른 작업"을 뜻해 의미가 완전히 다르다.

**내부 동작 ② — 스케줄링(병렬 vs 순서).**
작업 그래프를 **위상 정렬(topological sort)** 한 뒤, **선행 조건이 없는 노드부터 동시에** 실행한다.
동시 실행 개수는 `--concurrency`(기본값 존재)로 제한된다. 즉:

- **서로 의존 없음 → 병렬.** `web#build`와 `mobile#build`는 서로 무관 → **동시 실행**.
- **의존 있음 → 순서.** `web`이 `@plick/tokens`에 의존하고 tokens에 build가 있으면
  `@plick/tokens#build` **먼저** → 끝나면 `web#build`.

**질문에 대한 정확한 답 (web/mobile 동시 빌드?).**
`turbo run build --dry`로 실제 계획을 보면:

- 스코프 6개 패키지 중 **`build` 스크립트가 있는 건 `web`·`mobile` 둘뿐**.
  `@plick/ui`·`tokens`·config들은 `Command = <NONEXISTENT>`(빌드 스크립트 없음) → **실행할 게 없어 건너뜀**.
- `web`/`mobile`은 tokens/ui에 의존하지만 그 의존 패키지에 **build 작업이 없어 기다릴 대상이 없다.**
- 결론: **`web`과 `mobile`의 `next build`가 병렬로 동시에 실행**된다.
- 만약 나중에 `packages/ui`에 build(예: TS→JS 변환)가 생기면, 그땐 turbo가 `^build` 규칙에 따라
  **`@plick/ui#build`를 먼저** 돌리고 그다음 `web`/`mobile`을 돌리도록 **자동으로 순서를 잡는다.** 우리가 손댈 필요 없음.

**내부 동작 ③ — 해시 기반 캐시(turbo가 빠른 진짜 이유).**
각 `패키지#작업`마다 **입력을 해시**해 캐시 키를 만든다. 입력에 들어가는 것:

- 그 패키지의 **소스 파일들** + `turbo.json`의 해당 작업 정의
- **의존 작업들의 해시**(업스트림이 바뀌면 나도 무효화)
- **전역 입력**: 락파일에서 뽑은 외부 의존성 해시, `engines`(우리는 `node>=20.9.0`), 지정된 env 등

실행 흐름:

```
작업 실행 요청
  → 입력 해시 계산 → 캐시에 그 해시가 있나?
      있음(HIT)  → 명령을 실제로 돌리지 않고, 저장된 산출물(outputs)과 로그를 그대로 복원 ⚡
      없음(MISS) → 명령 실행 → 끝나면 outputs를 tar로 압축해 캐시에 저장
```

- **로컬 캐시**는 `.turbo/cache/<해시>.tar.zst`(+manifest/meta)로 저장된다(우리 저장소에 이미 존재).
- 그래서 아무것도 안 바꾸고 다시 빌드하면 "cached, replaying logs"로 **거의 즉시** 끝난다.
- 소스 한 줄만 바꿔도 그 패키지(와 그것에 의존하는 것들)의 해시만 바뀌어 **바뀐 부분만** 다시 돈다.

**자주 쓰는 플래그.** `--dry`(실행 안 하고 계획만), `--filter=web`(특정 패키지만), `--force`(캐시 무시).

---

## 4. Next.js · TypeScript · Tailwind · 토큰

### 4-1. Next.js

**개념.** React로 실제 서비스를 만들 때 필요한 라우팅·렌더링·최적화를 갖춘 프레임워크. 우리는 16.

**내부 동작(요점).** `app/` 폴더 구조가 곧 URL이 된다(파일 기반 라우팅). 컴포넌트는 기본이
**서버 컴포넌트**(서버에서 HTML 생성)이고, 상호작용이 필요한 곳만 파일 맨 위에 `"use client"`를
붙여 브라우저에서 도는 클라이언트 컴포넌트로 만든다. `next build`는 각 라우트를 정적/동적으로
분석해 `.next/`에 최적화된 산출물을 만든다(그래서 캐시 대상이 `.next/**`).

### 4-2. TypeScript

**개념.** JS에 타입을 얹어 실행 전에 오류를 잡는 언어.

**내부 동작.** `tsc`(TypeScript 컴파일러)가 코드를 파싱해 타입을 검사한다. 우리는
`tsc --noEmit`로 **JS 산출물은 만들지 않고 검사만** 한다(실제 변환은 Next가 함). 앱에선
`next typegen`이 라우트 기반 타입을 먼저 생성한 뒤 `tsc`가 검사한다. 명령: `pnpm check-types`.
공용 설정은 `packages/typescript-config`에 두고 각 앱이 `extends`로 확장한다.

### 4-3. Tailwind CSS v4

**개념.** `class="text-body rounded-card"`처럼 유틸리티 클래스를 조립하는 CSS 방식.

**내부 동작.** 빌드 시 **PostCSS 파이프라인**의 `@tailwindcss/postcss` 플러그인이 소스에서
사용된 클래스를 스캔해 **실제로 쓰인 CSS만** 생성한다(안 쓴 건 결과물에서 빠짐). v4는 설정을
JS 파일이 아니라 CSS의 `@theme`/`@import "tailwindcss"`로 한다. 우리 앱 `app/globals.css` 최상단에
`@import "tailwindcss";`와 `@import "@plick/tokens/theme.css";`가 있다.

### 4-4. 디자인 토큰 (`@plick/tokens`)

**개념.** 색·글자 크기 등 디자인 값의 단일 원본. 예: 강조색 `--plk-accent: #e0263a`를 한 곳에만 정의.

**내부 동작.** 그냥 CSS 커스텀 프로퍼티(변수). `theme.css`가 `:root`에 `--plk-*`를 정의하고,
각 앱이 이 파일을 import하면 모든 화면에서 `var(--plk-accent)`로 참조 가능. 값 하나 바꾸면 전역 반영.

---

## 5. Git · GitHub · 브랜치 · PR

- **Git**: 변경 이력(스냅샷)을 저장하는 분산 버전관리. **커밋** = 스냅샷 하나.
- **브랜치**: `main`을 안 건드리고 따로 작업하는 포인터. 작업 후 합친다(merge).
- **GitHub**: 원격 저장소 호스팅. 우리: `big-cute-team/frontend`.
- **PR(Pull Request)**: 브랜치를 main에 합치자는 요청. 여기서 **CI가 자동 실행**되고 리뷰 후 머지.

---

## 6. Prettier — 포맷터 (오늘 추가 ①)

**개념.** 코드의 **모양**(따옴표·줄바꿈·세미콜론·들여쓰기)을 규칙대로 통일. 동작은 안 바꿈.

**내부 동작.** Prettier는 소스를 **AST(추상 구문 트리)로 파싱**한 뒤, 원래 서식은 대부분 버리고
**AST를 자기 규칙대로 처음부터 다시 출력**한다. 그래서 입력이 어떻게 생겼든 **출력이 결정적**이다
(같은 코드 → 항상 같은 결과). ESLint의 "스타일 규칙"과 겹치지 않도록 `eslint-config-prettier`가
ESLint의 서식 관련 규칙을 꺼둔다(→ 둘이 충돌 안 함).

**우리 설정.**

- `.prettierrc.json`: `"` 따옴표, 줄 최대 80칸, 들여쓰기 2, 세미콜론, `endOfLine: lf`,
  그리고 `prettier-plugin-tailwindcss`(Tailwind 클래스 순서 자동 정렬).
- `.prettierignore`: `.next`·잠금파일·이미지 등 제외.
- 명령: `pnpm format`(고침) / `pnpm format:check`(확인만, CI가 사용).

---

## 7. ESLint — 린터 (기존, 유지)

**개념.** 코드의 **품질·버그 위험**(안 쓰는 변수, 위험 패턴, React 훅 규칙 위반 등)을 검사.

**내부 동작(그리고 오늘 겪은 함정).** ESLint v9는 **flat config**(`eslint.config.*`)를 쓰는데,
**설정 파일을 "명령을 실행한 작업 디렉터리(cwd)"에서 찾는다**(파일별로 위로 탐색하지 않음).
우리는 설정을 루트가 아니라 각 워크스페이스(`apps/web/eslint.config.js` 등)에만 뒀다.

- 그래서 **루트에서 `eslint`를 한 번에 돌리면 설정을 못 찾아 실패**한다 → 8장 lint-staged에서 이 문제를 정면으로 만났다.
- 공용 규칙은 `packages/eslint-config`에 두고 각 앱 설정이 import해서 확장한다.
- 명령: `pnpm lint`(내부적으로 `turbo run lint` → 각 패키지에서 `eslint .`).

---

## 8. Husky + lint-staged — 커밋 게이트 (오늘 추가 ②)

**개념.** 검사 명령이 있어도 사람이 깜빡하면 소용없으니, **커밋하는 순간 자동으로** 돌린다.

**내부 동작 — Husky.** Git은 원래 `.git/hooks/`에 있는 스크립트를 특정 이벤트마다 실행한다
(예 커밋 직전 = `pre-commit`). 문제는 `.git/`은 커밋·공유가 안 된다는 점. **Husky**는
`git config core.hooksPath`를 **`.husky/_`**로 바꿔, 저장소에 커밋되는 `.husky/` 폴더의 스크립트가
훅으로 실행되게 한다(우리 저장소에서 `core.hooksPath = .husky/_` 확인됨). `package.json`의
`"prepare": "husky"` 스크립트는 `pnpm install` 때 이 설정을 자동으로 걸어준다.

**내부 동작 — lint-staged.** `.husky/pre-commit`이 `lint-staged`를 부르면:

1. **스테이징 안 된 변경을 임시로 stash** 해 치워둔다(커밋 대상만 남기려고).
2. `git diff --staged`로 **이번 커밋에 포함된 파일 목록**을 얻는다.
3. 설정(globs)에 맞는 명령을 그 파일들에 실행한다.
4. 명령이 파일을 고쳤으면(예 Prettier) **다시 스테이징**하고, 아까 stash를 복원한다.
5. **하나라도 실패하면 전부 원상복구**하고 커밋을 막는다.

**모노레포 대응(7장 함정의 해결).** 루트에서 eslint를 못 돌리므로, `lint-staged.config.mjs`에서
**스테이징 파일이 속한 워크스페이스로 스코프**해 `pnpm --filter <pkg> lint`를 돌린다.
훅은 `pnpm exec lint-staged --concurrent false`로 실행 — 읽기 전용 eslint와 `prettier --write`가
같은 파일에 동시 접근하지 않도록 **직렬화**한다.

**커밋 시 실제 흐름.**

```
git commit
 → Husky(core.hooksPath) → .husky/pre-commit → lint-staged --concurrent false
     ├ 코드 파일 → 해당 워크스페이스 eslint 검사
     └ 모든 대상 → prettier --write
 → 통과: 커밋 완료 ✅   /   실패: 원상복구·커밋 중단 ❌
```

---

## 9. CI (GitHub Actions) — 서버 검증 (오늘 추가 ③)

**개념.** 코드를 올리면(PR/푸시) **깨끗한 서버**가 자동으로 검사·빌드해 "합쳐도 안전한가"를 판정.
Husky는 로컬이라 우회 가능하지만, CI는 **모두에게 강제되는 최후 관문**.

**내부 동작.** `.github/workflows/ci.yml`을 GitHub가 읽어, 정의된 **이벤트(트리거)** 가 오면
**러너(runner)** 라는 일회용 리눅스 VM을 띄우고 **스텝(step)** 을 순서대로 실행한다.

```yaml
on: { push: {branches:[main]}, pull_request: {branches:[main]} }  # 트리거
jobs:
  verify:
    runs-on: ubuntu-latest        # 매번 새 VM
    steps:
      - checkout                  # 코드 내려받기
      - pnpm/action-setup         # pnpm 준비
      - setup-node (.nvmrc, cache)# Node 22 + 캐시
      - pnpm install --frozen-lockfile   # 락파일과 다르면 실패(재현성)
      - pnpm format:check         # 포맷
      - pnpm lint                 # 린트
      - pnpm check-types          # 타입
      - pnpm build                # 빌드
```

- `--frozen-lockfile`: `pnpm-lock.yaml`과 `package.json`이 어긋나면 **설치를 거부**한다. 로컬에서
  락파일을 커밋 안 한 실수 등을 서버가 잡는다.
- `concurrency + cancel-in-progress`: 같은 브랜치에 새 커밋이 오면 진행 중이던 CI를 취소(자원 절약).

**이 CI가 실제로 값을 한 사례.** 켜자마자 첫 PR에서 진짜 버그를 잡았다: `@plick/ui`의
`eslint.config.mjs`가 옛 스코프 `@repo/eslint-config`를 import하고 있었다. 내 로컬엔 옛 설치의
잔여 심링크가 있어 우연히 통과했지만, CI는 `--frozen-lockfile`로 **깨끗이 설치**하니
`ERR_MODULE_NOT_FOUND`로 실패 → `@plick/eslint-config`로 수정. **로컬 편차를 서버가 걸러낸** 전형적 사례.

---

## 10. Node 버전 · 에디터 고정 (오늘 추가 ④)

- **Node.js** = JS 실행 엔진. 버전이 다르면 동작이 달라질 수 있어 고정한다.
  - `.nvmrc`(`22`): `nvm use`가 이 파일을 읽어 Node 22로 전환. CI도 이 파일을 버전 소스로 사용.
  - `package.json`의 `engines.node`를 `>=18` → **`>=20.9.0`**(Next 16 실제 요구치)으로 상향.
    `>=18`은 실제로는 안 도는 버전까지 허용하는 거짓 신호였다. 이 값은 turbo 해시 입력에도 포함된다.
- **`.editorconfig`**: 에디터 종류와 무관하게 들여쓰기·개행(lf)·파일 끝 빈 줄·공백 정리를 통일.
- **보일러플레이트 정리**: `apps/web/app/layout.tsx`의 `"Create Next App"`/`lang="en"`을
  `"PLick"`/`ko`/Pretendard로 정리(이미 정리된 `apps/mobile`과 일치). 단 web 데모 페이지가 아직
  옛 폰트(Geist)를 참조해 폰트 완전 제거는 실제 화면 작업 때로 미룸.

---

## 11. 되짚기: `pnpm build` 한 줄이 실제로 하는 일

지금까지 개념을 한 흐름으로 연결하면:

```
pnpm build
 → package.json script "turbo run build"
 → Turbo: package.json들 → 패키지 그래프 → 작업 그래프(web#build, mobile#build)
 → 각 작업 입력 해시 → 캐시 HIT면 산출물 복원, MISS면 실행
 → web#build·mobile#build는 서로 의존 없어 병렬 실행 (각각 next build)
 → next build: 라우트 분석·번들·최적화 → .next/ 산출 → 캐시에 저장
```

---

## 12. 한눈에 보는 요약

**오늘 추가/변경 파일**

| 파일                            | 설명                                       |
| ------------------------------- | ------------------------------------------ |
| `.prettierrc.json`              | 포맷 규칙 + tailwind 클래스 정렬 플러그인  |
| `.prettierignore`               | 포맷 제외 대상                             |
| `.husky/pre-commit`             | 커밋 직전 `lint-staged --concurrent false` |
| `lint-staged.config.mjs`        | 워크스페이스별 eslint + prettier           |
| `.github/workflows/ci.yml`      | PR/푸시 시 서버 검증 파이프라인            |
| `.nvmrc`                        | Node 22 고정                               |
| `.editorconfig`                 | 에디터 공통 기본                           |
| `package.json`                  | scripts/engines/도구 추가                  |
| `apps/web/app/layout.tsx`       | 제목/lang/폰트 정리                        |
| `packages/ui/eslint.config.mjs` | CI가 잡은 버그: `@repo` → `@plick`         |

**명령어**

| 명령                | 하는 일                          |
| ------------------- | -------------------------------- |
| `pnpm install`      | 의존성 설치(+Husky 자동 설정)    |
| `pnpm dev`          | 개발 서버(web:3000, mobile:3001) |
| `pnpm build`        | 전체 빌드(turbo)                 |
| `pnpm lint`         | ESLint                           |
| `pnpm check-types`  | 타입 검사                        |
| `pnpm format`       | 전체 포맷 적용                   |
| `pnpm format:check` | 포맷 확인만                      |

---

## 13. 용어 사전

| 용어                | 뜻                                                          |
| ------------------- | ----------------------------------------------------------- |
| 패키지              | `package.json`을 가진 폴더 하나                             |
| 매니페스트          | 패키지 정보를 담은 `package.json`                           |
| 워크스페이스        | 모노레포 안의 로컬 패키지(자리)                             |
| 의존성              | 내 코드가 가져다 쓰는 다른 패키지                           |
| `workspace:*`       | "로컬 워크스페이스 패키지를 연결" pnpm 프로토콜             |
| 콘텐츠 스토어       | pnpm이 파일을 내용 해시로 1벌만 저장하는 전역 저장소        |
| 심링크/하드링크     | 복사 없이 파일/폴더를 가리키는 링크(pnpm이 사용)            |
| 유령 의존성         | 선언 안 했는데 우연히 import되는 것(pnpm은 구조적으로 차단) |
| 작업 그래프         | `패키지#작업` 노드와 선행 관계의 그래프(turbo)              |
| `dependsOn`/`^`     | 작업 선행 조건 / `^`=업스트림 의존 패키지 먼저              |
| 캐시 HIT/MISS       | 입력 해시가 캐시에 있음/없음                                |
| AST                 | 코드를 트리로 표현한 것(Prettier가 재출력에 사용)           |
| flat config         | ESLint v9의 `eslint.config.*` 설정 방식(cwd 기준 탐색)      |
| Git hook            | 커밋 등 이벤트에 자동 실행되는 스크립트                     |
| `core.hooksPath`    | Git이 훅을 찾는 경로(Husky가 `.husky/_`로 지정)             |
| CI / 러너           | 서버 자동 검증 / 그 검증이 도는 일회용 VM                   |
| `--frozen-lockfile` | 락파일과 다르면 설치 거부(재현성 보장)                      |

---

## 14. 아직 안 한 것 · 다음 단계

- [ ] **pnpm catalog** — react/next 등 버전이 패키지마다 중복 → 한 곳에서 관리
- [ ] **테스트 러너**(제스처/화면 회귀 방지)
- [ ] **`@plick/core`** 패키지 생성(타입·팀색·제스처 로직)
- [ ] web 데모 페이지 정리 시 **Geist 폰트 완전 제거**
- [ ] (선택) commitlint(커밋 메시지 형식 강제)

---

## 15. 참고

- 제품·UX·데이터 모델 등 프로젝트 전반: [handoff.md](../handoff.md)
- 이 문서(ADR 0001)는 **개발 환경/도구**에 집중. 결정이 바뀌면 새 ADR(0002…)로 이어 기록.
