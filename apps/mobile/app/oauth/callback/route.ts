/**
 * @file OAuth 콜백 라우트 (KAN-257) — 프로바이더가 인가 후 돌려보내는 착지점.
 * `?code`·`?state`를 받아 state 쿠키와 대조(CSRF 검증)하고, 통과하면 `login`이
 * code를 BE에 넘겨 세션을 연다. 페이지가 아니라 라우트 핸들러인 이유: 렌더할 UI가
 * 없고, 쿠키를 심고 지우며 redirect로 끝나는 순수 처리 구간이라서다.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { login } from "@/_lib/api/auth";
import { OAUTH_STATE_COOKIE } from "@/_lib/api/constants";
import { parseOAuthState } from "@/_lib/api/oauth";

/** 검증 실패·BE 실패 공통 착지 — 로그인 화면이 `?error=oauth`를 읽어 안내를 띄운다 */
const FAILURE_PATH = "/login?error=oauth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const returnedState = params.get("state");

  /** state 쿠키는 일회용 — 성공이든 실패든 여기서 소모한다(재사용 방지) */
  const jar = await cookies();
  const storedValue = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);

  // 사용자가 동의를 취소하면 code 없이 ?error=만 온다 — 조용히 로그인 화면으로
  if (!code || !returnedState || !storedValue) redirect(FAILURE_PATH);

  const stored = parseOAuthState(storedValue);
  if (!stored || stored.state !== returnedState) redirect(FAILURE_PATH);

  const result = await login(stored.provider, code);
  if (result?.error) redirect(FAILURE_PATH);
}
