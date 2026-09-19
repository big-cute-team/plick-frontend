/**
 * @file OAuth 콜백 라우트 (KAN-318, 모바일 KAN-257 이식) — 프로바이더가 인가 후
 * 돌려보내는 착지점. `?code`·`?state`를 받아 state 쿠키와 대조(CSRF 검증)하고,
 * 통과하면 `login`이 code를 BE에 넘겨 세션을 연다. 페이지가 아니라 라우트 핸들러인
 * 이유: 렌더할 UI가 없고, 쿠키를 심고 지우며 redirect로 끝나는 순수 처리 구간이라서다.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { login } from "@/_services/auth";
import { OAUTH_STATE_COOKIE } from "@/_constants/api";
import { parseOAuthState } from "@/_services/oauth";

/** 검증 실패·BE 실패 공통 착지 — 로그인 화면이 `?error=oauth`를 읽어 안내를 띄운다 */
const FAILURE_PATH = "/login?error=oauth";

/**
 * 탈퇴 후 7일 재가입 제한 착지 (KAN-393) — 재시도 안내가 아니라 재가입 가능
 * 시각을 보여줘야 해서 공통 실패와 분리한다. `until`은 BE `rejoinableAt`이다.
 */
function rejoinRestrictedPath(until: string | null): string {
  return until
    ? `/login?error=rejoin&until=${encodeURIComponent(until)}`
    : "/login?error=rejoin";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const returnedState = params.get("state");

  /** state 쿠키는 일회용 — 성공이든 실패든 여기서 소모한다(재사용 방지) */
  const jar = await cookies();
  const storedValue = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);

  // 사용자가 동의를 취소하면 code 없이 ?error=만 온다 — 조용히 로그인 화면으로
  if (!code || !returnedState || !storedValue) {
    // 실패가 전부 같은 ?error=oauth로 합쳐지므로 사유는 서버 로그로 구분한다
    console.error("[oauth] 콜백 파라미터/쿠키 누락:", {
      code: !!code,
      state: !!returnedState,
      cookie: !!storedValue,
      error: params.get("error"),
    });
    redirect(FAILURE_PATH);
  }

  const stored = parseOAuthState(storedValue);
  if (!stored || stored.state !== returnedState) {
    console.error("[oauth] state 검증 실패:", { storedValue, returnedState });
    redirect(FAILURE_PATH);
  }

  const result = await login(stored.provider, code);
  if (result && "rejoinRestrictedUntil" in result) {
    redirect(rejoinRestrictedPath(result.rejoinRestrictedUntil ?? null));
  }
  if (result?.error) redirect(FAILURE_PATH);
}
