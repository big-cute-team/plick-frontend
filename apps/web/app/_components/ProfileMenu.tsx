"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { UserRoundIcon } from "@plick/ui/icons";
import { avatarInitials } from "@plick/domain/format";
import { logout } from "@/_services/auth";
import { useAuth } from "./AuthProvider";

/** 드롭다운 항목 공통 클래스 — MobileNav 패널 항목과 같은 밀도 */
const ITEM =
  "text-body rounded-control hover:bg-elevate focus-visible:outline-accent px-3 py-2.5 text-left font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2";

/**
 * 헤더 우측 프로필 메뉴 — 아바타 버튼 + 펼침 드롭다운 (KAN-338).
 *
 * 기능 없는 프로필 아이콘을 걷어냈다가 메뉴를 달아 되살렸다. 로그인 상태는
 * 루트 레이아웃이 `AuthProvider`로 시드한 값을 `useAuth()`로 읽는다 — 헤더가
 * 직접 fetch하지 않는다. 값은 서버 렌더 시점에 박히고 로그인·로그아웃 서버
 * 액션의 redirect가 새 렌더를 일으키므로 따로 갱신할 필요가 없다.
 *
 * 비로그인이면 사람 아이콘 버튼에 "로그인하러 가기" 하나, 로그인이면 댓글과
 * 같은 관용구(`avatarInitials`)로 닉네임 앞 두 글자를 자른 아바타 버튼에
 * "마이페이지 가기"·"로그아웃 하기" 둘을 보여준다. 온보딩 전이라 닉네임이
 * 없으면 아이콘으로 폴백하되 메뉴는 로그인 상태를 따른다.
 *
 * 로그아웃은 마이페이지 `LogoutButton`과 같은 흐름이다 — 서버 액션 전에
 * TanStack Query 캐시를 통째로 비운다(KAN-309). redirect가 리로드가 아니라
 * 소프트 내비게이션이라 로그인 상태로 받은 유저별 값(`likedByMe`)이 캐시에
 * 살아남기 때문이다. 여기는 헤더 드롭다운이라 확인 팝업 없이 바로 부른다.
 *
 * 펼침·백드롭 구조는 `MobileNav`와 같다.
 *
 * @param className - 래퍼에 덧붙일 클래스
 */
export function ProfileMenu({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const { isLoggedIn, nickname } = useAuth();

  const handleLogout = () => {
    queryClient.clear();
    startTransition(() => logout());
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label="프로필 메뉴"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="bg-avatar text-icon focus-visible:outline-accent grid size-8.5 shrink-0 place-items-center rounded-full hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {isLoggedIn && nickname ? (
          <span className="text-micro font-extrabold">
            {avatarInitials(nickname)}
          </span>
        ) : (
          <UserRoundIcon size={18} />
        )}
      </button>

      {open && (
        <>
          {/* 바깥 클릭으로 닫기 — 헤더 아래 전체를 덮는 투명 백드롭 */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 z-30 cursor-default"
          />
          <div className="bg-nav border-border rounded-card absolute top-full right-0 z-40 mt-2 flex w-44 flex-col gap-1 border p-2 shadow-lg">
            {isLoggedIn ? (
              <>
                <Link
                  href="/me"
                  onClick={() => setOpen(false)}
                  className={`${ITEM} text-text-2 hover:text-text`}
                >
                  마이페이지 가기
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isPending}
                  className={`${ITEM} text-danger disabled:opacity-40`}
                >
                  로그아웃 하기
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className={`${ITEM} text-text-2 hover:text-text`}
              >
                로그인하러 가기
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
