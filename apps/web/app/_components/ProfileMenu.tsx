"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/_services/auth";
import { useAuth } from "./AuthProvider";

/** 상단 바 첫 줄 오른쪽 텍스트 링크 공통 클래스 — 12.5px 보조색, hover에 강조색 */
const LINK =
  "text-label-lg text-text-3 hover:text-accent focus-visible:outline-accent shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * 상단 바 첫 줄 오른쪽의 계정 링크 (KAN-338, 시안 KAN-567). 비로그인이면 "로그인",
 * "가입" 두 텍스트 링크이고 로그인이면 닉네임, "MY", "로그아웃"이다. 아바타 원과
 * 드롭다운은 시안에 없어 걷어냈고(프로필 이미지는 없다는 시안 규칙), 항목은 같다.
 *
 * 게스트는 비로그인 갈래다 (KAN-658). 게스트도 세션이 있어 `isLoggedIn`이 true지만,
 * 게스트는 비로그인의 기본값이지 로그인 상태가 아니다. 소셜 갈래를 그리면 자동 부여
 * 닉네임(plick123456)과 로그아웃이 떠서, 로그아웃을 누르면 기본값인 게스트마저 끊긴다.
 * "로그인" 링크가 가는 `/login`은 게스트 세션이면 연동 화면으로 열리므로 목적지도 맞다.
 *
 * 로그인 상태는 `AuthProvider`가 브라우저에서 표식 쿠키로 정한 값을 `useAuth()`로 읽는다 —
 * 헤더가 직접 fetch하지 않는다. 서버 HTML은 세션을 모르는 비로그인 모양이고, 하이드레이션 직후
 * 레이아웃 이펙트에서 첫 페인트 전에 바뀐다(KAN-667). 로그인·로그아웃 서버 액션의
 * redirect는 pathname을 바꿔 provider가 쿠키를 다시 읽으므로 따로 갱신할 필요가 없다. 온보딩
 * 전이라 닉네임이 없으면 이름 자리만 빠지고 나머지는 로그인 상태를 따른다.
 *
 * 로그아웃은 마이페이지 `LogoutButton`과 같은 흐름이다 — 서버 액션 전에
 * TanStack Query 캐시를 통째로 비운다(KAN-309). redirect가 리로드가 아니라
 * 소프트 내비게이션이라 로그인 상태로 받은 유저별 값(`likedByMe`)이 캐시에
 * 살아남기 때문이다. 확인 팝업 없이 바로 부른다.
 *
 * @param className - 래퍼에 덧붙일 클래스
 */
export function ProfileMenu({ className = "" }: { className?: string }) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const { isLoggedIn, isGuest, nickname } = useAuth();
  const isSocial = isLoggedIn && !isGuest;

  const handleLogout = () => {
    queryClient.clear();
    startTransition(() => logout());
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {isSocial ? (
        <>
          {nickname && (
            <span className="text-label-lg text-text-strong max-w-32 truncate font-bold">
              {nickname}
            </span>
          )}
          <Link href="/me" className={LINK}>
            MY
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className={`${LINK} disabled:opacity-40`}
          >
            로그아웃
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className={LINK}>
            로그인
          </Link>
          <Link href="/signup" className={LINK}>
            가입
          </Link>
        </>
      )}
    </div>
  );
}
