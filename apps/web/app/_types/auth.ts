/**
 * @file 로그인 컨텍스트 타입.
 */

/** 루트 레이아웃이 클라 트리에 내려 주는 프로필 조각. `AuthProvider`가 받는 값만 추린다. */
export interface ProfileSeed {
  isGuest: boolean;
  userId: number | null;
  nickname: string | null;
}
