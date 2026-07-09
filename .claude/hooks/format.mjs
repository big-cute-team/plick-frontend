// PostToolUse 훅: Edit/Write/MultiEdit 후 해당 파일을 Prettier로 포맷한다.
// stdin으로 도구 입력(JSON)을 받아 file_path를 뽑아 실행. 실패해도 작업을 막지 않는다.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  try {
    const { tool_input } = JSON.parse(input || "{}");
    const file = tool_input?.file_path;
    if (!file || !/\.(tsx?|jsx?|mjs|cjs|json|css|md)$/.test(file)) return;

    const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const bin = path.join(root, "node_modules", ".bin", "prettier");
    if (!existsSync(bin)) return;

    execFileSync(bin, ["--write", "--ignore-unknown", file], {
      stdio: "ignore",
    });
  } catch {
    // 조용히 무시 — 훅은 작업 흐름을 절대 막지 않는다.
  }
});
