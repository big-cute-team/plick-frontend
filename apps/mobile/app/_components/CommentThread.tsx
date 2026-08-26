"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "@plick/core/client";
import { avatarInitials, formatCount } from "@plick/domain/format";
import { ChevronMiniIcon, HeartMiniIcon, MoreIcon } from "@plick/ui/icons";
import type { ArticleComment } from "@plick/domain/types";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { useBlockUser } from "@/_hooks/useBlockUser";
import { useCommentLike } from "@/_hooks/useCommentLike";
import { useDeleteComment } from "@/_hooks/useDeleteComment";
import { formatRelativeTime } from "@plick/domain/format";
import { useAuth } from "./AuthProvider";
import { CommentComposer } from "./CommentComposer";
import { CommentEditForm } from "./CommentEditForm";
import { ConfirmDialog } from "./ConfirmDialog";
import { LoginPromptDialog } from "./LoginPromptDialog";
import { ReportCommentDialog } from "./ReportCommentDialog";

/**
 * 댓글 한 스레드 — 원 댓글 + (있으면) 접힌 답글들. 기사 세부·릴 세부 시트 공용.
 *
 * 답글은 유튜브 숏츠처럼 기본으로 접혀 있고 "답글 N개"를 눌러야 펼쳐진다
 * (KAN-307). 내가 답글을 새로 달면 바로 보이도록 자동으로 펼친다.
 *
 * "답글"을 누르면 유튜브처럼 그 원 댓글 바로 밑에 답글 입력바가 인라인으로
 * 생긴다(기존 답글들 위). 열림 상태는 스레드마다 각자 든다 — 스레드 여러 개가
 * 동시에 열려도 서로 간섭하지 않는다. 등록 성공·취소가 입력바를 접는다.
 *
 * @param articleId 이 댓글이 달린 기사(릴) id — 인라인 답글 작성에 쓴다
 * @param onPosted 답글 등록 성공 시 호출 — 호출부가 헤더 카운트를 올리는 데 쓴다
 * @param onDeleted 댓글(답글) 삭제 성공 시 호출 — 호출부가 헤더 카운트를 내리는 데 쓴다
 */
export function CommentThread({
  comment,
  articleId,
  onPosted,
  onDeleted,
}: {
  comment: ArticleComment;
  articleId: string;
  onPosted?: () => void;
  onDeleted?: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasReplies = comment.replies.length > 0;

  return (
    <div className="flex flex-col gap-3.75">
      <CommentItem
        comment={comment}
        articleId={articleId}
        onReply={() => setReplying(true)}
        onDeleted={onDeleted}
      />

      {replying && (
        <CommentComposer
          articleId={articleId}
          parentCommentId={comment.id}
          onCancel={() => setReplying(false)}
          onPosted={() => {
            setExpanded(true);
            onPosted?.();
          }}
          className="pl-10"
        />
      )}

      {hasReplies && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-caption text-accent flex items-center gap-1 pl-10 font-semibold active:opacity-60"
        >
          답글 {comment.replies.length}개
          <ChevronMiniIcon
            size={11}
            className={expanded ? "-rotate-90" : "rotate-90"}
          />
        </button>
      )}

      {expanded &&
        comment.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            articleId={articleId}
            reply
            onDeleted={onDeleted}
          />
        ))}
    </div>
  );
}

/**
 * 댓글 한 줄 (아바타 + 작성자/시간 + 본문 + 좋아요·답글).
 *
 * 삭제된 댓글은 목록에서 빠지지 않고 tombstone으로 온다(`content` null) —
 * 답글이 딸린 원 댓글이 지워져도 답글은 계속 보여야 해서다. 본문 자리에
 * 안내 문구만 남기고 액션 줄은 감춘다.
 *
 * 답글 버튼은 원 댓글에만 둔다 — BE가 대댓글의 답글도 막지는 않지만 조회가
 * 최상위 아래로 평탄화되므로 화면은 1단까지만 연다(KAN-303, be-verify 확인).
 * 좋아요는 원 댓글과 대댓글이 같은 엔드포인트를 쓰므로 양쪽에 그대로 둔다.
 *
 * 내 댓글이면 수정·삭제 버튼을(KAN-333), 남의 댓글이면 신고·차단 ⋯ 메뉴를
 * (KAN-411) 얹는다. 내 댓글 판별은 작성자 `userId` 대조다 — KAN-411에서 BE가
 * 댓글에 작성자 id를 실어 주면서 닉네임 대조를 교체했다(닉네임은 변경 가능한
 * 값이라 대조 근거로 약했다). 오판해도 BE가 403 `COMMENT_FORBIDDEN`으로 막는다.
 *
 * 차단한 사용자의 댓글(`isBlocked`)과 운영자 블라인드 댓글(`isBlinded`)은
 * tombstone처럼 본문 자리에 안내 문구만 남기고 액션 줄을 감춘다 — 서버가
 * 목록에서 빼지 않고 플래그로 내려주므로(be-verify 확인) 표시는 화면 몫이다.
 *
 * @param articleId - 이 댓글이 달린 기사(릴) id — 좋아요 캐시 갱신에 쓴다
 * @param reply - 답글이면 들여쓰기 + 작은 아바타로 렌더
 * @param onReply - "답글" 탭 콜백. 없거나 답글 행이면 버튼을 그리지 않는다
 * @param onDeleted - 삭제 성공 콜백. 호출부가 헤더 카운트를 내리는 데 쓴다
 */
function CommentItem({
  comment,
  articleId,
  reply,
  onReply,
  onDeleted,
}: {
  comment: ArticleComment;
  articleId: string;
  reply?: boolean;
  onReply?: () => void;
  onDeleted?: () => void;
}) {
  const { userId: myUserId } = useAuth();
  const [editing, setEditing] = useState(false);

  const mine = myUserId !== null && comment.userId === myUserId;

  return (
    <div className={`flex gap-2.5 ${reply ? "pl-10" : ""}`}>
      <span
        className={`bg-avatar text-icon rounded-pill text-micro flex shrink-0 items-center justify-center font-extrabold ${
          reply ? "size-6.5" : "size-8"
        }`}
      >
        {avatarInitials(comment.nickname)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.25">
        <div className="flex items-baseline gap-2">
          <span className="text-label text-text font-bold">
            {comment.nickname}
          </span>
          {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게
              달라진다("11분 전"→"12분 전") — 불일치 경고를 눌러 둔다 */}
          <span className="text-caption text-text-4" suppressHydrationWarning>
            {formatRelativeTime(comment.createdAt)}
            {comment.isEdited && " · 수정됨"}
          </span>
        </div>
        {comment.isDeleted ? (
          <p className="text-body text-text-4 leading-body">
            삭제된 댓글이에요.
          </p>
        ) : comment.isBlocked ? (
          <p className="text-body text-text-4 leading-body">
            차단한 사용자의 댓글이에요.
          </p>
        ) : comment.isBlinded ? (
          <p className="text-body text-text-4 leading-body">
            블라인드된 댓글이에요.
          </p>
        ) : editing ? (
          <CommentEditForm
            comment={comment}
            articleId={articleId}
            onClose={() => setEditing(false)}
          />
        ) : (
          <>
            <p className="text-body text-text-2 leading-body">
              {comment.content}
            </p>
            <div className="flex items-center gap-4 pt-0.5">
              <CommentLikeButton comment={comment} articleId={articleId} />
              {!reply && onReply && (
                <button
                  type="button"
                  onClick={onReply}
                  className="text-caption text-text-4 font-semibold active:opacity-60"
                >
                  답글
                </button>
              )}
              {mine ? (
                <CommentOwnerActions
                  comment={comment}
                  articleId={articleId}
                  onEdit={() => setEditing(true)}
                  onDeleted={onDeleted}
                />
              ) : (
                <CommentMoreActions comment={comment} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 내 댓글의 수정·삭제 버튼 묶음 (KAN-333) — 액션 줄의 답글 버튼 옆에 붙는다.
 * 원 댓글과 대댓글이 같이 쓴다(수정·삭제 모두 같은 엔드포인트).
 *
 * 수정은 상위(`CommentItem`)의 편집 모드만 켠다 — 폼과 저장 뮤테이션은
 * `CommentEditForm` 몫이다. 삭제는 오탭 방지로 확인 팝업을 먼저 띄우고
 * (로그아웃과 같은 관용), 실패 문구는 팝업 안에 남겨 바로 다시 시도할 수 있게
 * 한다. 토큰 만료(401 `AUTH_REQUIRED`)만 팝업을 닫고 로그인 유도로 돌린다.
 *
 * @param articleId 이 댓글이 달린 기사(릴) id — 목록 캐시 갱신에 쓴다
 * @param onEdit "수정" 탭 콜백 — 상위가 본문을 인라인 폼으로 바꾼다
 * @param onDeleted 삭제 성공 콜백 — 호출부가 헤더 카운트를 내리는 데 쓴다
 */
function CommentOwnerActions({
  comment,
  articleId,
  onEdit,
  onDeleted,
}: {
  comment: ArticleComment;
  articleId: string;
  onEdit: () => void;
  onDeleted?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useDeleteComment(articleId);

  function handleDelete() {
    setError(null);
    mutate(comment.id, {
      onSuccess: () => {
        setConfirming(false);
        onDeleted?.();
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === "AUTH_REQUIRED") {
          setConfirming(false);
          setNeedsLogin(true);
          return;
        }
        // BE 메시지가 이미 사용자용 한국어다(예: "본인 댓글만 수정·삭제할 수 있습니다.")
        setError(
          err instanceof ApiError
            ? err.message
            : "댓글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      },
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onEdit}
        className="text-caption text-text-4 font-semibold active:opacity-60"
      >
        수정
      </button>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className="text-caption text-text-4 font-semibold active:opacity-60"
      >
        삭제
      </button>

      {confirming && (
        <ConfirmDialog
          title="댓글을 삭제할까요?"
          description="삭제한 댓글은 되돌릴 수 없어요."
          confirmLabel="삭제"
          pending={isPending}
          error={error}
          onConfirm={handleDelete}
          onClose={() => setConfirming(false)}
        />
      )}

      {needsLogin && (
        <LoginPromptDialog
          onClose={() => setNeedsLogin(false)}
          description="댓글 삭제는 로그인한 사용자만 할 수 있어요."
        />
      )}
    </>
  );
}

/**
 * 남의 댓글의 ⋯ 메뉴 (KAN-411) — 신고·차단 진입점. 원 댓글과 대댓글이 같이 쓴다.
 *
 * ⋯을 누르면 신고하기·차단하기를 담은 액션 팝업이 뜬다. 드롭다운이 아니라
 * 중앙 카드인 이유: 댓글은 스크롤 컨테이너(`ScrollArea`·릴 세부 시트) 안이라
 * 행 옆에 `absolute`로 펼치면 컨테이너 가장자리에서 잘리고, 잘리지 않게
 * 포털로 빼면 앵커 좌표 추적이 필요해진다. 기존 팝업 관용(스크림 + 중앙 카드,
 * body 포털)이 어디서 열어도 안전하다.
 *
 * 비로그인이면 팝업 대신 로그인 유도를 띄운다(좋아요 버튼과 같은 관용 —
 * 버튼은 보여주되 요청 없이 막는다). 내 댓글에는 이 메뉴가 아예 안 그려지므로
 * (mine 분기) 셀프 신고·차단은 화면에서 성립하지 않고, 오판은 BE가
 * 400(`COMMENT_SELF_REPORT`·`USER_BLOCK_SELF`)으로 막는다.
 *
 * 차단 확인은 `ConfirmDialog` 재사용 — 실패 문구를 팝업 안에 남겨 재시도할 수
 * 있게 하고, 토큰 만료(401)만 팝업을 닫고 로그인 유도로 돌린다(삭제와 같은
 * 관용). 차단 성공 시 캐시 반영은 `useBlockUser`가 한다.
 */
function CommentMoreActions({ comment }: { comment: ArticleComment }) {
  const { isLoggedIn } = useAuth();
  const [dialog, setDialog] = useState<"none" | "menu" | "report" | "block">(
    "none",
  );
  const [needsLogin, setNeedsLogin] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const block = useBlockUser();

  function handleBlock() {
    setBlockError(null);
    block.mutate(comment.userId, {
      onSuccess: () => setDialog("none"),
      onError: (err) => {
        if (err instanceof ApiError && err.code === "AUTH_REQUIRED") {
          setDialog("none");
          setNeedsLogin(true);
          return;
        }
        // BE 메시지가 이미 사용자용 한국어다(예: "차단할 사용자를 찾을 수 없습니다.")
        setBlockError(
          err instanceof ApiError
            ? err.message
            : "차단하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      },
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (isLoggedIn ? setDialog("menu") : setNeedsLogin(true))}
        aria-label="댓글 신고·차단"
        aria-haspopup="dialog"
        className="text-text-4 active:opacity-60"
      >
        <MoreIcon size={14} />
      </button>

      {dialog === "menu" && (
        <CommentActionsDialog
          onReport={() => setDialog("report")}
          onBlock={() => {
            setBlockError(null);
            setDialog("block");
          }}
          onClose={() => setDialog("none")}
        />
      )}

      {dialog === "report" && (
        <ReportCommentDialog
          commentId={comment.id}
          onClose={() => setDialog("none")}
          onAuthRequired={() => {
            setDialog("none");
            setNeedsLogin(true);
          }}
        />
      )}

      {dialog === "block" && (
        <ConfirmDialog
          title="이 사용자를 차단할까요?"
          description={`${comment.nickname}님의 댓글이 모든 화면에서 가려져요. MY의 차단 목록에서 해제할 수 있어요.`}
          confirmLabel="차단"
          pending={block.isPending}
          error={blockError}
          onConfirm={handleBlock}
          onClose={() => setDialog("none")}
        />
      )}

      {needsLogin && (
        <LoginPromptDialog
          onClose={() => setNeedsLogin(false)}
          description="신고·차단은 로그인한 사용자만 할 수 있어요."
        />
      )}
    </>
  );
}

/**
 * ⋯이 여는 액션 선택 팝업 — 신고하기·차단하기·취소 세 줄. 스크림 + 중앙 카드
 * + body 포털 관용은 `ConfirmDialog`와 같다(이유는 {@link CommentMoreActions}).
 */
function CommentActionsDialog({
  onReport,
  onBlock,
  onClose,
}: {
  onReport: () => void;
  onBlock: () => void;
  onClose: () => void;
}) {
  /* 포털 대상(document)은 서버 렌더에 없다. 마운트 뒤에만 그려 hydration을 맞춘다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="dialog"
      aria-modal="true"
      aria-label="댓글 신고·차단"
    >
      {/* 스크림 — 탭하면 닫는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--plk-scrim) 60%, transparent)",
        }}
      />

      <div className="bg-bg border-border rounded-card divide-border relative w-full max-w-72 divide-y overflow-hidden border">
        <button
          type="button"
          onClick={onReport}
          className="text-body text-text w-full py-3.5 font-bold active:opacity-60"
        >
          신고하기
        </button>
        <button
          type="button"
          onClick={onBlock}
          className="text-body text-danger w-full py-3.5 font-bold active:opacity-60"
        >
          차단하기
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-body text-text-3 w-full py-3.5 font-bold active:opacity-60"
        >
          취소
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 댓글 좋아요 버튼 (KAN-309) — 하트 + 카운트. 원 댓글과 대댓글이 같이 쓴다.
 *
 * 삭제된 댓글에는 이 버튼이 아예 안 그려진다({@link CommentItem}의 tombstone
 * 분기). BE는 삭제된 댓글의 좋아요도 200으로 받아 주므로 막는 건 화면 몫이다.
 *
 * 비로그인 사용자에게도 카운트는 그대로 보여준다 — BE가 익명 조회에도 실제 값을
 * 준다. 누르면 요청 없이 로그인 유도 팝업만 뜬다.
 *
 * 하트는 13px 기본 크기로 둔다. 선 아이콘이라 더 줄이면 선이 1px 아래로 내려가
 * 줄마다 픽셀 격자에 다르게 걸려 뭉갠다(ADR 0044).
 */
function CommentLikeButton({
  comment,
  articleId,
}: {
  comment: ArticleComment;
  articleId: string;
}) {
  const like = useCommentLike(articleId, comment);

  return (
    <>
      <button
        type="button"
        onClick={like.toggle}
        aria-pressed={comment.liked}
        aria-label={comment.liked ? "좋아요 취소" : "좋아요"}
        className={`${
          comment.liked ? "text-accent" : "text-text-4"
        } flex items-center gap-1.25 active:opacity-60`}
      >
        <HeartMiniIcon size={13} filled={comment.liked} />
        <span className="text-caption font-semibold">
          {formatCount(comment.likeCount)}
        </span>
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
