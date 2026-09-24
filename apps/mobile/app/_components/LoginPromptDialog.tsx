"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { BottomSheet } from "./BottomSheet";

/**
 * 로그인(또는 게스트 계정 연동)이 필요할 때 올라오는 시트. 댓글·좋아요·투표·신고가
 * 같이 쓴다. 시안(KAN-567)대로 팝업이 아니라 바텀 시트다.
 *
 * @param onClose - 시트 닫기
 * @param description - 어떤 행동에 로그인이 필요한지
 */
export function LoginPromptDialog({
  onClose,
  description = "댓글은 로그인한 사용자만 남길 수 있어요.",
}: {
  onClose: () => void;
  description?: string;
}) {
  const { isGuest } = useAuth();

  return (
    <BottomSheet onClose={onClose} label="로그인 안내">
      <p className="text-title text-text-strong tracking-heading font-black">
        {isGuest ? "계정 연동이 필요해요" : "로그인이 필요해요"}
      </p>
      <p className="text-body text-text-3 mt-2 leading-relaxed">
        {isGuest
          ? "댓글과 신고, 채팅은 소셜 계정을 연동해야 쓸 수 있어요. 지금까지 기록은 그대로 이어져요."
          : description}
      </p>
      <div className="mt-4.5 flex gap-2.25">
        <button
          type="button"
          onClick={onClose}
          className="border-border-strong text-text-2 rounded-control text-body-md flex h-12 flex-1 items-center justify-center border font-bold active:opacity-60"
        >
          닫기
        </button>
        <Link
          href="/login"
          className="bg-accent text-on-accent rounded-control text-body-md flex h-12 flex-1 items-center justify-center font-bold active:opacity-60"
        >
          {isGuest ? "계정 연동" : "로그인"}
        </Link>
      </div>
    </BottomSheet>
  );
}
