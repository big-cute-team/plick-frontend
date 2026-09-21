#!/usr/bin/env node
/**
 * E2E 실패 묶음 변환기 (KAN-565).
 *
 * Playwright JSON 리포트(tests/e2e/test-results/results.json)를 읽어 실패한 테스트마다
 * 사람과 에이전트가 같은 형식으로 읽는 묶음을 만든다.
 *   .e2e/failure.json  에이전트 입력. 스텝, 오류, 찾던 로케이터, 접근성 스냅샷, 콘솔·네트워크 오류, 산출물 경로
 *   .e2e/failure.md    사람용 요약. CI Step Summary와 터미널에 그대로 붙인다
 *
 * 접근성 스냅샷과 콘솔·네트워크 오류는 tests/e2e/fixtures/failure.ts가 첨부한 텍스트다.
 * trace.zip은 풀지 않는다. 영상·trace 경로만 실어서 사람은 `playwright show-trace`로 연다.
 *
 * 사용:
 *   node scripts/e2e/bundle.mjs                    # 기본 경로
 *   node scripts/e2e/bundle.mjs path/to/results.json
 * 실패가 없으면 exit 0에 묶음도 비어 있다. 실패가 있으면 exit 1이다(CI에서 잡 상태로 쓴다).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const RESULTS =
  process.argv[2] ?? path.join(ROOT, "tests/e2e/test-results/results.json");
const OUT_DIR = path.join(ROOT, ".e2e");
const MAX_SNAPSHOT_LINES = 120;
const ANSI = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");

if (!existsSync(RESULTS)) {
  console.error(
    `[e2e-bundle] 리포트가 없다: ${RESULTS}. playwright test를 먼저 돌린다.`,
  );
  process.exit(3);
}
const report = JSON.parse(readFileSync(RESULTS, "utf8"));
/* JSON 리포트의 spec 경로는 testDir 기준 상대 경로다. rootDir이 그 절대 경로다 */
const specRoot = report.config?.rootDir ?? path.join(ROOT, "tests/e2e/specs");

/** suites 트리를 평평하게 펴서 spec 단위로 돌려준다 */
function* walk(suite, titles = []) {
  const chain = suite.title ? [...titles, suite.title] : titles;
  for (const spec of suite.specs ?? [])
    yield { spec, titles: chain, file: suite.file ?? spec.file };
  for (const child of suite.suites ?? []) yield* walk(child, chain);
}

function readAttachment(att) {
  if (att.body) return Buffer.from(att.body, "base64").toString("utf8");
  if (att.path && existsSync(att.path)) return readFileSync(att.path, "utf8");
  return "";
}

/** Playwright 오류 메시지에서 어떤 로케이터를 기다리다 실패했는지 뽑는다 */
function locatorOf(message) {
  const m = message.match(/(?:Locator|waiting for|locator\()\s*:?\s*([^\n]+)/);
  return m ? m[1].trim().replace(/\)$/, "") : null;
}

const failures = [];
for (const root of report.suites ?? []) {
  for (const { spec, titles, file } of walk(root)) {
    for (const t of spec.tests ?? []) {
      /* retries까지 다 실패한 것만. 재시도로 통과한 건 flaky로 따로 센다 */
      if (t.status !== "unexpected") continue;
      const last = t.results[t.results.length - 1];
      const attachments = Object.fromEntries(
        (last.attachments ?? []).map((a) => [a.name, a]),
      );
      const textOf = (name) =>
        attachments[name] ? readAttachment(attachments[name]).trim() : "";
      const message = (
        last.error?.message ??
        last.errors?.[0]?.message ??
        "(오류 메시지 없음)"
      ).replace(ANSI, "");
      const aria = textOf("aria-snapshot").split("\n");
      failures.push({
        project: t.projectName,
        file: path.relative(ROOT, path.join(specRoot, file)),
        title: [...titles, spec.title].join(" > "),
        line: spec.line,
        status: t.status,
        retries: t.results.length - 1,
        durationMs: last.duration,
        url: textOf("url") || null,
        error: message,
        lookingFor: locatorOf(message),
        steps: (last.steps ?? [])
          .filter((s) => s.category === "test.step" || s.category === "pw:api")
          .map((s) => `${s.error ? "FAIL" : "ok"} ${s.title}`),
        ariaSnapshot:
          aria.slice(0, MAX_SNAPSHOT_LINES).join("\n") +
          (aria.length > MAX_SNAPSHOT_LINES
            ? `\n... (${aria.length - MAX_SNAPSHOT_LINES}줄 더)`
            : ""),
        consoleErrors: textOf("console-errors").split("\n").filter(Boolean),
        failedRequests: textOf("failed-requests").split("\n").filter(Boolean),
        artifacts: {
          screenshot: attachments.screenshot?.path ?? null,
          video: attachments.video?.path ?? null,
          trace: attachments.trace?.path ?? null,
        },
      });
    }
  }
}

const stats = report.stats ?? {};
const bundle = {
  generatedAt: new Date().toISOString(),
  target: process.env.E2E_TARGET ?? "dev",
  stats: {
    expected: stats.expected ?? 0,
    unexpected: stats.unexpected ?? 0,
    flaky: stats.flaky ?? 0,
    skipped: stats.skipped ?? 0,
  },
  failures,
};
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  path.join(OUT_DIR, "failure.json"),
  JSON.stringify(bundle, null, 2),
);

const md = [];
md.push(
  `## E2E (${bundle.target}) 통과 ${bundle.stats.expected} · 실패 ${bundle.stats.unexpected} · flaky ${bundle.stats.flaky} · 스킵 ${bundle.stats.skipped}`,
);
for (const f of failures) {
  md.push(
    "",
    `### FAIL [${f.project}] ${f.title}`,
    `\`${f.file}:${f.line}\`` + (f.url ? ` · ${f.url}` : ""),
  );
  if (f.lookingFor) md.push("", `찾던 요소: \`${f.lookingFor}\``);
  md.push("", "```", f.error.split("\n").slice(0, 12).join("\n"), "```");
  if (f.consoleErrors.length)
    md.push(
      "",
      "콘솔 오류:",
      ...f.consoleErrors.slice(0, 5).map((l) => `- ${l}`),
    );
  if (f.failedRequests.length)
    md.push(
      "",
      "실패한 요청:",
      ...f.failedRequests.slice(0, 5).map((l) => `- ${l}`),
    );
  if (f.artifacts.trace)
    md.push(
      "",
      `trace: \`pnpm --filter @plick/e2e exec playwright show-trace ${path.relative(ROOT, f.artifacts.trace)}\``,
    );
}
if (failures.length === 0) md.push("", "실패 없음.");
writeFileSync(path.join(OUT_DIR, "failure.md"), md.join("\n") + "\n");

console.log(md.join("\n"));
console.log(
  `\n[e2e-bundle] ${path.relative(ROOT, OUT_DIR)}/failure.json, failure.md`,
);
process.exit(failures.length ? 1 : 0);
