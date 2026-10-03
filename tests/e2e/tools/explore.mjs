#!/usr/bin/env node
/**
 * 화면 탐색 도구 (KAN-565). 시나리오를 만들기 전에 "지금 화면에 무엇이 어떤 이름으로 떠 있나"를 확인한다.
 * 토스 발표의 "에이전트 디바이스"에 해당한다. 사람이 손으로 써도 되고 /e2e 스킬이 주로 쓴다.
 *
 * 스텝을 인자로 주면 순서대로 실행하고, snap 스텝에서 접근성 스냅샷(role·name 트리)을 찍는다.
 * 스냅샷은 테스트 셀렉터(getByRole)와 같은 어휘라 여기서 본 이름을 그대로 spec에 쓴다.
 *
 *   pnpm --filter @plick/e2e explore -- goto:/reels snap click:button:공유 snap
 *   pnpm --filter @plick/e2e explore -- --web goto:/articles find:좋아요
 *   pnpm --filter @plick/e2e explore -- --headed goto:/reels pause     # 창을 띄우고 Inspector에서 사람이 이어서 조작·녹화
 *
 * 스텝:
 *   goto:<경로>                   baseURL 기준 이동
 *   scope:<범위>                 이후 click·fill·find를 그 안에서만 찾는다. main | reel(보고 있는 릴) | dialog:<이름> | off
 *   click:<role>:<name>          getByRole(role, { name }). name 끝에 = 를 붙이면 exact
 *   fill:<role>:<name>:<값>      입력
 *   press:<키>                    키 입력 (Escape, Enter ...)
 *   swipe                        모바일 위로 쓸어 올리기(릴스 넘김). 웹에서는 휠
 *   wait:<ms>
 *   snap                         접근성 스냅샷. 트윗 임베드 줄은 --full이 없으면 걸러 낸다
 *   find:<텍스트>                 스냅샷에서 그 텍스트가 든 줄만
 *   url                          현재 URL
 *   pause                        Playwright Inspector를 열고 멈춘다(--headed와 같이). Record를 누르면 손 조작이 코드로 나온다
 *
 * 옵션: --web(기본 mobile) --target=dev|prod|local(기본 dev) --headed --full
 * 로케이터가 여러 개에 걸리면 후보를 전부 찍고 멈춘다. 그게 spec에서 좁혀야 할 지점이다.
 */
import { chromium } from "@playwright/test";

const TARGETS = {
  dev: { mobile: "https://dev-m.plick.co.kr", web: "https://dev.plick.co.kr" },
  prod: { mobile: "https://m.plick.co.kr", web: "https://plick.co.kr" },
  local: { mobile: "http://localhost:3001", web: "http://localhost:3000" },
};
const GALAXY = {
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
};
const EMBED_NOISE =
  /x\.com|twitter|Tweet|Verified account|"Follow"|Copy link|replies|View on|Watch on|View video/i;

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.slice(2).split("=");
      return [k, v ?? true];
    }),
);
const steps = args.filter((a) => !a.startsWith("--"));
const project = flags.web ? "web" : "mobile";
const target = flags.target ?? "dev";
const base = TARGETS[target]?.[project];
if (!base) {
  console.error(`--target은 ${Object.keys(TARGETS).join("|")} 중 하나다`);
  process.exit(2);
}
if (steps.length === 0) {
  console.error("스텝이 없다. 예: goto:/reels snap");
  process.exit(2);
}

const browser = await chromium.launch({ headless: !flags.headed });
const context = await browser.newContext(
  project === "mobile"
    ? { ...GALAXY, baseURL: base, locale: "ko-KR", timezoneId: "Asia/Seoul" }
    : {
        viewport: { width: 1280, height: 800 },
        baseURL: base,
        locale: "ko-KR",
        timezoneId: "Asia/Seoul",
      },
);
const page = await context.newPage();

/** scope 스텝이 정한 범위. 없으면 page 전체 */
let scope = page;
const scopeName = () => (scope === page ? "" : ` (scope 안)`);

const snapshot = async () => {
  const text = await (
    scope === page ? page.locator("body") : scope
  ).ariaSnapshot();
  return flags.full
    ? text
    : text
        .split("\n")
        .filter((l) => !EMBED_NOISE.test(l))
        .join("\n");
};

/** "button:좋아요=" → role button, name 좋아요, exact */
function parseLocator(spec) {
  const [role, ...rest] = spec.split(":");
  let name = rest.join(":");
  const exact = name.endsWith("=");
  if (exact) name = name.slice(0, -1);
  return scope.getByRole(role, { name, exact });
}

function setScope(arg) {
  if (arg === "off") return page;
  if (arg === "reel") return page.locator("main section:not([inert])");
  const [role, ...rest] = arg.split(":");
  const name = rest.join(":");
  return name ? page.getByRole(role, { name }) : page.getByRole(role);
}

async function swipeUp() {
  if (project !== "mobile") {
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 700);
    return;
  }
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 180, y: 600 }],
  });
  for (let y = 550; y > 150; y -= 50) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 180, y }],
    });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}

console.log(`[explore] ${project} ${target} ${base}`);
let code = 0;
try {
  for (const step of steps) {
    const [cmd, ...rest] = step.split(":");
    const arg = rest.join(":");
    console.log(`\n> ${step}`);
    switch (cmd) {
      case "goto":
        await page.goto(arg, { waitUntil: "load" });
        await page.waitForTimeout(800);
        console.log(`  ${page.url()}`);
        break;
      case "scope":
        scope = setScope(arg);
        console.log(
          scope === page ? "  전체" : `  ${arg} (${await scope.count()}개)`,
        );
        break;
      case "click": {
        const loc = parseLocator(arg);
        const n = await loc.count();
        if (n !== 1) {
          console.log(
            `  ${n}개에 걸린다${scopeName()}. scope로 좁히거나 spec에서 좁혀야 한다:`,
          );
          for (let i = 0; i < Math.min(n, 8); i++) {
            const el = loc.nth(i);
            console.log(
              `    ${i}: "${(await el.textContent())?.trim().slice(0, 60)}"`,
            );
          }
          throw new Error(
            n === 0
              ? `요소를 못 찾았다: ${arg}`
              : `여러 개에 걸려 누르지 않았다: ${arg}`,
          );
        } else {
          await loc.click();
        }
        await page.waitForTimeout(600);
        console.log(`  ${page.url()}`);
        break;
      }
      case "fill": {
        const i = arg.lastIndexOf(":");
        await parseLocator(arg.slice(0, i)).fill(arg.slice(i + 1));
        break;
      }
      case "press":
        await page.keyboard.press(arg);
        await page.waitForTimeout(400);
        break;
      case "swipe":
        await swipeUp();
        await page.waitForTimeout(1000);
        console.log(`  ${page.url()}`);
        break;
      case "wait":
        await page.waitForTimeout(Number(arg));
        break;
      case "snap":
        console.log((await snapshot()).replace(/^/gm, "  "));
        break;
      case "find": {
        const lines = (await snapshot())
          .split("\n")
          .filter((l) => l.includes(arg));
        console.log(
          lines.length
            ? lines.map((l) => "  " + l.trim()).join("\n")
            : "  (없음)",
        );
        break;
      }
      case "url":
        console.log(`  ${page.url()}`);
        break;
      case "pause":
        await page.pause();
        break;
      default:
        throw new Error(`모르는 스텝: ${step}`);
    }
  }
} catch (e) {
  console.error(`\n[explore] 실패: ${e.message.split("\n")[0]}`);
  console.log((await snapshot().catch(() => "")).replace(/^/gm, "  "));
  code = 1;
} finally {
  await browser.close();
}
process.exit(code);
