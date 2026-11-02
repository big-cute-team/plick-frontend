"use client";

import Link from "next/link";
import { BottomSheet } from "@/_components/BottomSheet";
import { SocialLoginActions } from "@/_components/SocialLoginActions";
import { PREDICTION_LINK_NOTICE } from "@/_constants/predictions";

/**
 * 예측 인증 실패와 게스트 제출 성공의 연동 안내. 성공 안내를 닫아도 저장한 예측은 유지한다.
 * @param mode `login`은 인증 실패, `link`는 권한 거절, `submitted`는 게스트 제출 성공
 * @param onClose 안내 닫기
 */
export function PredictionAuthSheet({
  mode,
  onClose,
}: {
  mode: "login" | "link" | "submitted";
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
        {mode === "submitted" ? "예측이 등록됐어요" : PREDICTION_LINK_NOTICE}
      </p>
      {mode === "submitted" && (
        <p className="text-body text-text-3 mt-3 leading-relaxed">
          계정을 연동하고 예측 기록을 쌓아 보세요. 적중률과 시즌 랭킹도 확인할
          수 있어요.
        </p>
      )}
      <div className="mt-5 flex gap-2.25">
        <button
          type="button"
          onClick={onClose}
          className="bg-chip text-text-2 rounded-control text-body-md flex h-12 flex-1 items-center justify-center font-bold active:opacity-60"
        >
          {mode === "submitted" ? "나중에" : "취소"}
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
