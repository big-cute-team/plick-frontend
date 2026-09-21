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
 * - `main`/`develop`을 목적지로 하는 push, 그 브랜치 위에서의 commit과 merge, rebase 등 히스토리 변경.
 * - `git commit --no-verify`(-n), `HUSKY=0`, `-c core.hooksPath=…`: husky 훅 우회.
 * - `pnpm-lock.yaml`, `node_modules/`, `.next/` 편집: 도구 산출물은 손대지 않는다.
 *
 * 한계(알고 두는 것)
 * - 따옴표와 heredoc 안 글자는 검사하지 않는다(stripLiterals). `bash -c "gh pr create"`처럼 명령을
 *   문자열로 넘기는 형태는 여기서 못 본다. settings.json의 deny 접두어 규칙이 같은 이유로 못 보므로
 *   이 경로는 문서 규칙과 리뷰에 맡긴다.
 * - 셸을 파싱하지 않는다. `git`과 `gh`의 전역 옵션(`git -C . push`, `gh -R o/r pr create`)은 허용 패턴에
 *   넣었지만 그 밖의 변형은 놓칠 수 있다. `cd other && git commit`처럼 명령 안에서 디렉터리를 옮기면
 *   현재 브랜치 검사는 훅이 받은 cwd 기준이라 다른 저장소를 본다.
 *
 * @example
 *   echo '{"tool_name":"Bash","tool_input":{"command":"gh pr create"}}' | node guard.mjs; echo $?  # 2
 */
import { execFileSync } from "node:child_process";

const PROTECTED_BRANCHES = ["main", "develop"];

/**
 * `git`이나 `gh` 뒤에 올 수 있는 전역 옵션 구간. `-C <dir>`, `-c k=v`, `--no-pager`, `-R owner/repo` 같은 것.
 * 옵션 하나(`-\S+`)와 그 값일 수 있는 토큰 하나(`\S+`)가 0회 이상 반복된다.
 */
const GLOBAL_OPTS = String.raw`(?:\s+-\S+(?:\s+[^-\s]\S*)?)*`;
const GIT = (sub) => new RegExp(String.raw`\bgit${GLOBAL_OPTS}\s+${sub}\b`);
const GH_PR = new RegExp(
  String.raw`\bgh${GLOBAL_OPTS}\s+pr\s+(create|merge)\b`,
);

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
  // heredoc은 본문만 지운다. 구분자 뒤 같은 줄에 이어지는 명령(`cat <<EOF; gh pr merge 3`)은 남겨야 한다.
  let s = command.replace(
    /(<<-?\s*(['"]?)(\w+)\2)([^\n]*)\n[\s\S]*?\n\3(?=\n|$)/g,
    "$1$4 <<HEREDOC",
  );
  // 큰따옴표와 작은따옴표를 한 정규식으로 처리한다. 따로 두 번 돌리면 "it's" 안의 아포스트로피가
  // 뒤의 'x'까지 한 리터럴로 묶어 그 사이 명령을 지워 버린다(2차 헤드리스 리뷰가 잡은 우회).
  // 공백 없는 한 토큰짜리 문자열("main", "HEAD:main")은 따옴표만 벗겨 남긴다. refspec을 따옴표로 감싸는
  // 우회를 막기 위해서다. 공백이 든 문자열(커밋 메시지)은 비운다.
  s = s.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, (m) => {
    const inner = m.slice(1, -1);
    if (inner && !/[\s|;&$`\\]/.test(inner)) return inner;
    return m[0] === '"' ? '""' : "''";
  });
  return s;
}

/**
 * `git push …` 한 구간의 인자에서 목적지 브랜치가 보호 브랜치인지 본다.
 *
 * 단어 경계(`\b`)로 보면 `feature/KAN-600-develop-tooling`의 `develop`도 걸려 정상 push를 막는다.
 * 그래서 토큰 단위로 보고, refspec은 `src:dst`의 dst만 본다. `+`(강제)와 `refs/heads/`는 벗긴다.
 *
 * @param {string} pushPart `git … push`부터 다음 `|`, `;`, `&` 전까지의 문자열
 */
function pushTargetsProtected(pushPart) {
  const tokens = pushPart.split(/\s+/);
  const afterPush = tokens.slice(tokens.indexOf("push") + 1);
  for (const token of afterPush) {
    if (!token || token.startsWith("-")) continue;
    const dest = (token.includes(":") ? token.split(":").pop() : token)
      .replace(/^\+/, "")
      .replace(/^refs\/heads\//, "");
    if (PROTECTED_BRANCHES.includes(dest)) return dest;
  }
  return null;
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
  const cmd = stripLiterals(command).replace(/[ \t]+/g, " ");

  if (GH_PR.test(cmd)) {
    return "PR 생성과 병합은 클로드가 하지 않는다(CLAUDE.md Git · PR). 커밋과 push까지만 하고 PR 제목과 본문을 채팅에 써 준다.";
  }

  // 한 명령 문자열에 commit이나 push가 여러 번 올 수 있다(개행, &&, ;). 첫 구간만 보면 뒤가 빠진다.
  const commitParts =
    cmd.match(new RegExp(GIT("commit").source + String.raw`[^|;&\n]*`, "g")) ??
    [];
  // -n 계열은 짧은 옵션 묶음(-an, -nm)까지 보되 `-u<mode>`(-uno = --untracked-files=no)는 제외한다.
  // HUSKY=0 환경변수와 core.hooksPath 덮어쓰기도 같은 우회라 함께 본다.
  const bypassesHooks =
    commitParts.some((part) =>
      /(^|\s)(--no-verify|-(?![uU])[a-zA-Z]*n[a-zA-Z]*)(\s|$)/.test(part),
    ) ||
    (commitParts.length > 0 && /\bHUSKY=0\b|core\.hooksPath=/.test(cmd));
  if (bypassesHooks) {
    return "git commit --no-verify(HUSKY=0, core.hooksPath 포함)는 husky 커밋 훅(lint-staged)을 우회한다. 훅이 실패하면 원인을 고친 뒤 다시 커밋한다.";
  }

  const pushParts =
    cmd.match(new RegExp(GIT("push").source + String.raw`[^|;&\n]*`, "g")) ??
    [];
  for (const part of pushParts) {
    const dest = pushTargetsProtected(part);
    if (dest) {
      return `${dest}으로 직접 push하지 않는다(CLAUDE.md Git · PR). feature/KAN-<번호>-<설명> 브랜치로 push하고 PR을 거친다.`;
    }
  }

  const historyOp = GIT("(commit|merge|push|rebase|cherry-pick|reset|revert)");
  if (historyOp.test(cmd)) {
    // 같은 명령 안에서 보호 브랜치로 옮겨 탄 뒤 히스토리를 만지는 형태는 현재 브랜치와 무관하게 막는다.
    const switchesToProtected = new RegExp(
      String.raw`\bgit${GLOBAL_OPTS}\s+(switch|checkout)\s+(${PROTECTED_BRANCHES.join("|")})\b[\s\S]*` +
        historyOp.source,
    );
    if (switchesToProtected.test(cmd)) {
      return "같은 명령 안에서 main이나 develop으로 옮겨 탄 뒤 commit, merge, push를 하지 않는다. feature/KAN-<번호>-<설명> 브랜치에서 작업한다.";
    }
    // 반대로 새 브랜치를 먼저 따고(`switch -c`, `checkout -b`) 이어서 커밋하는 건 정상 흐름이라 현재 브랜치 검사를 건너뛴다.
    const createsBranch = new RegExp(
      String.raw`\bgit${GLOBAL_OPTS}\s+(switch\s+-c|checkout\s+-b)\s+\S+`,
    );
    const createAt = cmd.search(createsBranch);
    const firstHistoryAt = cmd.search(historyOp);
    const createsBranchFirst = createAt !== -1 && createAt < firstHistoryAt;
    const branch = createsBranchFirst ? "" : currentBranch(cwd);
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
