"use client";

import { useState } from "react";
import { ApiError, needsSocialAccount } from "@plick/core/client";
import { COMMENT_REPORT_REASONS } from "@plick/domain/constants";
import type { CommentReportReason } from "@plick/domain/types";
import { CheckIcon } from "@plick/ui/icons";
import { useReportComment } from "@/_hooks/useReportComment";
import { BottomSheet, SheetActions, SheetDone } from "./BottomSheet";

/**
 * 댓글 신고 시트 (KAN-411, 시안 KAN-567). 사유 5종(스팸, 욕설, 괴롭힘, 음란, 기타)을
 * 채운 면 행으로 나열하고, 고르면 행이 강조색 틴트로 바뀌며 신고 버튼이 살아난다.
 * 신고하면 같은 시트가 완료 상태로 바뀐다.
 *
 * @param commentId - 신고할 댓글 id
 * @param onClose - 시트 닫기
 * @param onAuthRequired - 소셜 계정이 필요할 때(게스트·비로그인) 호출
 */
export function ReportCommentDialog({
  commentId,
  onClose,
  onAuthRequired,
}: {
  commentId: number;
  onClose: () => void;
  onAuthRequired: () => void;
}) {
  const [reason, setReason] = useState<CommentReportReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { mutate, isPending } = useReportComment();

  function handleSubmit() {
    if (reason === null) return;
    setError(null);
    mutate(
      { commentId, reason },
      {
        onSuccess: () => setDone(true),
        onError: (err) => {
          if (needsSocialAccount(err)) {
            onAuthRequired();
            return;
          }
          // BE 메시지가 이미 사용자용 한국어다(예: "이미 신고한 댓글입니다.")
          setError(
            err instanceof ApiError
              ? err.message
              : "신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.",
          );
        },
      },
    );
  }

  return (
    <BottomSheet onClose={onClose} label="댓글 신고" locked={isPending}>
      {done ? (
        <SheetDone
          title="신고가 접수되었어요"
          description="운영자가 확인한 뒤 조치할게요"
          onClose={onClose}
        />
      ) : (
        <>
          <p className="text-title text-text-strong tracking-heading font-black">
            댓글 신고
          </p>
          <p className="text-label-lg text-text-3 mt-1.5 mb-4">
            사유를 골라주세요
          </p>

          <div
            role="radiogroup"
            aria-label="신고 사유"
            className="flex flex-col gap-2"
          >
            {COMMENT_REPORT_REASONS.map(({ value, label }) => {
              const selected = reason === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setReason(value)}
                  className={`rounded-control flex h-12 items-center gap-2.5 border px-3.5 text-left active:opacity-70 ${
                    selected
                      ? "bg-accent-tint border-accent-border"
                      : "bg-elevate border-transparent"
                  }`}
                >
                  <span
                    className={`text-body-md flex-1 ${
                      selected
                        ? "text-accent font-bold"
                        : "text-text-strong font-medium"
                    }`}
                  >
                    {label}
                  </span>
                  {selected && (
                    <CheckIcon size={17} className="text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {error && <p className="text-caption text-danger mt-2">{error}</p>}

          <SheetActions
            onCancel={onClose}
            onConfirm={handleSubmit}
            confirmLabel="신고하기"
            disabled={reason === null}
            pending={isPending}
          />
        </>
      )}
    </BottomSheet>
  );
}
