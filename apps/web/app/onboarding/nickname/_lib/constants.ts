/**
 * @file 온보딩 닉네임 단계(W8) 설정값. 피그마 node 225-2.
 */

/** 닉네임 최대 길이 — 입력 카운터·maxLength 공용. */
export const NICKNAME_MAX_LENGTH = 10;

/** 온보딩 진행 단계 — 닉네임은 1/2(다음은 팀 선택 예정). */
export const ONBOARDING_STEP = { current: 1, total: 2 } as const;
