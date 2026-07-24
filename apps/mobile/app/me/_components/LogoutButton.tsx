"use client";

import { useState, useTransition } from "react";
import { LogoutIcon } from "@plick/ui/icons";
import { logout } from "@/_services/auth";

/**
 * 로그아웃 버튼 + 확인 팝업 — 마이페이지의 로그아웃 상호작용을 담는 클라 경계.
 *
 * 버튼을 누르면 "정말 로그아웃할까요?" 팝업을 띄우고(오탭 방지), 확인해야 로그아웃 서버 액션을
 * 부른다. 액션이 도는 동안 `useTransition`의 `isPending`으로 팝업 버튼을 잠가 연타를 막는다.
 * 성공하면 액션이 서버에서 홈(`/`)으로 redirect하므로 여기선 닫는 처리조차 필요 없다.
 */
export function LogoutButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const confirm = () => startTransition(() => logout());

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border-strong text-danger rounded-control mt-2 flex w-full items-center justify-center gap-2 border py-3.5 active:opacity-60"
      >
        <LogoutIcon />
        <span className="text-body font-extrabold">로그아웃</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          {/* 스크림 — 탭하면 취소하고 닫는다 */}
          <button
            type="button"
            aria-label="닫기"
            onClick={() => !isPending && setOpen(false)}
            className="absolute inset-0"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--plk-scrim) 60%, transparent)",
            }}
          />

          <div className="bg-bg border-border rounded-card relative w-full max-w-72 border p-6">
            <p
              id="logout-dialog-title"
              className="text-body-lg text-text text-center font-extrabold"
            >
              정말 로그아웃할까요?
            </p>
            <p className="text-label text-text-3 mt-2 text-center">
              언제든 다시 로그인할 수 있어요.
            </p>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="border-border text-text-2 rounded-control text-body flex-1 border py-3 font-extrabold active:opacity-60 disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={isPending}
                className="border-border-strong text-danger rounded-control text-body flex-1 border py-3 font-extrabold active:opacity-60 disabled:opacity-40"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
