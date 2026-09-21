import { defineConfig, devices } from "@playwright/test";

/**
 * PLick E2E 설정 (KAN-565).
 *
 * 배포된 환경을 바깥에서 타는 QA 자동화다. 앱을 여기서 띄우지 않는다(webServer 없음).
 * 대상은 E2E_TARGET으로 고른다.
 *   dev(기본): https://dev-m.plick.co.kr(mobile) · https://dev.plick.co.kr(web)
 *   prod:      https://m.plick.co.kr · https://plick.co.kr (읽기 전용 스모크만)
 *   local:     http://localhost:3001 · http://localhost:3000 (launch.json 프로필로 먼저 띄운다)
 * E2E_MOBILE_URL / E2E_WEB_URL로 개별 override도 된다.
 *
 * 실패 산출물은 사람과 에이전트가 같이 쓴다. trace(스텝별 DOM·네트워크·콘솔)와 video는
 * 실패한 테스트만 남기고, fixtures/failure.ts가 접근성 스냅샷과 콘솔·네트워크 오류를
 * 첨부한다. scripts/e2e/bundle.mjs가 그걸 .e2e/failure.json 하나로 모은다.
 */

const TARGETS = {
  dev: { mobile: "https://dev-m.plick.co.kr", web: "https://dev.plick.co.kr" },
  prod: { mobile: "https://m.plick.co.kr", web: "https://plick.co.kr" },
  local: { mobile: "http://localhost:3001", web: "http://localhost:3000" },
} as const;

type Target = keyof typeof TARGETS;

const target = (process.env.E2E_TARGET ?? "dev") as Target;
if (!(target in TARGETS)) {
  throw new Error(
    `E2E_TARGET은 ${Object.keys(TARGETS).join("|")} 중 하나다: ${target}`,
  );
}
const mobileURL = process.env.E2E_MOBILE_URL ?? TARGETS[target].mobile;
const webURL = process.env.E2E_WEB_URL ?? TARGETS[target].web;

/** 스토어 캡처(scripts/store-shots)와 같은 Galaxy 프리셋. 모바일 웹뷰에서 보는 폭이다 */
const galaxy = {
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
};

export default defineConfig({
  testDir: "./specs",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /* 배포 환경을 상대로 하니 네트워크 흔들림은 한 번 더 돌려 걸러 낸다. 두 번 다 깨지면 진짜다 */
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
    ...(process.env.CI ? [["github"] as const] : []),
  ],
  use: {
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    /* 릴스 전환 같은 CSS 전환을 줄여 스텝 판정을 안정시킨다. 앱이 prefers-reduced-motion을 존중하는 범위에서만 효과가 있다 */
    contextOptions: { reducedMotion: "reduce" },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  projects: [
    {
      name: "mobile",
      testDir: "./specs/mobile",
      use: { ...galaxy, baseURL: mobileURL },
    },
    {
      name: "web",
      testDir: "./specs/web",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        baseURL: webURL,
      },
    },
  ],
});
