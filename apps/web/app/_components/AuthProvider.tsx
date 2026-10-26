"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_ARTICLE_STATE } from "@plick/core/article-state-batch";
import { syncArticleStateMemoOwner } from "@plick/core/article-state-memo";
import { articleStateKeys } from "@plick/core/articleStateKeys";
import { requestGuestSession } from "@/_apis/guest-session";
import {
  CRAWLER_UA_PATTERN,
  GUEST_ISSUED_EVENT,
  SESSION_KIND,
  SESSION_KIND_COOKIE,
  type SessionKind,
} from "@/_constants/api";
import { useProfileSeed } from "@/_queries/useProfileSeed";
import { readCookie } from "@/_utils/cookie";
import { skipsGuestIssue } from "@/_utils/guest-issue";
import { runWhenIdle } from "@/_utils/idle";

/**
 * 로그인 여부·내 닉네임을 클라 컴포넌트로 흘려주는 컨텍스트 (모바일 `AuthProvider` 복제, KAN-318).
 *
 * 왜 컨텍스트가 필요한가: 좋아요·댓글 같은 클라 아일랜드가 화면마다 흩어져 있어, 로그인 여부를
 * 아일랜드마다 prop으로 내리지 않게 루트에서 한 번 정해 둔다.
 *
 * 전에는 그 값을 **서버가** 정했다. access 토큰이 HttpOnly 쿠키라 브라우저 JS가 못 읽으니 루트
 * 레이아웃이 `cookies()`로 판단해 prop으로 내려줬다. 그 한 줄이 레이아웃을 동적 렌더로 만들고,
 * 레이아웃은 모든 페이지의 부모라 전 라우트가 `no-store`로 나갔다(KAN-667, 모바일 KAN-632,
 * ADR 0199). 지금은 프록시가 토큰 옆에 심는 표식 쿠키 `sessionKind`(HttpOnly 아님)를
 * **브라우저가** 읽는다.
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
 * `ensureSession`과 `isSessionPending`은 KAN-667(모바일 KAN-665)에서 붙었다. 게스트 발급이 페이지
 * 응답에서 브라우저로 옮겨 와, 처음 온 사람은 화면이 뜬 뒤 잠깐 세션이 없다. 그 사이에 누른 좋아요는
 * 로그인 팝업이 아니라 발급을 기다렸다가 나가야 하고, 채팅처럼 세션이 있어야 그리는 화면은 그동안
 * "로그인하세요"를 띄우면 안 된다.
 *
 * 기본값 `null`은 "provider 밖"을 뜻한다(로그인 안 함 `false`와 구분해 실수 사용을 잡는다).
 */
const AuthContext = createContext<Auth | null>(null);

/** `useAuth`가 돌려주는 값. */
interface Auth {
  isLoggedIn: boolean;
  isGuest: boolean;
  userId: number | null;
  nickname: string | null;
  /** 세션은 있는데 프로필을 아직 받는 중인가. 이 동안 `nickname`이 null이어도 닉네임이 없다는 뜻이 아니다 */
  isProfilePending: boolean;
  /** 세션이 없으면 게스트를 받아 온다. 세션이 생겼으면(원래 있었거나 방금 받았으면) true */
  ensureSession: () => Promise<boolean>;
  /** 세션을 아직 모르거나 게스트를 받아 오는 중인가. 세션이 필요한 화면은 이 동안 안내를 미룬다 */
  isSessionPending: boolean;
}

/**
 * 로그인 여부 provider (KAN-667).
 *
 * 서버 렌더와 하이드레이션은 세션을 **모르는** 상태(`undefined`)로 그린다. 서버는 쿠키를 읽지
 * 않기로 했고, 브라우저가 쿠키를 읽은 값으로 그리면 서버 HTML과 달라져 하이드레이션 불일치가
 * 난다. 그래서 둘 다 같은 "모름"으로 그리고, `useLayoutEffect`에서 표식 쿠키를 읽어 state로
 * 올린다. 레이아웃 이펙트는 브라우저가 첫 프레임을 그리기 전에 돌고 그 안의 setState는 동기
 * 재렌더를 일으키므로, 사용자는 "모름" 상태를 한 프레임도 보지 않는다.
 *
 * 쿠키는 pathname이 바뀔 때마다 다시 읽는다. 로그인·로그아웃·연동은 서버 액션이 쿠키를 바꾸고
 * `redirect`로 화면을 옮기는데, 그 소프트 내비게이션에서 레이아웃은 다시 그려지지 않고 이
 * provider만 pathname으로 깨어난다. bfcache에서 복원됐을 때(`pageshow`의 `persisted`)도 다시
 * 읽는다. 떠나 있는 동안 다른 탭에서 로그인했을 수 있어서다.
 *
 * 내 기사 상태(좋아요·투표 여부, 모바일 KAN-664)도 세션에 묶인 값이라 여기서 같이 관리한다. 세션
 * 종류가 바뀌면(로그인·로그아웃) 이전 세션의 캐시와 브라우저 기억을 지우고, bfcache에서 복원되면
 * 떠나 있던 사이 다른 기기나 탭에서 누른 게 있을 수 있어 다시 묻는다. 복원된 화면의 나머지(본문,
 * 좋아요 수)는 누구에게나 같은 캐시 값이라 그대로 둔다.
 *
 * 프로필(userId, 닉네임)은 BE 조회라 `useProfileSeed`가 뒤에 채운다(KAN-602 때부터 기다리지
 * 않는 구조다). 그 사이 userId와 닉네임은 null이라 내 댓글 수정·삭제 버튼과 닉네임 표시만
 * 잠깐 늦게 붙는다. 게스트 여부는 프로필이 오면 그 값으로 덮는다.
 *
 * 게스트 발급(KAN-667, 모바일 KAN-665): 세션이 없으면 브라우저가 한가할 때 게스트를 받아 온다.
 * 들어온 사람은 모두 게스트로 시작한다는 KAN-514의 약속은 그대로고, 받는 자리만 페이지 응답에서
 * 이 POST로 옮겼다. `/login`·`/signup`·`/oauth`와 크롤러 UA는 받지 않는다(`skipsGuestIssue`).
 * 발급 전에 좋아요를 누르면 `ensureSession`이 같은 요청을 기다린다. 방금 받은 게스트는 누른 게
 * 하나도 없으니 내 기사 상태를 묻지 않고 "안 누름"으로 채운다. 물으면 그 응답이 막 누른 좋아요의
 * 낙관적 값을 덮을 수 있다.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  /* undefined = 아직 안 읽음(서버·하이드레이션), null = 세션 없음(쿠키 없음) */
  const [sessionKind, setSessionKind] = useState<
    SessionKind | null | undefined
  >(undefined);

  /* 이 화면에서 게스트 발급이 실패했는가. 화면을 옮기면 다시 시도한다 */
  const [issueFailed, setIssueFailed] = useState(false);
  /* 날아가는 중인 `ensureSession`. 한가할 때의 발급과 클릭이 겹쳐도 뒤처리(캐시 채우기, 이벤트)는 한 번이다 */
  const pending = useRef<Promise<boolean> | null>(null);

  useLayoutEffect(() => {
    const kind = readSessionKind();
    if (syncArticleStateMemoOwner(kind)) {
      queryClient.removeQueries({ queryKey: articleStateKeys.all });
    }
    setSessionKind(kind);
    setIssueFailed(false);
  }, [pathname, queryClient]);

  const ensureSession = useCallback(() => {
    if (readSessionKind()) return Promise.resolve(true);
    pending.current ??= (async () => {
      const result = await requestGuestSession();
      const kind = readSessionKind();
      if (!kind) {
        setIssueFailed(true);
        return false;
      }
      if (result === "issued") adoptFreshGuest(queryClient, kind);
      else if (syncArticleStateMemoOwner(kind)) {
        queryClient.removeQueries({ queryKey: articleStateKeys.all });
      }
      setSessionKind(kind);
      if (result === "issued") {
        window.dispatchEvent(new Event(GUEST_ISSUED_EVENT));
      }
      return true;
    })().finally(() => {
      pending.current = null;
    });
    return pending.current;
  }, [queryClient]);

  /* 세션이 없고 이 화면에서 게스트를 받을 사람인가. 받기로 정해진 순간부터 끝날 때까지가 "대기"다 */
  const awaitsGuest =
    sessionKind === null &&
    !issueFailed &&
    !skipsGuestIssue(pathname) &&
    !CRAWLER_UA_PATTERN.test(navigator.userAgent);

  useEffect(() => {
    if (!awaitsGuest) return;
    return runWhenIdle(() => void ensureSession());
  }, [awaitsGuest, ensureSession]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      const kind = readSessionKind();
      if (syncArticleStateMemoOwner(kind)) {
        queryClient.removeQueries({ queryKey: articleStateKeys.all });
      } else {
        void queryClient.invalidateQueries({ queryKey: articleStateKeys.all });
      }
      setSessionKind(kind);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [queryClient]);

  const { seed, isLoading: isProfileLoading } = useProfileSeed(
    sessionKind ?? null,
  );
  const isLoggedIn = sessionKind !== undefined && sessionKind !== null;
  const value: Auth = {
    isLoggedIn,
    isGuest: isLoggedIn
      ? (seed?.isGuest ?? sessionKind === SESSION_KIND.guest)
      : false,
    userId: isLoggedIn ? (seed?.userId ?? null) : null,
    nickname: isLoggedIn ? (seed?.nickname ?? null) : null,
    isProfilePending: isLoggedIn && isProfileLoading,
    ensureSession,
    isSessionPending: sessionKind === undefined || awaitsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 방금 받은 게스트로 세션을 넘긴다 (KAN-667). 새 게스트는 누른 기사가 없으므로 아직 값이 없는 내 기사
 * 상태 캐시를 "안 누름"으로 채운다. `staleTime`이 무한이라 채운 캐시는 다시 묻지 않는다. 발급을
 * 기다리던 좋아요가 낙관적으로 적어 둔 값은 이미 들어 있어 건드리지 않는다. 브라우저 기억의 주인도
 * 새 게스트로 바꾼다. 세션이 없던 자리라 지울 기억이 없으니 캐시를 비우지 않는다.
 *
 * @param queryClient 앱 쿼리 클라이언트
 * @param kind 방금 읽은 세션 종류
 */
function adoptFreshGuest(queryClient: QueryClient, kind: SessionKind): void {
  syncArticleStateMemoOwner(kind);
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: articleStateKeys.all })) {
    if (query.state.data === undefined) {
      queryClient.setQueryData(query.queryKey, DEFAULT_ARTICLE_STATE);
    }
  }
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
 * @returns 세션 값과 `ensureSession`. 유저 정보가 더 붙으면 {@link Auth}를 넓힌다.
 */
export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (auth === null) {
    throw new Error("useAuth는 AuthProvider 안에서만 쓸 수 있다.");
  }
  return auth;
}
