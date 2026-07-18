/**
 * @file 온보딩 공통 설정값 — 닉네임(W8)·팀 선택(W9) 단계 공용.
 * 각 단계의 현재 스텝(`current`)은 단계별 화면에서 리터럴로 표기하고, 전체 스텝 수와
 * 닉네임 길이 제한만 여기서 공유한다. 모바일 `apps/mobile/app/onboarding/_lib/constants.ts`와
 * 같은 값을 유지한다.
 */

/** 온보딩 전체 스텝 수 (1 닉네임 → 2 팀 선택) */
export const ONBOARDING_TOTAL_STEPS = 2;

/** 닉네임 최대 길이 — 입력 카운터·maxLength 공용. */
export const NICKNAME_MAX_LENGTH = 10;
