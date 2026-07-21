#!/usr/bin/env node
/**
 * 로컬 BE의 access 토큰(HS256 JWT)을 직접 민팅한다.
 *
 * 보호 API를 붙일 때 실제 OAuth를 돌지 않고도 `Authorization: Bearer …`를 만들기 위한 검증용 도구다.
 * 서명 키는 BE 저장소 `.env`의 `JWT_SECRET`(base64)을 **런타임에 읽는다** — 이 저장소에 시크릿을 두지 않는다.
 * 클레임은 BE `JwtTokenProvider`와 동일하게 `sub`(userId 문자열)·`iat`·`exp`만 싣는다.
 *
 * @example
 *   node scripts/be-verify/mint-jwt.mjs 15           # 기본 1시간짜리 토큰
 *   node scripts/be-verify/mint-jwt.mjs 15 60        # 60초 후 만료(만료 동작 확인용)
 *   PLICK_BE_DIR=~/dev/plick-backend node scripts/be-verify/mint-jwt.mjs 15
 */

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_BE_DIR = path.join(homedir(), "Documents", "plick-backend");
const DEFAULT_TTL_SECONDS = 3600;

/**
 * BE 저장소 `.env`를 읽어 key=value 맵으로 돌려준다.
 *
 * @param {string} beDir BE 저장소 경로
 * @returns {Record<string, string>}
 */
function readBackendEnv(beDir) {
  const envPath = path.join(beDir, ".env");
  let raw;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    throw new Error(
      `BE .env를 못 읽었다: ${envPath}\n` +
        `BE 저장소 위치가 다르면 PLICK_BE_DIR 환경변수로 알려준다.`,
    );
  }
  /** @type {Record<string, string>} */
  const env = {};
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

/**
 * base64url 인코딩. JWT의 세 조각 모두 이 형식을 쓴다.
 *
 * @param {Buffer | string} input
 * @returns {string}
 */
function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const [, , userIdArg, ttlArg] = process.argv;
if (!userIdArg || !/^\d+$/.test(userIdArg)) {
  console.error(
    "사용법: node scripts/be-verify/mint-jwt.mjs <userId> [ttlSeconds]",
  );
  process.exit(1);
}

const beDir = process.env.PLICK_BE_DIR
  ? process.env.PLICK_BE_DIR.replace(/^~/, homedir())
  : DEFAULT_BE_DIR;
const secretBase64 = readBackendEnv(beDir).JWT_SECRET;
if (!secretBase64) {
  console.error(`BE .env에 JWT_SECRET이 없다: ${path.join(beDir, ".env")}`);
  process.exit(1);
}

const ttl = ttlArg ? Number(ttlArg) : DEFAULT_TTL_SECONDS;
const issuedAt = Math.floor(Date.now() / 1000);

const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const payload = base64url(
  JSON.stringify({
    sub: String(userIdArg),
    iat: issuedAt,
    exp: issuedAt + ttl,
  }),
);
const signature = base64url(
  createHmac("sha256", Buffer.from(secretBase64, "base64"))
    .update(`${header}.${payload}`)
    .digest(),
);

process.stdout.write(`${header}.${payload}.${signature}`);
