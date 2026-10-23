/**
 * @file 로그인 컨텍스트 타입.
 */

/** `AuthProvider`가 브라우저에서 받아 드는 프로필 조각(`useProfileSeed`). 컨텍스트가 쓰는 값만 추린다. */
export interface ProfileSeed {
  isGuest: boolean;
  userId: number | null;
  nickname: string | null;
}
