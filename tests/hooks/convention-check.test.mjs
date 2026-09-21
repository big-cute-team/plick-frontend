/**
 * PostToolUse 컨벤션 훅 회귀 테스트.
 *
 * 임시 파일을 저장소 안 앱 경로 모양으로 만들어 훅에 넘긴다. 훅은 경로 패턴으로 대상을 고르므로
 * 실제 apps 폴더 밑에 잠깐 파일을 쓰고 지운다.
 *
 * 실행: pnpm test:hooks
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const HOOK = path.join(ROOT, ".claude", "hooks", "convention-check.mjs");
const DIR = path.join(ROOT, "apps", "mobile", "app", "__hook-test__");

/**
 * 파일을 쓰고 훅을 돌린 뒤 exit code와 stderr를 돌려준다.
 *
 * @param {string} name 파일 이름
 * @param {string} source 파일 내용
 */
function check(name, source) {
  const file = path.join(DIR, name);
  writeFileSync(file, source);
  const r = spawnSync("node", [HOOK], {
    input: JSON.stringify({
      tool_name: "Edit",
      tool_input: { file_path: file },
    }),
    encoding: "utf8",
  });
  return { code: r.status, stderr: r.stderr };
}

describe("convention-check", () => {
  before(() => mkdirSync(DIR, { recursive: true }));
  after(() => rmSync(DIR, { recursive: true, force: true }));

  it("부모 탐색 import를 잡는다", () => {
    const r = check(
      "A.tsx",
      'import { x } from "../foo";\nexport const A = () => null;\n',
    );
    assert.equal(r.code, 2);
    assert.match(r.stderr, /부모 탐색 import/);
  });
  it("Tailwind 임의값 hex 색을 잡는다", () => {
    const r = check(
      "B.tsx",
      'export const B = () => <div className="bg-[#ff0000]" />;\n',
    );
    assert.equal(r.code, 2);
    assert.match(r.stderr, /임의값 색상/);
  });
  it("인라인 style hex 색을 잡는다", () => {
    const r = check(
      "C.tsx",
      'export const C = () => <div style={{ color: "#fff" }} />;\n',
    );
    assert.equal(r.code, 2);
  });
  it("barrel 파일을 잡는다", () => {
    const r = check("index.ts", 'export * from "./a";\n');
    assert.equal(r.code, 2);
    assert.match(r.stderr, /barrel/);
  });
  it("토큰 유틸과 @/ import, px 임의값은 통과한다", () => {
    const src =
      'import { A } from "@/_components/A";\nexport const D = () => <div className="bg-bg text-text max-w-[480px] px-edge" />;\n';
    assert.equal(check("D.tsx", src).code, 0);
  });
  it("앱 경로 밖 파일과 css는 검사하지 않는다", () => {
    const r = spawnSync("node", [HOOK], {
      input: JSON.stringify({
        tool_name: "Edit",
        tool_input: { file_path: path.join(ROOT, "packages/tokens/theme.css") },
      }),
      encoding: "utf8",
    });
    assert.equal(r.status, 0);
  });
});
