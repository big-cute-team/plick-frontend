# tests/e2e

배포된 환경을 바깥에서 타는 QA 자동화다(KAN-565). PR을 막지 않는다. dev 배포 뒤와 매일 아침 CI가 돌리고,
깨지면 사람이 보는 리플레이(trace·영상·접근성 스냅샷)를 남긴다. 같은 묶음을 `scripts/e2e/heal.sh`가
에이전트에 넘겨 테스트를 고치게 한다.

## 실행

```bash
pnpm --filter @plick/e2e exec playwright install chromium   # 처음 한 번
pnpm test:e2e                                               # dev 전체, 헤드리스
pnpm --filter @plick/e2e test:ui                            # 화면 보면서. 시나리오 목록·브라우저·스텝 타임라인
pnpm --filter @plick/e2e test -- --project=mobile           # 모바일만
pnpm --filter @plick/e2e test -- -g "릴스"                   # 제목으로 고르기
E2E_TARGET=local pnpm test:e2e                              # launch.json 프로필로 띄운 3000·3001
```

대상은 `E2E_TARGET`(dev 기본, prod, local)이고 `E2E_MOBILE_URL`, `E2E_WEB_URL`로 개별 override한다.

## 구조

```
playwright.config.ts   대상 URL, mobile(Galaxy 360x780)·web(1280x800) 프로젝트, 실패 산출물 정책
fixtures/failure.ts    실패 시 접근성 스냅샷·콘솔 오류·실패 요청·URL을 첨부하는 test. 모든 spec이 이걸 import한다
fixtures/locators.ts   이름 없는 랜드마크(탭바, 보고 있는 릴, 릴 제목)를 한 번만 좁힌 로케이터
specs/mobile/*.spec.ts dev-m 골든 패스
specs/web/*.spec.ts    dev 골든 패스
```

## 시나리오 규칙

읽기와 이동만 한다. 좋아요·투표·댓글은 dev DB에 남고 로그인이 필요해서 테스트 로그인 엔드포인트가 생길 때까지 넣지 않는다.

셀렉터는 `getByRole`과 접근성 이름만 쓴다. CSS 클래스와 `nth`는 쓰지 않는다. 이름이 없는 랜드마크는
`fixtures/locators.ts`에 한 번만 좁히고, 앱에 `aria-label`을 붙이는 게 맞으면 앱 쪽을 고친다.

특정 id(`/articles/8741`)에 기대지 않는다. "목록 첫 기사"처럼 상대적으로 고른다.

`networkidle`을 기다리지 않는다. 트윗 임베드가 계속 폴링해서 끝나지 않는다. 헤딩이나 버튼이 보이는 것으로 판정한다.

## 깨졌을 때

```bash
node scripts/e2e/bundle.mjs                                 # .e2e/failure.json, failure.md
pnpm --filter @plick/e2e exec playwright show-trace tests/e2e/test-results/<테스트>/trace.zip
./scripts/e2e/heal.sh                                       # 에이전트가 test-drift만 고치고 재실행
```

CI 아티팩트(`e2e-dev-<run>`)에 같은 파일이 있다. 받아서 같은 명령으로 연다.
