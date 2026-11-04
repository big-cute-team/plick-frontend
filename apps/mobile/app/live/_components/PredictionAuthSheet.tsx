"use client";

import Link from "next/link";
import { BottomSheet } from "@/_components/BottomSheet";
import { SocialLoginActions } from "@/_components/SocialLoginActions";
import {
  PREDICTION_LINK_NOTICE,
  PREDICTION_SUBMITTED_BODY,
  PREDICTION_SUBMITTED_TITLE,
} from "@/_constants/predictions";

/**
 * 예측 인증 실패와 게스트 제출 성공의 연동 안내. 성공 안내를 닫아도 저장한 예측은 유지한다. 제출 성공
 * 문구는 랭킹의 고수 기록을 보라는 연동 유도다(`PREDICTION_SUBMITTED_TITLE`).
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
        {mode === "submitted"
          ? PREDICTION_SUBMITTED_TITLE
          : PREDICTION_LINK_NOTICE}
      </p>
      {mode === "submitted" && (
        <p className="text-body text-text-3 mt-3 leading-relaxed">
          {PREDICTION_SUBMITTED_BODY}
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
