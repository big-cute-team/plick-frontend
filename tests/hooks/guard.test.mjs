/**
 * PreToolUse 가드 훅 회귀 테스트.
 *
 * 훅은 프로세스 경계로 동작하므로 실제로 자식 프로세스를 띄워 stdin JSON을 넣고 exit code를 본다.
 * exit 2가 차단, 0이 통과다. 테스트가 실패하면 node --test가 exit 1을 돌려 CI가 멈춘다.
 *
 * 현재 브랜치를 읽는 검사는 이 저장소의 체크아웃 상태에 기대지 않는다. CI가 develop 푸시에서 돌면
 * 저장소 브랜치가 보호 브랜치라 "feature에서 통과" 테스트가 뒤집힌다. 그래서 임시 git 저장소를 만들어
 * 원하는 브랜치를 체크아웃한 cwd를 훅에 넘긴다.
 *
 * 실행: pnpm test:hooks
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
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
 * @param {object|string} payload 훅 stdin에 넣을 JSON(또는 깨진 문자열)
 */
function run(payload) {
  const r = spawnSync("node", [HOOK], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf8",
  });
  return { code: r.status, stderr: r.stderr };
}

/**
 * 지정한 브랜치가 체크아웃된 임시 git 저장소를 만들고 경로를 돌려준다.
 *
 * @param {string} branch 체크아웃할 브랜치 이름
 */
function makeRepo(branch) {
  const dir = mkdtempSync(path.join(tmpdir(), "guard-repo-"));
  const git = (...args) =>
    spawnSync("git", args, {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
  git("init", "-q", "-b", branch);
  git(
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@t",
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    "init",
  );
  return dir;
}

const repos = {};
before(() => {
  repos.feature = makeRepo("feature/KAN-1-x");
  repos.develop = makeRepo("develop");
  repos.main = makeRepo("main");
});
after(() => {
  for (const dir of Object.values(repos))
    rmSync(dir, { recursive: true, force: true });
});

const bash = (command, cwd) => ({
  tool_name: "Bash",
  tool_input: { command },
  cwd: cwd ?? repos.feature,
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
  it("전역 옵션을 끼운 gh -R o/r pr create도 막는다", () => {
    assert.equal(
      run(bash("gh -R big-cute-team/plick-frontend pr create")).code,
      2,
    );
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

describe("guard: 리뷰 게이트가 찾은 우회", () => {
  it("아포스트로피가 든 큰따옴표 문자열 뒤의 push도 잡는다", () => {
    assert.equal(
      run(bash(`echo "it's" && git push origin main && echo 'x'`)).code,
      2,
    );
  });
  it("-nm처럼 결합된 -n도 막고, -m 단독은 통과한다", () => {
    assert.equal(run(bash("git commit -nm x")).code, 2);
    assert.equal(run(bash("git commit -an -m x")).code, 2);
    assert.equal(run(bash("git commit -am x")).code, 0);
  });
  it("같은 명령에서 보호 브랜치로 옮겨 탄 뒤 commit하면 막는다", () => {
    assert.equal(run(bash("git checkout main && git commit -m x")).code, 2);
    assert.equal(run(bash("git switch develop; git merge feature/x")).code, 2);
  });
  it("develop에서 새 브랜치를 따고 이어서 commit하는 건 통과한다", () => {
    assert.equal(
      run(
        bash("git switch -c feature/KAN-3-z && git commit -m x", repos.develop),
      ).code,
      0,
    );
  });
});

describe("guard: 3차 리뷰가 찾은 우회와 오탐", () => {
  it("heredoc 구분자 뒤 같은 줄의 명령은 지우지 않는다", () => {
    assert.equal(run(bash("cat <<EOF; gh pr merge 3\nx\nEOF")).code, 2);
    assert.equal(
      run(bash("cat <<EOF && git push origin main\nbody\nEOF")).code,
      2,
    );
  });
  it("개행으로 나뉜 명령의 인자는 섞이지 않는다", () => {
    assert.equal(
      run(bash("git push origin feature/x\ngit checkout main")).code,
      0,
    );
    assert.equal(
      run(bash("git push origin feature/x\ngit push origin develop")).code,
      2,
    );
  });
  it("commit 뒤에 오는 switch -c는 현재 브랜치 검사를 건너뛰지 못한다", () => {
    assert.equal(
      run(
        bash(
          "git commit -m a && git switch -c x && git push origin HEAD",
          repos.develop,
        ),
      ).code,
      2,
    );
  });
  it("따옴표로 감싼 refspec도 잡는다", () => {
    assert.equal(run(bash('git push origin "main"')).code, 2);
    assert.equal(run(bash("git push origin 'HEAD:develop'")).code, 2);
  });
});

describe("guard: 보호 브랜치 push", () => {
  it("origin develop으로의 push를 막는다", () => {
    assert.equal(run(bash("git push origin develop")).code, 2);
  });
  it("HEAD:main refspec과 refs/heads/main, +main도 막는다", () => {
    assert.equal(run(bash("git push origin HEAD:main")).code, 2);
    assert.equal(run(bash("git push origin HEAD:refs/heads/main")).code, 2);
    assert.equal(run(bash("git push origin +develop")).code, 2);
  });
  it("전역 옵션을 끼운 git -C . push origin main도 막는다", () => {
    assert.equal(run(bash("git -C . push origin main")).code, 2);
    assert.equal(run(bash("git --no-pager push origin develop")).code, 2);
  });
  it("feature 브랜치 push는 통과한다", () => {
    assert.equal(
      run(bash("git push -u origin feature/KAN-564-harness-guardrails")).code,
      0,
    );
  });
  it("브랜치 이름에 main이나 develop이 들어 있어도 통과한다", () => {
    assert.equal(
      run(bash("git push -u origin feature/KAN-600-develop-tooling")).code,
      0,
    );
    assert.equal(run(bash("git push origin feature/KAN-9-main-nav")).code, 0);
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
  it("develop과 main 체크아웃 상태에서는 commit, merge, rebase를 막는다", () => {
    assert.equal(run(bash("git commit -m x", repos.develop)).code, 2);
    assert.equal(run(bash("git merge feature/x", repos.develop)).code, 2);
    assert.equal(run(bash("git rebase -i HEAD~2", repos.main)).code, 2);
    assert.equal(run(bash("git push", repos.main)).code, 2);
  });
  it("보호 브랜치에서도 읽기 명령은 통과한다", () => {
    assert.equal(
      run(bash("git status && git log --oneline -3", repos.develop)).code,
      0,
    );
    assert.equal(
      run(bash("git switch -c feature/KAN-2-y", repos.develop)).code,
      0,
    );
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
