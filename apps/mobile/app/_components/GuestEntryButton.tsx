"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 로그인 없이 이용하기 버튼 + 안내 팝업 — 인증 화면 하단의 비로그인 진입 경로 (KAN-300).
 *
 * 버튼을 누르면 바로 홈으로 보내지 않고, 비로그인 상태에서는 일부 기능을 쓸 수 없다는
 * 안내 팝업을 먼저 띄운다. "계속하기"를 눌러야 홈으로 이동한다.
 * 마이페이지 로그아웃 확인 팝업(`LogoutButton`)과 같은 스크림 + 카드 관용.
 */
export function GuestEntryButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-label text-text-4 mx-auto block font-semibold underline active:opacity-60"
      >
        로그인 없이 이용하기
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-entry-dialog-title"
        >
          {/* 스크림 — 탭하면 취소하고 닫는다 */}
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--plk-scrim) 60%, transparent)",
            }}
          />

          <div className="bg-bg border-border rounded-card relative w-full max-w-72 border p-6">
            <p
              id="guest-entry-dialog-title"
              className="text-body-lg text-text text-center font-extrabold"
            >
              로그인 없이 이용할까요?
            </p>
            <p className="text-label text-text-3 mt-2 text-center">
              비로그인 상태에서는 좋아요, 댓글, 응원팀 설정 같은 일부 기능을
              사용하지 못할 수 있어요.
            </p>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border-border text-text-2 rounded-control text-body flex-1 border py-3 font-extrabold active:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="bg-accent text-on-accent rounded-control text-body flex-1 py-3 font-extrabold active:opacity-60"
              >
                계속하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
