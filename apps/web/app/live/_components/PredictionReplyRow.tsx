"use client";

import { useEffect, useRef, useState } from "react";
import { classifyPredictionError } from "@plick/core/prediction-errors";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import {
  isPredictionReplyLengthValid,
  PREDICTION_TEXT_MAX_LENGTH,
  predictionPickLabel,
  type PredictionReply,
} from "@plick/domain/prediction";
import { HeartMiniIcon } from "@plick/ui/icons";
import { ConfirmDialog } from "@/_components/ConfirmDialog";
import { LoginPromptDialog } from "@/_components/LoginPromptDialog";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { PREDICTION_REPLY_DELETE_TITLE } from "@/_constants/predictions";
import { useDeletePredictionReply } from "@/_hooks/useDeletePredictionReply";
import { usePredictionReplyLike } from "@/_hooks/usePredictionReplyLike";
import { useUpdatePredictionReply } from "@/_hooks/useUpdatePredictionReply";
import { PredictionMoreActions } from "./PredictionOpinionActions";

/** 액션 줄의 보조 글자 버튼(답장·수정·삭제). 12px 보조색, hover에 강조색 */
const ACTION =
  "text-label text-text-3 hover:text-accent focus-visible:outline-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * 예측 답글 한 행 (KAN-698, 시안 가이드 §5.6, 모바일 `PredictionReplyRow`의 웹 판). 첫 줄은
 * 닉네임 13/700, 작성자가 이 경기에 낸 픽 배지(`authorPick`, 없으면 생략. 회색 면 위라 흰 배지),
 * 시간이다. 본문 14px, 하단은 하트와 수, 답장, 내 답글이면 수정과 삭제, 남의 답글이면 신고와
 * 차단이다(티켓 완료 조건).
 *
 * 답장은 입력줄에 `@닉네임 `을 채우는 것이 전부라(`onReplyTo`) 닉네임만 올려 보낸다. 수정은 본문
 * 자리가 인라인 폼으로 바뀐다. 삭제는 확인 팝업을 거친다. 둘 다 소셜 계정만 되는데 내 답글
 * (`isMine`)이 보이는 건 이미 소셜이라 분기가 없고, 토큰 만료 401은 팝업 안 문구로 받는다.
 *
 * @param reply 답글
 * @param matchId 이 답글이 달린 의견의 경기 id. 삭제 뒤 의견 목록 무효화에 쓴다
 * @param predictionId 이 답글이 달린 의견 id. 캐시 키에 쓴다
 * @param teams 홈·원정 팀명(픽 라벨용)
 * @param onReplyTo 답장을 눌렀을 때. 호출부가 입력줄을 채우고 포커스한다
 */
export function PredictionReplyRow({
  reply,
  matchId,
  predictionId,
  teams,
  onReplyTo,
}: {
  reply: PredictionReply;
  matchId: number;
  predictionId: number;
  teams: { home: string; away: string };
  onReplyTo: (nickname: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="border-border-soft border-b py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.75 gap-y-1">
        <span className="text-body text-text-strong font-bold">
          {reply.author.nickname}
        </span>
        {reply.authorPick && (
          <span className="bg-bg text-caption text-text-2 inline-flex h-5 items-center px-1.5 font-bold">
            {predictionPickLabel(reply.authorPick, teams)}
          </span>
        )}
        {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게 달라진다 */}
        <span className="text-caption text-text-4" suppressHydrationWarning>
          {formatRelativeTime(reply.createdAt)}
          {reply.isEdited && ", 수정됨"}
        </span>
      </div>

      {editing ? (
        <ReplyEditForm
          reply={reply}
          predictionId={predictionId}
          onClose={() => setEditing(false)}
        />
      ) : (
        <>
          <p className="text-body-md text-text mt-1.25 leading-[1.6] break-words whitespace-pre-wrap">
            {reply.content}
          </p>
          <div className="flex items-center gap-3.25 pt-1.75">
            <ReplyLikeButton reply={reply} predictionId={predictionId} />
            <button
              type="button"
              onClick={() => onReplyTo(reply.author.nickname)}
              className={ACTION}
            >
              답장
            </button>
            {reply.isMine ? (
              <MineActions
                reply={reply}
                matchId={matchId}
                predictionId={predictionId}
                onEdit={() => setEditing(true)}
              />
            ) : (
              <PredictionMoreActions
                target={{ kind: "reply", id: reply.id }}
                author={reply.author}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 답글 공감 버튼. 의견 공감과 같은 모양(12px 하트)이고 게스트도 된다. 낙관 갱신과 롤백은
 * `usePredictionReplyLike`가 한다.
 */
function ReplyLikeButton({
  reply,
  predictionId,
}: {
  reply: PredictionReply;
  predictionId: number;
}) {
  const like = usePredictionReplyLike(predictionId, reply);

  return (
    <>
      <button
        type="button"
        onClick={like.toggle}
        aria-pressed={reply.liked}
        aria-label={`공감 ${formatCount(reply.likeCount)}`}
        className="text-label text-like focus-visible:outline-accent inline-flex items-center gap-1 font-bold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <HeartMiniIcon size={12} filled={reply.liked} />
        {formatCount(reply.likeCount)}
      </button>

      {like.needsLogin && (
        <LoginPromptDialog
          onClose={like.dismissLogin}
          description={LIKE_LOGIN_PROMPT}
        />
      )}
    </>
  );
}

/**
 * 내 답글의 수정·삭제 글자 버튼. 삭제는 확인 팝업을 거치고 실패 문구는 팝업 안에 남긴다. 성공하면
 * 캐시에서 바로 빠져(`useDeletePredictionReply`) 팝업을 닫기만 하면 된다.
 */
function MineActions({
  reply,
  matchId,
  predictionId,
  onEdit,
}: {
  reply: PredictionReply;
  matchId: number;
  predictionId: number;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = useDeletePredictionReply(matchId, predictionId);

  function handleDelete() {
    setError(null);
    remove.mutate(reply.id, {
      onSuccess: () => setConfirming(false),
      onError: (err) => setError(classifyPredictionError(err).message),
    });
  }

  return (
    <>
      <button type="button" onClick={onEdit} className={ACTION}>
        수정
      </button>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className={ACTION}
      >
        삭제
      </button>

      {confirming && (
        <ConfirmDialog
          title={PREDICTION_REPLY_DELETE_TITLE}
          description="지운 답글은 되돌릴 수 없어요"
          confirmLabel="삭제"
          pending={remove.isPending}
          error={error}
          onConfirm={handleDelete}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}

/**
 * 답글 인라인 수정 폼. 수정을 누른 순간 생기므로 바로 포커스한다. 저장은 캐시의 그 답글을
 * 응답으로 덮고(`useUpdatePredictionReply`) 폼만 닫는다. 금칙어 400 `PREDICTION_REPLY_BLOCKED`는
 * 입력란 테두리와 가이드 문구로, 그 밖은 분류된 문구로 폼 아래 남긴다.
 */
function ReplyEditForm({
  reply,
  predictionId,
  onClose,
}: {
  reply: PredictionReply;
  predictionId: number;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(reply.content);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const update = useUpdatePredictionReply(predictionId);
  const canSave = isPredictionReplyLengthValid(value) && !update.isPending;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setError(null);
    setBlocked(false);
    update.mutate(
      { replyId: reply.id, content: value.trim() },
      {
        onSuccess: onClose,
        onError: (err) => {
          const failure = classifyPredictionError(err);
          setBlocked(failure.kind === "blocked-word");
          setError(failure.message);
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-1.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          aria-label="답글 수정"
          value={value}
          maxLength={PREDICTION_TEXT_MAX_LENGTH}
          onChange={(e) => {
            setValue(e.target.value);
            setBlocked(false);
          }}
          className={`bg-bg text-body text-text focus-visible:border-accent h-8.5 min-w-0 flex-1 border px-2.75 focus-visible:outline-none ${
            blocked ? "border-text-strong" : "border-border-table"
          }`}
        />
        <button
          type="button"
          onClick={onClose}
          className="text-label text-text-3 hover:text-text-strong focus-visible:outline-accent inline-flex h-8.5 shrink-0 items-center px-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="text-label text-accent hover:text-accent-hover focus-visible:outline-accent inline-flex h-8.5 shrink-0 items-center px-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
        >
          저장
        </button>
      </div>
      {error && <p className="text-caption text-danger-strong px-1">{error}</p>}
    </form>
  );
}
