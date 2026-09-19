/**
 * @file 토큰 재발급 fetcher. refresh 토큰을 BE에 넘겨 새 access·refresh 쌍을 받아온다.
 *
 * 각 앱 `_services/auth.ts`(login/logout)와 달리 이 파일은 `"use server"`가 **아니다.**
 * 유일한 소비자가 edge에서 도는 각 앱 `proxy.ts`(옛 `middleware.ts`)라서다 — 서버 액션은
 * `next/headers`·`next/navigation`에 기대는데 그건 edge에서 안 돈다. 그래서 쿠키
 * 읽기·심기·리다이렉트는 프록시가 자기 API로 하고, 이 파일은 **BE 호출과 봉투 해제만**
 * 하는 순수 함수로 남긴다(edge·서버 어디서든 부를 수 있게). 모바일 `_services/refresh.ts`로
 * 살다 web 프록시도 같은 계약을 쓰면서 `apiFetch`와 함께 승격했다(KAN-318).
 */

import { apiFetch } from "./client";

/** BE 응답 shape (이 파일 로컬 — 스웨거 `TokenResponse` 그대로). access·refresh가 함께 회전된다. */
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * refresh 토큰으로 새 토큰 쌍을 재발급받는다. 회전 방식이라 응답의 refreshToken도 새 값이다.
 *
 * @param refreshToken 현재 refresh 쿠키 값
 * @returns 회전된 access·refresh 쌍
 * @throws {ApiError} refresh 토큰이 만료/무효거나 BE가 2xx가 아닐 때 — 호출부(proxy)가
 *   401만 세션 종료로 처리하고 나머지는 통과시킨다
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

/** 지금 BE에 나가 있는 재발급 호출 — 같은 refresh 토큰끼리 공유한다. */
const inFlight = new Map<string, Promise<TokenResponse>>();

/**
 * 방금 재발급에 성공한 옛 refresh 토큰 → 그때 받은 새 쌍.
 * 늦게 도착한 형제 요청이 이미 소모된 토큰으로 BE를 또 부르지 않게 잠깐 들고 있는다.
 */
const rotated = new Map<string, { tokens: TokenResponse; at: number }>();

/**
 * 회전된 쌍을 재사용해 주는 시간(ms).
 *
 * 브라우저는 요청을 시작한 시점의 쿠키를 싣는다. 재발급이 끝나 `Set-Cookie`가
 * 내려가도, 그 직전에 출발한 형제 요청들은 이미 소모된 옛 refresh 토큰을 달고
 * 온다. 그것들이 도착할 만한 시간만 덮는다 — 길게 잡을수록 낡은 토큰이 오래
 * 살아 있는 셈이라 짧게 둔다.
 */
const ROTATION_GRACE_MS = 30_000;

/**
 * 같은 refresh 토큰에 대한 재발급을 한 번으로 묶는다 (KAN-379).
 *
 * 왜 필요한가: BE 재발급은 회전 방식이라 한 번 쓴 refresh 토큰은 그 자리에서
 * 무효가 된다. access 쿠키가 만료된 직후(수명 15분) 탭 재탭처럼 요청이 여러 개
 * 동시에 나가면, 각 요청이 프록시에서 같은 토큰으로 따로 재발급을 부른다.
 * 먼저 닿은 하나만 성공하고 나머지는 401을 받아, 프록시가 세션이 끝난 줄 알고
 * 쿠키를 지우고 로그인 화면으로 보낸다 — 멀쩡한 로그인 상태에서 화면이 통째로
 * 바뀌었다 돌아오는 증상의 정체다. 로그인했을 때만, 그리고 access가 막 만료된
 * 순간에만 걸려서 간헐적으로 보인다.
 *
 * 그래서 토큰 값을 키로 호출을 공유하고({@link inFlight}), 이미 끝난 회전은
 * 잠깐 기억해뒀다가({@link rotated}) 늦게 온 형제에게 같은 쌍을 돌려준다.
 * 기억은 모듈 스코프라 한 서버 인스턴스 안에서만 유효한데, 문제의 버스트는
 * 브라우저 하나가 같은 인스턴스로 보내는 동시 요청이라 이걸로 덮인다.
 *
 * @param refreshToken 현재 refresh 쿠키 값
 * @returns 회전된 access·refresh 쌍 (형제 요청끼리 같은 값)
 * @throws {ApiError} refresh 토큰이 진짜로 만료/무효일 때 — 호출부(proxy)가 401이면
 *   1회 재시도 후 세션을 끊는다. 이 dedupe는 인스턴스 안에서만 유효해, 인스턴스
 *   사이 경쟁은 proxy의 재시도 리다이렉트가 흡수한다
 */
export async function refreshTokensShared(
  refreshToken: string,
): Promise<TokenResponse> {
  const now = Date.now();
  for (const [token, entry] of rotated) {
    if (now - entry.at > ROTATION_GRACE_MS) rotated.delete(token);
  }

  const done = rotated.get(refreshToken);
  if (done) return done.tokens;

  const pending = inFlight.get(refreshToken);
  if (pending) return pending;

  const call = refreshTokens(refreshToken)
    .then((tokens) => {
      rotated.set(refreshToken, { tokens, at: Date.now() });
      return tokens;
    })
    .finally(() => {
      inFlight.delete(refreshToken);
    });

  inFlight.set(refreshToken, call);
  return call;
}
