"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "@plick/core/client";
import { COMMENT_REPORT_REASONS } from "@plick/domain/constants";
import type { CommentReportReason } from "@plick/domain/types";
import { useReportComment } from "@/_hooks/useReportComment";

/**
 * 댓글 신고 팝업 (KAN-411) — 사유를 골라 접수한다. 기사 세부·릴 세부 시트 공용.
 *
 * `ConfirmDialog`와 같은 스크림 + 중앙 카드 관용에 사유 라디오 목록을 얹었다.
 * 접수 성공하면 카드가 "신고가 접수되었어요" 안내로 바뀐다(`ShareDialog`가
 * 복사 성공을 버튼 문구 전환으로 알리는 것과 같은 인플레이스 피드백 —
 * 토스트가 아직 코드베이스에 없어 이 관용을 따른다). 실패 문구는 카드 안에
 * 남겨 사유를 바꾸거나 다시 시도할 수 있게 한다.
 *
 * body 포털 이유는 `ConfirmDialog`와 같다 — 릴 세부 시트의 `transform` 안에서
 * `fixed` 기준 상자가 시트가 되는 것을 피한다.
 *
 * @param commentId 신고할 댓글(대댓글) id
 * @param onClose 취소·완료·스크림 탭으로 닫을 때
 * @param onAuthRequired 토큰 만료(401 `AUTH_REQUIRED`)일 때 — 호출부가 이
 *   팝업을 닫고 로그인 유도로 돌린다
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
  /* 포털 대상(document)은 서버 렌더에 없다. 마운트 뒤에만 그려 hydration을 맞춘다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [reason, setReason] = useState<CommentReportReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { mutate, isPending } = useReportComment();

  if (!mounted) return null;

  function handleSubmit() {
    if (reason === null) return;
    setError(null);
    mutate(
      { commentId, reason },
      {
        onSuccess: () => setDone(true),
        onError: (err) => {
          if (err instanceof ApiError && err.code === "AUTH_REQUIRED") {
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
    >
      {/* 스크림 — 탭하면 닫는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !isPending && onClose()}
        className="absolute inset-0"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--plk-scrim) 60%, transparent)",
        }}
      />

      <div className="bg-bg border-border rounded-card relative w-full max-w-72 border p-6">
        {done ? (
          <>
            <p
              id="report-dialog-title"
              className="text-body-lg text-text text-center font-extrabold"
            >
              신고가 접수되었어요
            </p>
            <p className="text-label text-text-3 mt-2 text-center">
              운영자가 확인한 뒤 조치할게요.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-accent text-on-accent rounded-control text-body mt-5 w-full py-3 font-extrabold active:opacity-60"
            >
              확인
            </button>
          </>
        ) : (
          <>
            <p
              id="report-dialog-title"
              className="text-body-lg text-text text-center font-extrabold"
            >
              댓글 신고
            </p>
            <p className="text-label text-text-3 mt-2 text-center">
              신고 사유를 골라 주세요.
            </p>

            <div
              role="radiogroup"
              aria-label="신고 사유"
              className="divide-border mt-4 flex flex-col divide-y"
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
                    className="flex items-center justify-between py-2.75 active:opacity-60"
                  >
                    <span
                      className={`text-body ${
                        selected ? "text-text font-bold" : "text-text-2"
                      }`}
                    >
                      {label}
                    </span>
                    {/* 라디오 표시 — 선택되면 accent 링 + 안쪽 점 */}
                    <span
                      className={`rounded-pill grid size-4.5 place-items-center border ${
                        selected ? "border-accent" : "border-border-strong"
                      }`}
                    >
                      {selected && (
                        <span className="bg-accent rounded-pill size-2.5" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="text-caption text-danger mt-2 text-center">
                {error}
              </p>
            )}

            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="border-border text-text-2 rounded-control text-body flex-1 border py-3 font-extrabold active:opacity-60 disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || reason === null}
                className="border-border-strong text-danger rounded-control text-body flex-1 border py-3 font-extrabold active:opacity-60 disabled:opacity-40"
              >
                신고하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
