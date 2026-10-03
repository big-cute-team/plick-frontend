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
 * 로그인 상태는 루트 레이아웃이 `AuthProvider`로 시드한 값을 `useAuth()`로 읽는다 —
 * 헤더가 직접 fetch하지 않는다. 값은 서버 렌더 시점에 박히고 로그인·로그아웃 서버
 * 액션의 redirect가 새 렌더를 일으키므로 따로 갱신할 필요가 없다. 온보딩 전이라
 * 닉네임이 없으면 이름 자리만 빠지고 나머지는 로그인 상태를 따른다.
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
  const { isLoggedIn, nickname } = useAuth();

  const handleLogout = () => {
    queryClient.clear();
    startTransition(() => logout());
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {isLoggedIn ? (
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
