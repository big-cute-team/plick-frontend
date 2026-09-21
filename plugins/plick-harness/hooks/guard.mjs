/**
 * PreToolUse 훅: CLAUDE.md `Git · PR` 절의 금지 동작을 도구 호출 시점에 막는다.
 *
 * 지시는 확률적이라 모델이 잊거나 컴팩션에서 사라질 수 있다. 이 훅은 Claude Code 런타임이
 * 도구 호출마다 예외 없이 실행하므로 "반드시"가 붙는 규칙을 여기에 둔다.
 *
 * stdin으로 `{ tool_name, tool_input, cwd }` JSON을 받는다. 막을 때는 이유를 stderr에 쓰고
 * exit 2로 끝낸다(호출이 차단되고 stderr가 모델에게 전달된다). 통과는 exit 0이다.
 *
 * 훅 자체의 오류(JSON 파싱 실패 등)는 exit 0으로 흘려보낸다. 가드 버그가 세션을 멈추게 하면
 * 사람이 훅을 통째로 끄게 되고, 그 순간 모든 규칙이 사라진다. 실패는 열어 두고 로그로 남긴다.
 *
 * 막는 것
 * - `gh pr create`, `gh pr merge`: PR 생성과 병합은 사용자가 직접 한다.
 * - `main`/`develop`으로의 push, 그 브랜치 위에서의 commit과 merge.
 * - `git commit --no-verify`(-n): husky 훅 우회.
 * - `pnpm-lock.yaml`, `node_modules/`, `.next/` 편집: 도구 산출물은 손대지 않는다.
 *
 * @example
 *   echo '{"tool_name":"Bash","tool_input":{"command":"gh pr create"}}' | node guard.mjs; echo $?  # 2
 */
import { execFileSync } from "node:child_process";

const PROTECTED_BRANCHES = ["main", "develop"];

/**
 * 현재 체크아웃된 브랜치 이름을 돌려준다. git 저장소가 아니거나 실패하면 빈 문자열이다.
 *
 * @param {string} cwd 훅이 받은 작업 디렉터리
 */
function currentBranch(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

/**
 * 명령 문자열에서 실행되지 않는 글자를 걷어낸다. heredoc 본문과 따옴표 안 문자열이다.
 *
 * 커밋 메시지나 echo 인자에 금지 명령 이름이 글자로 들어 있다고 막으면 안 된다. 실제로 첫 실전에서
 * 가드 훅을 설명하는 커밋 메시지 때문에 커밋이 막혔고, 그걸 고치는 python heredoc도 같은 이유로 막혔다.
 * 명령 위치에 있는 토큰만 보려고 리터럴을 지운다. 대가로 따옴표로 감싼 refspec(`"HEAD:main"`)은
 * 여기서 못 본다. 그건 settings.json의 deny 접두어 규칙과 현재 브랜치 검사가 나눠 맡는다.
 *
 * @param {string} command 원본 셸 명령
 */
function stripLiterals(command) {
  let s = command.replace(
    /<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\2(?=\n|$)/g,
    " <<HEREDOC ",
  );
  s = s.replace(/'[^']*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
  return s;
}

/**
 * Bash 명령 문자열을 검사해 막아야 할 이유를 돌려준다. 통과면 null이다.
 *
 * 복합 명령(`cd x && gh pr create`)이나 세미콜론 연결도 한 문자열이므로 정규식이 통째로 본다.
 * 권한 규칙의 접두어 매칭이 놓치는 우회를 여기서 잡는다. 리터럴은 먼저 걷어낸다(stripLiterals).
 *
 * @param {string} command 실행하려는 셸 명령
 * @param {string} cwd 훅이 받은 작업 디렉터리
 */
function checkBash(command, cwd) {
  const cmd = stripLiterals(command).replace(/\s+/g, " ");

  if (/\bgh\s+pr\s+(create|merge)\b/.test(cmd)) {
    return "PR 생성과 병합은 클로드가 하지 않는다(CLAUDE.md Git · PR). 커밋과 push까지만 하고 PR 제목과 본문을 채팅에 써 준다.";
  }

  if (/\bgit\s+commit\b[^|;&]*(\s-n\b|\s--no-verify\b)/.test(cmd)) {
    return "git commit --no-verify는 husky 커밋 훅(lint-staged)을 우회한다. 훅이 실패하면 원인을 고친 뒤 다시 커밋한다.";
  }

  const protectedRe = new RegExp(`\\b(${PROTECTED_BRANCHES.join("|")})\\b`);

  if (/\bgit\s+push\b/.test(cmd)) {
    const pushPart = cmd.match(/\bgit\s+push\b[^|;&]*/)?.[0] ?? "";
    if (protectedRe.test(pushPart)) {
      return "main과 develop으로 직접 push하지 않는다(CLAUDE.md Git · PR). feature/KAN-<번호>-<설명> 브랜치로 push하고 PR을 거친다.";
    }
  }

  const touchesHistory =
    /\bgit\s+(commit|merge|push|rebase|cherry-pick|reset|revert)\b/.test(cmd);
  if (touchesHistory) {
    const branch = currentBranch(cwd);
    if (PROTECTED_BRANCHES.includes(branch)) {
      return `현재 브랜치가 ${branch}다. main과 develop에서는 commit, merge, push, rebase를 하지 않는다. develop에서 feature/KAN-<번호>-<설명> 브랜치를 먼저 딴다.`;
    }
  }

  return null;
}

/**
 * 파일 편집 도구의 대상 경로를 검사해 막아야 할 이유를 돌려준다. 통과면 null이다.
 *
 * @param {string} filePath Edit/Write/MultiEdit이 받은 file_path
 */
function checkFileEdit(filePath) {
  if (/(^|\/)pnpm-lock\.yaml$/.test(filePath)) {
    return "pnpm-lock.yaml은 pnpm이 만드는 산출물이라 직접 편집하지 않는다. 의존성은 pnpm add/remove로 바꾼다.";
  }
  if (/(^|\/)(node_modules|\.next)\//.test(filePath)) {
    return "node_modules와 .next는 도구 산출물이라 손대지 않는다(CLAUDE.md Git · PR).";
  }
  return null;
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const {
      tool_name: tool,
      tool_input: args = {},
      cwd,
    } = JSON.parse(input || "{}");
    const dir = cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

    let reason = null;
    if (tool === "Bash" && typeof args.command === "string") {
      reason = checkBash(args.command, dir);
    } else if (
      ["Edit", "Write", "MultiEdit"].includes(tool) &&
      typeof args.file_path === "string"
    ) {
      reason = checkFileEdit(args.file_path);
    }

    if (reason) {
      process.stderr.write(`[guard] 차단: ${reason}\n`);
      process.exit(2);
    }
  } catch (error) {
    process.stderr.write(
      `[guard] 훅 오류로 검사를 건너뛴다: ${error?.message ?? error}\n`,
    );
  }
  process.exit(0);
});
