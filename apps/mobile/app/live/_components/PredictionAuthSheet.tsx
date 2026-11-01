"use client";

import Link from "next/link";
import { BottomSheet } from "@/_components/BottomSheet";
import { SocialLoginActions } from "@/_components/SocialLoginActions";
import { PREDICTION_LINK_NOTICE } from "@/_constants/predictions";

/**
 * 예측 작성의 로그인·연동 시트 (KAN-696, 시안 가이드 §5.5 로그인 분기). 비로그인은 `로그인` 제목
 * 아래 소셜 버튼이 바로 서고, 게스트는 `계정 연동 후 예측할 수 있어요`에 취소와 연동하기다.
 * 댓글의 `LoginPromptDialog`는 "로그인이 필요해요" 안내 뒤 로그인 화면으로 보내는 두 단계인데,
 * 시안은 예측 시트에서 소셜 버튼을 바로 누르게 그려 따로 둔다.
 *
 * 소셜 로그인은 OAuth 인가 페이지로 나가는 하드 내비게이션이라 돌아오면 이 화면 상태가 없다.
 * 고른 픽과 쓰던 글은 작성 시트가 경기별 임시 저장에 적어 두어 다시 들어와 작성을 누르면 살아난다.
 *
 * @param mode `login`은 비로그인, `link`는 게스트
 * @param onClose 시트 닫기
 */
export function PredictionAuthSheet({
  mode,
  onClose,
}: {
  mode: "login" | "link";
  onClose: () => void;
}) {
  if (mode === "login") {
    return (
      <BottomSheet onClose={onClose} label="로그인">
        <p className="text-title text-text-strong tracking-heading font-black">
          로그인
        </p>
        <div className="mt-4.5 flex flex-col gap-2">
          <SocialLoginActions actionLabel="계속" />
        </div>
      </BottomSheet>
    );
  }
  return (
    <BottomSheet onClose={onClose} label="계정 연동 안내">
      <p className="text-title text-text-strong tracking-heading font-black">
        {PREDICTION_LINK_NOTICE}
      </p>
      <div className="mt-5 flex gap-2.25">
        <button
          type="button"
          onClick={onClose}
          className="bg-chip text-text-2 rounded-control text-body-md flex h-12 flex-1 items-center justify-center font-bold active:opacity-60"
        >
          취소
        </button>
        <Link
          href="/login"
          className="bg-text-strong text-on-accent rounded-control text-body-md flex h-12 flex-1 items-center justify-center font-bold active:opacity-60"
        >
          연동하기
        </Link>
      </div>
    </BottomSheet>
  );
}
