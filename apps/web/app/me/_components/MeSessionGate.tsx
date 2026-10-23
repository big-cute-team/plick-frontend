"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/_components/AuthProvider";

/**
 * 서버가 "세션 없음"으로 그린 MY 안내를 감싸, 브라우저가 게스트를 받은 뒤 화면을 한 번 다시 받는다
 * (KAN-667, 모바일 KAN-665 이식).
 *
 * MY는 쿠키로 그리는 동적 화면이다. 게스트 발급이 페이지 응답에서 브라우저로 옮겨 오면서, 첫 방문이
 * 곧장 `/me`면 서버는 토큰 없이 "로그인" 안내를 그리고 그 뒤에 게스트가 생긴다. 서버 HTML은 그대로라
 * 다시 들어오기 전까지 게스트인데도 로그인 안내가 남았다. 세션이 생긴 걸 보면 `router.refresh()`로
 * 서버 컴포넌트를 다시 받는다. 이번에는 쿠키가 있어 게스트 화면(연동 안내)이 내려온다.
 *
 * 발급을 기다리는 동안과 다시 받는 동안은 안내를 숨긴다. "로그인"이 잠깐 보였다 "계정 연동"으로
 * 바뀌는 깜빡임을 막는다. 다시 받았는데도 이 자리가 남아 있으면(토큰이 무효인 세션) 그때는 안내를 보인다.
 * 한 번만 다시 받는다. 다시 받아도 이 컴포넌트는 같은 자리에 남아 이펙트가 다시 돌지 않는다.
 *
 * @param children 서버가 그린 로그인 안내
 */
export function MeSessionGate({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isSessionPending } = useAuth();
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const refreshed = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || refreshed.current) return;
    refreshed.current = true;
    startTransition(() => router.refresh());
  }, [isLoggedIn, router]);

  if (isSessionPending) return null;
  if (isLoggedIn && (!refreshed.current || refreshing)) return null;
  return children;
}
