/**
 * @file 온보딩 공통 설정값 — 닉네임(W8)·팀 선택(W9) 단계 공용.
 * 각 단계의 현재 스텝(`current`)은 단계별 화면에서 리터럴로 표기한다.
 * 닉네임 길이 제한은 BE 계약 상수라 `@plick/domain/constants`로 승격했다(KAN-391).
 */

/** 온보딩 전체 스텝 수 (1 닉네임 → 2 팀 선택) */
export const ONBOARDING_TOTAL_STEPS = 2;
