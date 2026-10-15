"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  SESSION_KIND,
  SESSION_KIND_COOKIE,
  type SessionKind,
} from "@/_constants/api";
import { useProfileSeed } from "@/_queries/useProfileSeed";
import { readCookie } from "@/_utils/cookie";

/**
 * 로그인 여부·내 닉네임을 클라 컴포넌트로 흘려주는 컨텍스트.
 *
 * 왜 컨텍스트가 필요한가: 좋아요·댓글 같은 클라 아일랜드가 화면마다 흩어져 있어, 로그인 여부를
 * 아일랜드마다 prop으로 내리지 않게 루트에서 한 번 정해 둔다.
 *
 * 전에는 그 값을 **서버가** 정했다. access 토큰이 HttpOnly 쿠키라 브라우저 JS가 못 읽으니 루트
 * 레이아웃이 `cookies()`로 판단해 prop으로 내려줬다. 그 한 줄이 레이아웃을 동적 렌더로 만들고,
 * 레이아웃은 모든 페이지의 부모라 전 라우트가 `no-store`로 나갔다(KAN-632, ADR 0199). 지금은
 * 프록시가 토큰 옆에 심는 표식 쿠키 `sessionKind`(HttpOnly 아님)를 **브라우저가** 읽는다.
 *
 * userId는 내 댓글 판별(KAN-333 수정·삭제 버튼)과 차단 셀프 가드(KAN-411)에 쓴다.
 * 원래는 댓글 응답에 작성자 식별 필드가 없어 닉네임 대조가 유일한 수단이었는데, KAN-411에서
 * BE가 댓글에 `userId`를 실어 주면서 id 대조로 바꿨다 — 닉네임은 변경 가능한 값이라 대조
 * 근거로는 약했다. 닉네임은 표시용으로 남는다.
 *
 * `isGuest`는 KAN-514에서 붙었다. 게스트 로그인을 깔면서 "비로그인"이 사실상 사라져
 * `isLoggedIn`만으로는 댓글을 막을 근거가 없어졌다 — 게스트도 세션이 있기 때문이다.
 * 그래서 "세션이 있는가"(`isLoggedIn`)와 "소셜 계정인가"(`!isGuest`)를 따로 들고 다닌다.
 * BE KAN-656(FE KAN-657)부터 게스트도 댓글·채팅을 쓰므로 `isGuest`로 막는 건 신고뿐이다.
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
 * 로그인 여부 provider (KAN-632).
 *
 * 서버 렌더와 하이드레이션은 세션을 **모르는** 상태(`undefined`)로 그린다. 서버는 쿠키를 읽지
 * 않기로 했고, 브라우저가 쿠키를 읽은 값으로 그리면 서버 HTML과 달라져 하이드레이션 불일치가
 * 난다. 그래서 둘 다 같은 "모름"으로 그리고, `useLayoutEffect`에서 표식 쿠키를 읽어 state로
 * 올린다. 레이아웃 이펙트는 브라우저가 첫 프레임을 그리기 전에 돌고 그 안의 setState는 동기
 * 재렌더를 일으키므로, 사용자는 "모름" 상태를 한 프레임도 보지 않는다. `<head>` 동기
 * 스크립트로 `<html>`에 값을 박는 방법도 생각했는데, 하이드레이션 첫 패스는 어차피 서버
 * 스냅샷으로 그려야 해서 이득이 없었다.
 *
 * 쿠키는 pathname이 바뀔 때마다 다시 읽는다. 로그인·로그아웃·연동은 서버 액션이 쿠키를 바꾸고
 * `redirect`로 화면을 옮기는데, 그 소프트 내비게이션에서 레이아웃은 다시 그려지지 않고 이
 * provider만 pathname으로 깨어난다. bfcache에서 복원됐을 때(`pageshow`의 `persisted`)도 다시
 * 읽는다. 떠나 있는 동안 다른 탭에서 로그인했을 수 있어서다.
 *
 * 프로필(userId, 닉네임)은 BE 조회라 `useProfileSeed`가 뒤에 채운다(KAN-602 때부터 기다리지
 * 않는 구조다). 그 사이 userId와 닉네임은 null이라 내 댓글 수정·삭제 버튼과 닉네임 표시만
 * 잠깐 늦게 붙는다. 게스트 여부는 프로필이 오면 그 값으로 덮는다.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  /* undefined = 아직 안 읽음(서버·하이드레이션), null = 세션 없음(쿠키 없음) */
  const [sessionKind, setSessionKind] = useState<
    SessionKind | null | undefined
  >(undefined);

  useLayoutEffect(() => {
    setSessionKind(readSessionKind());
  }, [pathname]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setSessionKind(readSessionKind());
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const seed = useProfileSeed(sessionKind ?? null);
  const isLoggedIn = sessionKind !== undefined && sessionKind !== null;
  const value = {
    isLoggedIn,
    isGuest: isLoggedIn
      ? (seed?.isGuest ?? sessionKind === SESSION_KIND.guest)
      : false,
    userId: isLoggedIn ? (seed?.userId ?? null) : null,
    nickname: isLoggedIn ? (seed?.nickname ?? null) : null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 표식 쿠키를 읽는다. 아는 값이 아니면 세션 없음으로 본다. 브라우저에서 고친 값을 그대로
 * 믿지 않는 건 `GuestNoticeToast`와 같은 이유다.
 */
function readSessionKind(): SessionKind | null {
  const value = readCookie(SESSION_KIND_COOKIE);
  return value === SESSION_KIND.guest || value === SESSION_KIND.user
    ? value
    : null;
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
