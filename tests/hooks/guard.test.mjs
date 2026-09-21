/**
 * PreToolUse 가드 훅 회귀 테스트.
 *
 * 훅은 프로세스 경계로 동작하므로 실제로 자식 프로세스를 띄워 stdin JSON을 넣고 exit code를 본다.
 * exit 2가 차단, 0이 통과다. 테스트가 실패하면 node --test가 exit 1을 돌려 CI가 멈춘다.
 *
 * 실행: pnpm test:hooks
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const HOOK = path.join(ROOT, "plugins", "plick-harness", "hooks", "guard.mjs");

/**
 * 훅을 한 번 실행하고 exit code와 stderr를 돌려준다.
 *
 * @param {object} payload 훅 stdin에 넣을 JSON
 */
function run(payload) {
  const r = spawnSync("node", [HOOK], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf8",
  });
  return { code: r.status, stderr: r.stderr };
}

const bash = (command, cwd = ROOT) => ({
  tool_name: "Bash",
  tool_input: { command },
  cwd,
});

describe("guard: gh pr", () => {
  it("gh pr create를 막는다", () => {
    const r = run(bash("gh pr create --base develop --title x"));
    assert.equal(r.code, 2);
    assert.match(r.stderr, /PR 생성과 병합/);
  });
  it("복합 명령 안의 gh pr merge도 막는다", () => {
    assert.equal(run(bash("cd apps && gh pr merge 12 --squash")).code, 2);
  });
  it("gh pr view, list는 통과한다", () => {
    assert.equal(run(bash("gh pr view 12")).code, 0);
    assert.equal(run(bash("gh pr list --state open")).code, 0);
  });
});

describe("guard: 리터럴 안의 글자는 보지 않는다", () => {
  it("커밋 메시지에 금지 명령 이름이 들어 있어도 통과한다", () => {
    assert.equal(
      run(bash('git commit -m "가드 훅(gh pr create/merge 차단)을 더한다"'))
        .code,
      0,
    );
  });
  it("heredoc 본문에 금지어가 있어도 통과한다", () => {
    const cmd =
      "git commit -q -F - <<'EOF'\nchore: 훅 추가\n\n- gh pr create/merge 차단\n- git push origin develop 차단\nEOF";
    assert.equal(run(bash(cmd)).code, 0);
  });
  it("python heredoc 안의 문자열도 통과한다", () => {
    const cmd = "python3 - <<'EOF'\ns = s.replace('gh pr create', 'x')\nEOF";
    assert.equal(run(bash(cmd)).code, 0);
  });
  it("따옴표 밖의 gh pr create는 여전히 막는다", () => {
    assert.equal(run(bash('gh pr create --title "hotfix" --body "x"')).code, 2);
    assert.equal(run(bash("echo done && gh pr merge 3")).code, 2);
  });
});

describe("guard: 보호 브랜치 push", () => {
  it("origin develop으로의 push를 막는다", () => {
    assert.equal(run(bash("git push origin develop")).code, 2);
  });
  it("HEAD:main refspec도 막는다", () => {
    assert.equal(run(bash("git push origin HEAD:main")).code, 2);
  });
  it("feature 브랜치 push는 통과한다", () => {
    assert.equal(
      run(bash("git push -u origin feature/KAN-564-harness-guardrails")).code,
      0,
    );
  });
  it("브랜치 이름에 main이 포함돼도 다른 명령이면 통과한다", () => {
    assert.equal(run(bash("git log origin/main..HEAD --oneline")).code, 0);
  });
});

describe("guard: commit", () => {
  it("--no-verify와 -n을 막는다", () => {
    assert.equal(run(bash("git commit --no-verify -m x")).code, 2);
    assert.equal(run(bash("git commit -n -m x")).code, 2);
  });
  it("feature 브랜치의 일반 commit은 통과한다", () => {
    assert.equal(run(bash("git commit -m 'feat: KAN-1 x'")).code, 0);
  });
  it("develop 체크아웃 상태에서는 commit을 막는다", () => {
    const wt = mkdtempSync(path.join(tmpdir(), "guard-wt-"));
    rmSync(wt, { recursive: true, force: true });
    const added = spawnSync(
      "git",
      ["worktree", "add", "-q", "--detach", wt, "develop"],
      { cwd: ROOT },
    );
    if (added.status !== 0) return; // develop 브랜치가 없는 환경(얕은 클론)에서는 건너뛴다
    try {
      spawnSync("git", ["switch", "-q", "-c", "develop-probe", "--track"], {
        cwd: wt,
      });
      spawnSync("git", ["checkout", "-q", "develop"], { cwd: wt });
      assert.equal(run(bash("git commit -m x", wt)).code, 2);
    } finally {
      spawnSync("git", ["worktree", "remove", "--force", wt], { cwd: ROOT });
    }
  });
});

describe("guard: 파일 편집", () => {
  const edit = (file_path) => ({
    tool_name: "Edit",
    tool_input: { file_path },
  });
  it("pnpm-lock.yaml 편집을 막는다", () => {
    assert.equal(run(edit("/repo/pnpm-lock.yaml")).code, 2);
  });
  it("node_modules와 .next 아래 쓰기를 막는다", () => {
    assert.equal(
      run({
        tool_name: "Write",
        tool_input: { file_path: "/repo/node_modules/a/b.js" },
      }).code,
      2,
    );
    assert.equal(run(edit("/repo/apps/mobile/.next/server/x.js")).code, 2);
  });
  it("소스 파일 편집은 통과한다", () => {
    assert.equal(run(edit("/repo/apps/mobile/app/page.tsx")).code, 0);
  });
});

describe("guard: 실패는 열어 둔다", () => {
  it("JSON이 깨져도 exit 0으로 흘린다", () => {
    const r = run("not json");
    assert.equal(r.code, 0);
    assert.match(r.stderr, /훅 오류/);
  });
  it("모르는 도구는 통과한다", () => {
    assert.equal(
      run({
        tool_name: "Read",
        tool_input: { file_path: "/repo/pnpm-lock.yaml" },
      }).code,
      0,
    );
  });
});
