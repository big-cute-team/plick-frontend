"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError, needsSocialAccount } from "@plick/core/client";
import { COMMENT_REPORT_REASONS } from "@plick/domain/constants";
import type { CommentReportReason } from "@plick/domain/types";
import { useReportComment } from "@/_hooks/useReportComment";

/**
 * 댓글 신고 팝업 (KAN-411, 모바일 `ReportCommentDialog` 복제, 시안 KAN-567
 * "댓글 신고" 다이얼로그) — 사유를 골라 접수한다. 기사 세부·릴 세부 패널 공용.
 *
 * 시안: `ConfirmDialog`와 같은 각진 상자에 제목 "댓글 신고", "OOO님의 댓글을
 * 신고합니다", 사유 다섯 줄(윗선 연한 선, 13.5px, 고르면 700 제목색과 강조색 링
 * 17px), 버튼 줄은 테두리 "취소"와 빨간 "신고하기". 사유를 고르기 전에는
 * 신고 버튼이 흐리다. 접수 성공하면 "신고가 접수되었어요" 안내로 바뀐다
 * (`ShareDialog`가 복사 성공을 버튼 문구 전환으로 알리는 것과 같은 인플레이스
 * 피드백). 실패 문구는 상자 안에 남겨 사유를 바꾸거나 다시 시도할 수 있게 한다.
 *
 * body 포털 이유는 `ConfirmDialog`와 같다 — 릴 세부 패널의 `transform` 안에서
 * `fixed` 기준 상자가 패널이 되는 것을 피한다.
 *
 * @param commentId 신고할 댓글(대댓글) id
 * @param nickname 신고할 댓글의 작성자. 설명 줄에 쓴다
 * @param onClose 취소·완료·딤 클릭으로 닫을 때
 * @param onAuthRequired 토큰 만료(401 `AUTH_REQUIRED`)나 게스트 차단(403
 *   `AUTH_GUEST_FORBIDDEN`, KAN-514)일 때 — 호출부가 이
 *   팝업을 닫고 로그인 유도로 돌린다
 */
export function ReportCommentDialog({
  commentId,
  nickname,
  onClose,
  onAuthRequired,
}: {
  commentId: number;
  nickname?: string;
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
          if (needsSocialAccount(err)) {
            onAuthRequired();
            return;
          }
          // BE 메시지가 이미 사용자용 한국어다(예: "이미 신고한 댓글입니다.")
          setError(
            err instanceof ApiError
              ? err.message
              : "신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요",
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
      {/* 딤 — 클릭하면 닫는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !isPending && onClose()}
        className="bg-dim-strong absolute inset-0"
      />

      <div className="bg-bg border-border-strong shadow-dialog relative w-full max-w-76 border px-5.5 pt-5.5 pb-5">
        {done ? (
          <>
            <p
              id="report-dialog-title"
              className="text-body-lg text-text-strong text-center font-black"
            >
              신고가 접수되었어요
            </p>
            <p className="text-label-lg text-text-3 mt-2 text-center leading-[1.6]">
              운영자가 확인한 뒤 조치할게요
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-4.5 flex h-9.5 w-full items-center justify-center font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              확인
            </button>
          </>
        ) : (
          <>
            <p
              id="report-dialog-title"
              className="text-body-lg text-text-strong text-center font-black"
            >
              댓글 신고
            </p>
            <p className="text-label text-text-3 mt-1.75 text-center">
              {nickname
                ? `${nickname}님의 댓글을 신고합니다`
                : "신고 사유를 골라 주세요"}
            </p>

            <div
              role="radiogroup"
              aria-label="신고 사유"
              className="mt-4 flex flex-col"
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
                    className="border-border-soft focus-visible:outline-accent flex items-center justify-between border-t py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
                  >
                    <span
                      className={`text-body ${
                        selected ? "text-text-strong font-bold" : "text-text-2"
                      }`}
                    >
                      {label}
                    </span>
                    {/* 라디오 표시 — 선택되면 강조색 링 + 안쪽 점 */}
                    <span
                      className={`grid size-4.25 place-items-center rounded-full border ${
                        selected ? "border-accent" : "border-border-strong"
                      }`}
                    >
                      {selected && (
                        <span className="bg-accent size-2.25 rounded-full" />
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

            <div className="mt-4 flex gap-2.25">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="border-border-strong text-text-2 text-body hover:bg-elevate focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center border font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || reason === null}
                className="bg-danger text-on-accent text-body focus-visible:outline-accent inline-flex h-9.5 flex-1 items-center justify-center font-bold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
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
