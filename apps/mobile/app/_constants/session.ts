/**
 * @file 세션 상수 (KAN-665).
 */

import { ApiError } from "@plick/core/client";

/**
 * 게스트를 받아 오지 못해 요청을 보낼 수 없을 때 뮤테이션이 던지는 에러. BE가 토큰 없는 요청에 주는
 * 401 `AUTH_REQUIRED`와 같은 모양이라, 호출부는 하던 대로 그 코드를 보고 로그인 유도 팝업을 띄운다.
 */
export const SESSION_UNAVAILABLE = new ApiError(
  401,
  "AUTH_REQUIRED",
  "세션을 시작하지 못했어요. 잠시 후 다시 시도해 주세요",
);
