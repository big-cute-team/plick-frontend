/**
 * @file 브라우저에서 게스트 세션을 받아 오는 요청 (KAN-665).
 */

import { ApiError } from "@plick/core/client";
import { GUEST_SESSION_PATH } from "@/_constants/api";

/**
 * 발급 결과. `issued`는 이번 요청이 새 게스트를 만들었다, `existing`은 그 사이 다른 탭이나
 * 요청이 이미 세션을 만들어 두었다, `failed`는 BE 실패나 네트워크 순단이다.
 */
export type GuestSessionResult = "issued" | "existing" | "failed";

/** 날아가는 중인 발급. 한가할 때의 발급과 좋아요 탭이 겹쳐도 요청은 하나다 */
let inflight: Promise<GuestSessionResult> | null = null;

/**
 * 게스트 세션을 받아 온다. 응답이 토큰 쿠키를 심으므로 끝난 뒤의 요청부터 게스트로 나간다.
 *
 * 같은 순간의 호출은 요청 하나를 나눠 쓴다. 게스트는 부를 때마다 BE에 계정이 하나씩 생기므로
 * 겹친 호출이 각자 보내면 안 된다. 끝나면 비워서 실패한 뒤의 다음 호출은 다시 시도한다.
 *
 * @returns 발급 결과
 */
export function requestGuestSession(): Promise<GuestSessionResult> {
  inflight ??= fetch(GUEST_SESSION_PATH, {
    method: "POST",
    credentials: "same-origin",
  })
    .then(async (res): Promise<GuestSessionResult> => {
      if (!res.ok) return "failed";
      const body = (await res.json()) as { issued?: boolean };
      return body.issued ? "issued" : "existing";
    })
    .catch((): GuestSessionResult => "failed")
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * 게스트를 받아 오지 못해 요청을 보낼 수 없을 때 뮤테이션이 던지는 에러를 만든다. BE가 토큰 없는
 * 요청에 주는 401 `AUTH_REQUIRED`와 같은 모양이라, 호출부는 하던 대로 그 코드를 보고 로그인 유도
 * 팝업을 띄운다. 던지는 자리의 스택이 남게 매번 새로 만든다.
 */
export function sessionUnavailableError(): ApiError {
  return new ApiError(
    401,
    "AUTH_REQUIRED",
    "세션을 시작하지 못했어요. 잠시 후 다시 시도해 주세요",
  );
}
