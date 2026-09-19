"use client";

import { createContext, useContext } from "react";

/**
 * 로그인 여부·내 닉네임을 클라 컴포넌트로 흘려주는 컨텍스트.
 *
 * 왜 컨텍스트가 필요한가: access 토큰은 HttpOnly 쿠키라 브라우저 JS가 못 읽고(`document.cookie`에
 * 안 보임), 로그인 여부를 읽는 `isLoggedIn()`은 `next/headers`라 서버 전용이다. 그래서 좋아요·댓글
 * 같은 클라 아일랜드는 스스로 로그인 여부를 알 수 없다 — **서버가 판단해 내려줘야** 한다. 그 값을
 * 여러 화면(피드·릴스·상세)에 흩어진 아일랜드마다 prop으로 내리지 않게, 루트에서 한 번 시드해 둔다.
 *
 * userId는 내 댓글 판별(KAN-333 수정·삭제 버튼)과 차단 셀프 가드(KAN-411)에 쓴다.
 * 원래는 댓글 응답에 작성자 식별 필드가 없어 닉네임 대조가 유일한 수단이었는데, KAN-411에서
 * BE가 댓글에 `userId`를 실어 주면서 id 대조로 바꿨다 — 닉네임은 변경 가능한 값이라 대조
 * 근거로는 약했다. 닉네임은 표시용으로 남는다.
 *
 * 기본값 `null`은 "provider 밖"을 뜻한다(로그인 안 함 `false`와 구분해 실수 사용을 잡는다).
 */
const AuthContext = createContext<{
  isLoggedIn: boolean;
  userId: number | null;
  nickname: string | null;
} | null>(null);

/**
 * 로그인 여부 provider. 서버(루트 레이아웃)가 `isLoggedIn()`으로 읽은 값과 프로필의 닉네임을
 * 시드로 받아, 하위 클라 컴포넌트가 `useAuth()`로 꺼내 쓰게 한다.
 *
 * 값은 서버 렌더 시점에 박힌다. 로그인·로그아웃은 서버 액션이 redirect하며 새 렌더를 일으키므로
 * 그때 시드가 다시 뿌려진다 — 클라에서 따로 폴링하거나 갱신할 필요가 없다.
 *
 * @param isLoggedIn 서버가 읽은 로그인 여부(access 쿠키 존재)
 * @param userId 내 유저 id. 비로그인·프로필 조회 실패면 null —
 *   그때는 내 댓글 판별이 항상 false로 떨어져 버튼이 안 뜰 뿐 화면은 그대로 돈다
 * @param nickname 내 닉네임(표시용). null 조건은 userId와 같고 온보딩 전에도 null이다
 */
export function AuthProvider({
  isLoggedIn,
  userId,
  nickname,
  children,
}: {
  isLoggedIn: boolean;
  userId: number | null;
  nickname: string | null;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ isLoggedIn, userId, nickname }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 클라 컴포넌트에서 로그인 여부·내 닉네임을 읽는다. `AuthProvider` 밖에서 부르면 에러로 잡는다.
 *
 * 컨텍스트·provider와 한 몸이라(서로의 private 컨텍스트 객체를 공유) 훅을 이 파일에 함께 둔다 —
 * 별도 `useXxx.ts`로 떼면 컨텍스트를 밖으로 export해야 해서 오히려 캡슐화가 샌다.
 *
 * @returns `{ isLoggedIn, userId, nickname }` — 유저 정보가 더 붙으면 이 객체를 넓힌다.
 */
export function useAuth(): {
  isLoggedIn: boolean;
  userId: number | null;
  nickname: string | null;
} {
  const auth = useContext(AuthContext);
  if (auth === null) {
    throw new Error("useAuth는 AuthProvider 안에서만 쓸 수 있다.");
  }
  return auth;
}
