# ADR 0001 — 프론트엔드 개발 도구(Dev Tooling) 세팅

- **상태(Status):** Accepted
- **날짜(Date):** 2026-07-02
- **작성:** 초기 세팅 정비 (create-turbo 부트스트랩 직후, 본격 개발 착수 전)
- **관련 문서:** [handoff.md](../handoff.md)

> ADR = Architecture Decision Record. 이 폴더(`docs/adr/`)는 "왜 이렇게 결정했는가"를
> 시간순으로 남기는 곳이다. 결정이 바뀌면 새 ADR을 추가해 이 문서를 Superseded 처리한다.

---

## 1. 배경 (Context)

`create-turbo`로 부트스트랩한 pnpm + Turborepo 모노레포(apps/web, apps/mobile, packages/\*)에서
디자인 토큰(`@plick/tokens`)까지 이관한 상태였다. 본격적으로 여러 명이 PR로 협업(`big-cute-team`)하기
직전 시점에, **팀 개발을 시작하기 전 반드시 있어야 할 공통 개발 도구**가 빠져 있었다.

착수 전 점검에서 확인된 공백:

| 영역           | 문제                                                                     |
| -------------- | ------------------------------------------------------------------------ |
| 코드 포맷      | `prettier`는 설치돼 있으나 **설정 파일이 없어** 에디터 기본값에 좌우됨   |
| Tailwind       | 클래스 정렬 자동화(`prettier-plugin-tailwindcss`) 부재                   |
| format 범위    | `format` 스크립트가 `ts,tsx,md`만 대상 → css/json/mjs 누락, 캐싱도 안 됨 |
| 커밋 게이트    | pre-commit 훅 없음 → lint/format 안 통과한 코드도 커밋 가능              |
| CI             | PR 자동 검증(`.github/workflows`) 없음                                   |
| Node 버전      | `engines: >=18`인데 **Next 16은 Node 20.9+ 요구** → 거짓 신호            |
| 에디터 통일    | `.editorconfig` 없음 (들여쓰기/개행/EOF 제각각)                          |
| 보일러플레이트 | `apps/web/app/layout.tsx`가 아직 "Create Next App" 메타 + `lang="en"`    |

---

## 2. 결정 (Decision)

위 공백을 아래와 같이 메웠다. **"설정을 코드로 고정한다(config as code)"** 를 원칙으로,
누가 어떤 에디터를 쓰든 동일한 결과가 나오도록 만들었다.

### 2.1 Prettier (P0)

- **`.prettierrc.json`** — 포맷 규칙을 명시적으로 고정.
  - `semi: true`, `singleQuote: false`, `trailingComma: "all"`, `printWidth: 80`,
    `tabWidth: 2`, `endOfLine: "lf"`
  - `plugins: ["prettier-plugin-tailwindcss"]` — **Tailwind 클래스 자동 정렬**. v4 사용 중이라
    클래스 순서를 손으로 관리하지 않도록 함(리뷰 노이즈 제거).
- **`.prettierignore`** — `pnpm-lock.yaml`, `.next`, `.turbo`, 폰트/아이콘 바이너리,
  `next-env.d.ts` 등 포맷 대상에서 제외.
- **`package.json` 스크립트 확장**
  - `format`: 대상 확장 → `**/*.{ts,tsx,js,mjs,cjs,json,css,md}` (기존은 `ts,tsx,md`만)
  - `format:check`: **CI 및 로컬 검증용**. 파일을 고치지 않고 위반만 리포트.

> 참고: `eslint-config-prettier`는 공유 ESLint 설정(`packages/eslint-config/base.js`, `next.js`)에
> 이미 연결돼 있어 ESLint ↔ Prettier 규칙 충돌은 없다. (이번에 추가한 것 아님, 기존 확인 사항)

### 2.2 Husky + lint-staged (pre-commit 게이트)

- **`husky` v9** 도입, `prepare: "husky"` 스크립트로 `pnpm install` 시 자동 활성화.
- **`.husky/pre-commit`** → `pnpm exec lint-staged --concurrent false` 실행.
- **`lint-staged.config.mjs`**(루트) — 스테이징된 파일만 대상:
  - `apps/web`·`apps/mobile`·`packages/ui`의 코드 파일 → 해당 워크스페이스의 `pnpm --filter <pkg> lint`
  - 전체 파일(`ts,tsx,js,mjs,cjs,json,css,md`) → `prettier --write`
- **모노레포 gotcha (중요):** ESLint v9 flat config는 **실행 위치(cwd)** 에서 `eslint.config.js`를
  찾는다. 루트엔 설정이 없고 각 워크스페이스 안에만 있어, 루트에서 `eslint`를 직접 돌리면
  `couldn't find an eslint.config.js`로 실패한다(처음 이 방식으로 짰다가 커밋이 막혀서 발견).
  → 파일이 속한 **워크스페이스로 스코프**해 `pnpm --filter`로 각 패키지 eslint를 돌려 해결.
- `--concurrent false`: 읽기 전용 eslint와 `prettier --write`가 같은 파일에 동시 접근하지 않도록 직렬 실행.
- 효과: 포맷/린트 안 맞는 코드가 애초에 커밋되지 않음.

### 2.3 CI 워크플로

- **`.github/workflows/ci.yml`** — `main` push 및 `main` 대상 PR에서 실행.
  - 순서: **format:check → lint → check-types → build** (전부 Turborepo 태스크로 실행).
  - `pnpm/action-setup@v4` + `actions/setup-node@v4`(`node-version-file: .nvmrc`, pnpm 캐시).
  - `pnpm install --frozen-lockfile` — 락파일과 어긋나면 실패(재현성 보장).
  - `concurrency` + `cancel-in-progress` — 같은 브랜치에 새 커밋이 오면 이전 실행 취소.

### 2.4 버전 / 에디터 고정

- **`.nvmrc`** → `22` (설치·검증에 쓴 Node 22 LTS, Next 16 요구치 20.9+ 충족). CI도 이 파일을 소스로 사용.
- **`package.json` `engines.node`** → `>=18` 에서 **`>=20.9.0`** 으로 상향(Next 16 실제 요구치).
- **`.editorconfig`** — charset/EOL(lf)/final-newline/trim/indent(2 space) 통일.
  Markdown은 trailing-whitespace 유지(줄바꿈 문법 보존).
- **`apps/web/app/layout.tsx`** — 메타데이터를 `"Create Next App"` → `"PLick"`,
  `lang="en"` → `"ko"`, Pretendard Variable CDN link 추가(이미 정리된 `apps/mobile`과 일관화).

---

## 3. 의도적으로 하지 않은 것 (Non-goals / 주의)

- **web의 Geist 폰트 완전 제거는 보류.** `apps/web/app/page.module.css`가 아직
  create-next-app 데모 페이지로 `--font-geist-*` 변수를 참조한다. layout에서 Geist를 지우면
  데모 스타일이 깨지므로, 메타/lang/Pretendard만 맞추고 **Geist 변수는 유지**했다.
  → 실제 화면(`/reels` 등) 이관 시 데모 페이지와 함께 정리할 것.
- **테스트 러너(vitest/playwright) 미도입.** 제스처·seam이 핵심 리스크라 회귀 테스트가 언젠가
  필요하지만, 이번 세팅 범위(도구 정비) 밖이라 다음 ADR로 분리.
- **pnpm catalog 미적용.** react/next/typescript 버전이 패키지마다 중복 하드코딩돼 있다.
  handoff.md 14장의 미해결 항목이며 별도 작업으로 남김.
- **`@plick/core` 미생성.** handoff.md가 전제하지만 아직 없음("이관 중"). 세팅이 아니라 이관 작업.

---

## 4. 검증 (Verification)

세팅 직후 아래를 실행해 전부 통과 확인:

```bash
pnpm format:check   # ✅ All matched files use Prettier code style!
pnpm lint           # ✅ 3 successful (web, mobile, @plick/ui)
pnpm check-types    # ✅ 3 successful
```

- `pnpm format` 1회 실행으로 기존 4개 파일(`apps/mobile/app/{layout.tsx,page.module.css}`,
  `apps/web/app/page.module.css`, `packages/tokens/theme.css`)을 새 규칙에 맞춰 베이스라인 정리.
  변경 내용은 한 줄 CSS 규칙을 펼치는 등 **동작에 영향 없는 포맷팅뿐**.
- `git config core.hooksPath` → `.husky/_` 로 husky 훅 정상 연결 확인.

---

## 5. 팀원용 사용법 (How to use)

```bash
# 처음 클론 후 (prepare 스크립트가 husky 훅을 자동 설치)
nvm use            # .nvmrc → Node 22
pnpm install

# 일상 명령
pnpm dev           # web(3000) + mobile(3001) 동시
pnpm format        # 전체 파일 포맷 적용
pnpm format:check  # 포맷 위반만 확인(고치지 않음)
pnpm lint
pnpm check-types

# 커밋 시: pre-commit이 변경 파일에 자동으로 eslint --fix + prettier 적용.
# 훅이 안 도는 것 같으면 pnpm install을 다시 실행해 husky를 재설치.
```

---

## 6. 추가한/변경한 파일 요약

| 파일                              | 종류 | 내용                              |
| --------------------------------- | ---- | --------------------------------- |
| `.prettierrc.json`                | 신규 | Prettier 규칙 + tailwind 플러그인 |
| `.prettierignore`                 | 신규 | 포맷 제외 대상                    |
| `.husky/pre-commit`               | 신규 | `lint-staged --concurrent false`  |
| `lint-staged.config.mjs`          | 신규 | 워크스페이스별 lint + prettier    |
| `.github/workflows/ci.yml`        | 신규 | PR/Push 검증 파이프라인           |
| `.nvmrc`                          | 신규 | Node 22 고정                      |
| `.editorconfig`                   | 신규 | 에디터 공통 규칙                  |
| `package.json`                    | 수정 | scripts/lint-staged/engines/deps  |
| `apps/web/app/layout.tsx`         | 수정 | 메타/lang/Pretendard              |
| (포맷 정리) mobile·web·tokens 4개 | 수정 | 새 규칙 베이스라인                |

---

## 7. 다음 단계 (Follow-ups)

- [ ] pnpm **catalog**로 react/next/typescript 버전 단일화 (handoff 14장)
- [ ] **테스트 러너** 도입 및 제스처/seam 회귀 테스트 (→ 별도 ADR)
- [ ] `@plick/core` 패키지 생성 및 `transpilePackages` 반영 (handoff 4·9장)
- [ ] web 데모 페이지 정리 시 **Geist 폰트 완전 제거**
- [ ] (선택) commitlint + Conventional Commits 강제
