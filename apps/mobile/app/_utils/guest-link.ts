/**
 * @file 게스트 → 소셜 연동의 순수 판정 둘 (KAN-706). OAuth 콜백과 `linkSocial`이 쿠키를 읽어 값만
 * 넘기고, 여기는 Next에 기대지 않고 결정만 한다. 그래서 `tests/unit`이 두 앱의 실제 파일을 그대로
 * 부를 수 있다 (`cookies()`를 쓰는 서버 액션·라우트는 요청 컨텍스트가 없어 단위 테스트로 못 부른다).
 */

import { GUEST_NOTICE, SESSION_KIND } from "@/_constants/api";

/** 토스트 쿠키에 담는 안내 종류 ({@link GUEST_NOTICE}의 값). */
export type GuestNoticeKind = (typeof GUEST_NOTICE)[keyof typeof GUEST_NOTICE];

/**
 * 콜백이 "지금 세션이 게스트인가"를 가르는 판정 (KAN-514, KAN-706).
 *
 * 마감 쿠키(`guestExpiresAt`)나 세션 종류 쿠키(`sessionKind`) 둘 중 하나라도 게스트라고 하면 게스트로
 * 본다. 둘은 같은 자리(게스트 발급·재발급, 로그인·연동·로그아웃)에서 심고 지우니 평소엔 한 값이고,
 * 하나만 남은 경우에만 이 OR가 일한다. 둘 다 HttpOnly가 아니라 토큰 쿠키와 따로 사라질 수 있다.
 *
 * 어느 쪽으로 틀릴지의 트레이드오프다 (KAN-706). 게스트 토큰이 있는데 비게스트로 판정하면
 * `/auth/login`을 타고, BE는 게스트 토큰을 못 받아 병합하지 못하니 그 사람의 기록이 조용히 버려진다.
 * 반대로 소셜 토큰인데 게스트로 판정하면 `/auth/link`가 400 `AUTH_LINK_NOT_GUEST`를 주고, 인가
 * 코드는 1회용이라 로그인으로 되돌릴 수 없어 실패 안내를 본다. 그 사람은 이미 소셜로 로그인된
 * 상태라 다시 시도하면 로그인 화면이 홈으로 보내 준다. 기록을 잃는 쪽보다 한 번 실패하는 쪽이
 * 낫다고 봐서 OR로 넓혔다.
 *
 * @param hasGuestExpires 마감 쿠키가 있는가
 * @param sessionKind 세션 종류 쿠키 값. 없으면 undefined
 */
export function isGuestSession(
  hasGuestExpires: boolean,
  sessionKind: string | undefined,
): boolean {
  return hasGuestExpires || sessionKind === SESSION_KIND.guest;
}

/**
 * `/auth/link` 응답을 받은 뒤 심을 안내 토스트 종류 (KAN-514, KAN-658, KAN-706). null이면 심지 않는다.
 *
 * - `linked=true`: 게스트 행이 그대로 소셜로 바뀌어 기록이 이어졌다. 알릴 게 없다
 * - 로그아웃이 발급한 게스트: 방금 로그아웃한 사람이 자기 계정으로 돌아온 것이라 어느 문구도 어색하다
 * - `linked=false`, `merged=true`: 기존 계정으로 로그인됐고 게스트 기록을 합쳤다
 * - `linked=false`, `merged`가 false거나 없음: 기존 계정으로 로그인됐지만 기록은 안 넘어갔다.
 *   BE 배포 전 응답에는 `merged`가 없어 여기로 떨어지고, 그때는 실제로도 병합이 없다
 *
 * @param data BE 응답 중 판정에 쓰는 두 필드
 * @param fromLogout 이 게스트가 로그아웃이 발급한 게스트인가
 */
export function linkNoticeKind(
  data: { linked: boolean; merged?: boolean },
  fromLogout: boolean,
): GuestNoticeKind | null {
  if (data.linked || fromLogout) return null;
  return data.merged ? GUEST_NOTICE.merged : GUEST_NOTICE.existing;
}
