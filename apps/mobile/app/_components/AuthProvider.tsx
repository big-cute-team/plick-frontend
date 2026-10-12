"use client";

import {
  createContext,
  Suspense,
  use,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ProfileSeed } from "@/_types/auth";

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
 * `isGuest`는 KAN-514에서 붙었다. 게스트 로그인을 깔면서 "비로그인"이 사실상 사라져
 * `isLoggedIn`만으로는 댓글을 막을 근거가 없어졌다 — 게스트도 세션이 있기 때문이다.
 * 그래서 "세션이 있는가"(`isLoggedIn`)와 "소셜 계정인가"(`!isGuest`)를 따로 들고 다닌다.
 *
 * 기본값 `null`은 "provider 밖"을 뜻한다(로그인 안 함 `false`와 구분해 실수 사용을 잡는다).
 */
const AuthContext = createContext<{
  isLoggedIn: boolean;
  isGuest: boolean;
  userId: number | null;
  nickname: string | null;
} | null>(null);

/**
 * 로그인 여부 provider. 서버(루트 레이아웃)가 `isLoggedIn()`으로 읽은 값과 프로필의 닉네임을
 * 시드로 받아, 하위 클라 컴포넌트가 `useAuth()`로 꺼내 쓰게 한다.
 *
 * 세션 유무와 게스트 여부는 쿠키로 바로 안다. 프로필(userId, 닉네임)은 BE 조회라
 * 레이아웃이 기다리지 않고 Promise로 넘긴다 (KAN-602). 예전에는 레이아웃이 `/users/me`를
 * 기다린 뒤에야 자식을 그려, BE가 느리면 앱 진입과 새로고침이 그만큼 흰 화면이었다.
 * 지금은 첫 화면이 프로필 없이 뜨고, Promise가 풀리면 {@link ProfileSeedReader}가 값을
 * 채운다. 그 사이 userId와 닉네임은 null이라 내 댓글 수정·삭제 버튼과 닉네임 표시만
 * 잠깐 늦게 붙는다. 게스트 여부는 프로필이 오면 그 값으로 덮는다.
 *
 * 로그인·로그아웃은 서버 액션이 redirect하며 레이아웃을 다시 렌더하므로 그때 새
 * Promise가 내려온다. 새 값이 올 때까지는 직전 프로필을 들고 있어 닉네임이 깜빡이지 않는다.
 *
 * @param isLoggedIn 서버가 읽은 세션 존재 여부(access 쿠키 존재). 게스트도 true다 —
 *   좋아요·투표·조회 기록처럼 게스트에게 열린 기능은 이 값만 보면 된다
 * @param isGuest 게스트 마감 쿠키로 판정한 게스트 여부 (KAN-514). 프로필이 오기 전의
 *   잠정값이다. 댓글·신고·채팅처럼 소셜 전용 기능은 이 값으로 갈라 "로그인"이 아니라
 *   "계정 연동" 안내를 띄운다
 * @param profile 프로필 조각 Promise. 비로그인·조회 실패면 null로 풀린다
 */
export function AuthProvider({
  isLoggedIn,
  isGuest,
  profile,
  children,
}: {
  isLoggedIn: boolean;
  isGuest: boolean;
  profile: Promise<ProfileSeed | null>;
  children: React.ReactNode;
}) {
  const [seed, setSeed] = useState<ProfileSeed | null>(null);
  const value = {
    isLoggedIn,
    isGuest: isLoggedIn ? (seed?.isGuest ?? isGuest) : false,
    userId: isLoggedIn ? (seed?.userId ?? null) : null,
    nickname: isLoggedIn ? (seed?.nickname ?? null) : null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <ProfileSeedReader profile={profile} onLoad={setSeed} />
      </Suspense>
    </AuthContext.Provider>
  );
}

/**
 * 프로필 Promise를 풀어 provider 상태로 올린다. 아무것도 그리지 않는다. 풀리기 전에는
 * 자기 Suspense 경계 안에서만 멈추므로 형제인 화면 트리는 기다리지 않는다.
 *
 * @param profile 레이아웃이 넘긴 프로필 조각 Promise
 * @param onLoad 풀린 값을 받을 setter
 */
function ProfileSeedReader({
  profile,
  onLoad,
}: {
  profile: Promise<ProfileSeed | null>;
  onLoad: (seed: ProfileSeed | null) => void;
}) {
  const seed = use(profile);
  useEffect(() => onLoad(seed), [seed, onLoad]);
  return null;
}

/**
 * 클라 컴포넌트에서 로그인 여부·내 닉네임을 읽는다. `AuthProvider` 밖에서 부르면 에러로 잡는다.
 *
 * 컨텍스트·provider와 한 몸이라(서로의 private 컨텍스트 객체를 공유) 훅을 이 파일에 함께 둔다 —
 * 별도 `useXxx.ts`로 떼면 컨텍스트를 밖으로 export해야 해서 오히려 캡슐화가 샌다.
 *
 * @returns `{ isLoggedIn, isGuest, userId, nickname }` — 유저 정보가 더 붙으면 이 객체를 넓힌다.
 */
export function useAuth(): {
  isLoggedIn: boolean;
  isGuest: boolean;
  userId: number | null;
  nickname: string | null;
} {
  const auth = useContext(AuthContext);
  if (auth === null) {
    throw new Error("useAuth는 AuthProvider 안에서만 쓸 수 있다.");
  }
  return auth;
}
