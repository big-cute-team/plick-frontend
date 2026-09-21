/**
 * PostToolUse 훅: Edit/Write 직후 앱 코드(apps 아래 각 앱의 app 폴더)의 컨벤션 위반을 잡아 모델에게 되돌려준다.
 *
 * CLAUDE.md `컨벤션` 절 가운데 정규식으로 확정 판정할 수 있는 것만 본다.
 * - 부모 탐색 import(`from "../…"`): 컴포넌트 밖으로 나가는 import는 `@/…` 절대경로다.
 * - barrel 파일(`index.ts`, `index.tsx`): edge 미들웨어 번들에 서버 액션이 딸려 들어간다.
 * - Tailwind 임의값 색상(`bg-[#fff]`)과 인라인 style의 hex 색: 색은 토큰 유틸만 쓴다.
 *
 * px 임의값(`max-w-[480px]`)은 뼈대 폭처럼 정당한 예외가 있어 여기서 판정하지 않는다.
 * 사람이 리뷰한다.
 *
 * 위반이 있으면 목록을 stderr에 쓰고 exit 2로 끝낸다. PostToolUse의 exit 2는 편집을 되돌리지
 * 않고 stderr를 모델에게 전달한다. 모델이 그 자리에서 고치는 루프가 목적이다.
 * 위반이 없거나 대상 밖 파일이면 exit 0이다. 훅 오류는 exit 0으로 흘린다(guard.mjs와 같은 이유).
 *
 * @example
 *   echo '{"tool_name":"Edit","tool_input":{"file_path":"apps/mobile/app/x.tsx"}}' | node convention-check.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * 파일 내용을 줄 단위로 훑어 위반 메시지 목록을 만든다.
 *
 * @param {string} filePath 검사할 파일의 절대 경로
 * @param {string} source 파일 내용
 */
function findViolations(filePath, source) {
  const violations = [];
  const base = path.basename(filePath);

  if (/^index\.(ts|tsx)$/.test(base)) {
    violations.push(
      "barrel 파일(index.ts)은 금지다. 각 모듈을 직접 import한다(CLAUDE.md 레이어 폴더).",
    );
  }

  source.split("\n").forEach((line, i) => {
    const n = i + 1;
    if (
      /\bfrom\s+['"]\.\.\//.test(line) ||
      /\bimport\s*\(\s*['"]\.\.\//.test(line)
    ) {
      violations.push(
        `${n}행: 부모 탐색 import(../)는 금지다. \`@/…\` 절대경로로 쓴다.`,
      );
    }
    if (/\b[a-z-]+-\[#[0-9a-fA-F]{3,8}\]/.test(line)) {
      violations.push(
        `${n}행: Tailwind 임의값 색상(\`-[#…]\`)은 금지다. 토큰 유틸(bg-bg, text-text, bg-accent…)을 쓴다.`,
      );
    }
    if (/style=\{\{[^}]*#[0-9a-fA-F]{3,8}\b/.test(line)) {
      violations.push(
        `${n}행: 인라인 style의 hex 색은 금지다. 토큰 CSS 변수(var(--color-…))나 토큰 유틸을 쓴다.`,
      );
    }
  });

  return violations;
}

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const { tool_input: args = {} } = JSON.parse(input || "{}");
    const file = args.file_path;
    if (
      !file ||
      !/\.(ts|tsx)$/.test(file) ||
      !/\/apps\/[^/]+\/app\//.test(file)
    )
      process.exit(0);
    if (/\.(test|spec)\.(ts|tsx)$/.test(file)) process.exit(0);

    const violations = findViolations(file, readFileSync(file, "utf8"));
    if (violations.length > 0) {
      const rel = path.relative(
        process.env.CLAUDE_PROJECT_DIR || process.cwd(),
        file,
      );
      process.stderr.write(
        `[convention] ${rel}에서 컨벤션 위반 ${violations.length}건. 지금 고친다.\n`,
      );
      for (const v of violations) process.stderr.write(`  - ${v}\n`);
      process.exit(2);
    }
  } catch (error) {
    process.stderr.write(
      `[convention] 훅 오류로 검사를 건너뛴다: ${error?.message ?? error}\n`,
    );
  }
  process.exit(0);
});
