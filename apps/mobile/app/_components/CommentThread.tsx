"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ApiError, needsSocialAccount } from "@plick/core/client";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import { HeartMiniIcon } from "@plick/ui/icons";
import type { ArticleComment } from "@plick/domain/types";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { useBlockUser } from "@/_hooks/useBlockUser";
import { useCommentLike } from "@/_hooks/useCommentLike";
import { useDeleteComment } from "@/_hooks/useDeleteComment";
import { useAuth } from "./AuthProvider";
import { CommentComposer } from "./CommentComposer";
import { CommentEditForm } from "./CommentEditForm";

/**
 * 삭제 확인·신고·차단·로그인 유도 시트는 탭해야 뜨는 UI라 초기 번들에서 뺀다
 * (KAN-428). 조건부 마운트라 서버 HTML에 없다.
 */
const ConfirmDialog = dynamic(
  () => import("./ConfirmDialog").then((m) => m.ConfirmDialog),
  { ssr: false },
);
const LoginPromptDialog = dynamic(
  () => import("./LoginPromptDialog").then((m) => m.LoginPromptDialog),
  { ssr: false },
);
const ReportCommentDialog = dynamic(
  () => import("./ReportCommentDialog").then((m) => m.ReportCommentDialog),
  { ssr: false },
);

/**
 * 댓글 한 스레드 — 원 댓글 + (있으면) 접힌 답글들. 기사 세부·릴 세부 시트 공용.
 * 시안(KAN-567)의 댓글 항목이다. 스레드 밑에 목록 행 구분선을 긋고, 답글은 왼쪽
 * 2px 선으로 들여쓴다.
 *
 * 답글은 기본으로 접혀 있고 "답글 N"을 눌러야 펼쳐진다(KAN-307). 시안은 답글
 * 토글 하나("답글" / "답글 N" / "답글 접기")라 답글 쓰기도 그 버튼에 묶었다. 답글이
 * 없으면 "답글"이 인라인 입력줄을 열고, 있으면 "답글 N"이 답글들과 그 밑 입력줄을
 * 함께 펼친다. 내가 답글을 새로 달면 바로 보이도록 펼친 상태로 둔다.
 *
 * 열림 상태는 스레드마다 각자 든다. 스레드 여러 개가 동시에 열려도 서로 간섭하지
 * 않는다.
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
  const [open, setOpen] = useState(false);
  /* 등록 성공도 입력줄의 onCancel을 부른다 — 방금 단 답글이 보이게 그때는 접지 않는다 */
  const justPosted = useRef(false);

  const replyCount = comment.replies.length;
  const replyLabel =
    replyCount === 0 ? "답글" : open ? "답글 접기" : `답글 ${replyCount}`;

  return (
    <div className="border-border-soft border-b py-3.5">
      <CommentItem
        comment={comment}
        articleId={articleId}
        replyLabel={replyLabel}
        onReply={() => setOpen((prev) => !prev)}
        onDeleted={onDeleted}
      />

      {open && (
        <div className="border-border-soft mt-2.75 flex flex-col gap-2.5 border-l-2 pl-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              articleId={articleId}
              reply
              onDeleted={onDeleted}
            />
          ))}
          <CommentComposer
            articleId={articleId}
            parentCommentId={comment.id}
            onCancel={
              replyCount === 0
                ? () => {
                    if (justPosted.current) {
                      justPosted.current = false;
                      return;
                    }
                    setOpen(false);
                  }
                : undefined
            }
            onPosted={() => {
              justPosted.current = true;
              onPosted?.();
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 댓글 한 줄 (작성자와 시각 + 본문 + 좋아요·답글·신고·차단). 시안(KAN-567)대로
 * 아바타는 그리지 않는다. 닉네임 12.5/700 강조색, 시각 11 회색, 본문 14/1.6이고
 * 답글은 닉네임 12, 본문 13.5로 한 단 작다. 시안의 BEST 표시는 API가 없어 없다.
 *
 * 삭제된 댓글은 목록에서 빠지지 않고 tombstone으로 온다(`content` null) —
 * 답글이 딸린 원 댓글이 지워져도 답글은 계속 보여야 해서다. 본문 자리에
 * 안내 문구만 남기고 액션 줄은 감춘다.
 *
 * 답글 버튼은 원 댓글에만 둔다 — BE가 대댓글의 답글도 막지는 않지만 조회가
 * 최상위 아래로 평탄화되므로 화면은 1단까지만 연다(KAN-303, be-verify 확인).
 * 좋아요는 원 댓글과 대댓글이 같은 엔드포인트를 쓰므로 양쪽에 그대로 둔다.
 *
 * 내 댓글이면 수정·삭제 버튼을(KAN-333), 남의 댓글이면 신고·차단 텍스트 버튼을
 * (KAN-411) 액션 줄 오른쪽 끝에 얹는다. 내 댓글 판별은 작성자 `userId` 대조다 —
 * KAN-411에서 BE가 댓글에 작성자 id를 실어 주면서 닉네임 대조를 교체했다(닉네임은
 * 변경 가능한 값이라 대조 근거로 약했다). 오판해도 BE가 403 `COMMENT_FORBIDDEN`으로 막는다.
 *
 * 차단한 사용자의 댓글(`isBlocked`)과 운영자 블라인드 댓글(`isBlinded`)은
 * tombstone처럼 본문 자리에 안내 문구만 남기고 액션 줄을 감춘다 — 서버가
 * 목록에서 빼지 않고 플래그로 내려주므로(be-verify 확인) 표시는 화면 몫이다.
 *
 * @param articleId - 이 댓글이 달린 기사(릴) id — 좋아요 캐시 갱신에 쓴다
 * @param reply - 답글이면 한 단 작은 글자로 렌더
 * @param replyLabel - 답글 토글 문구("답글" / "답글 N" / "답글 접기")
 * @param onReply - 답글 토글 콜백. 없거나 답글 행이면 버튼을 그리지 않는다
 * @param onDeleted - 삭제 성공 콜백. 호출부가 헤더 카운트를 내리는 데 쓴다
 */
function CommentItem({
  comment,
  articleId,
  reply,
  replyLabel,
  onReply,
  onDeleted,
}: {
  comment: ArticleComment;
  articleId: string;
  reply?: boolean;
  replyLabel?: string;
  onReply?: () => void;
  onDeleted?: () => void;
}) {
  const { userId: myUserId } = useAuth();
  const [editing, setEditing] = useState(false);

  const mine = myUserId !== null && comment.userId === myUserId;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-baseline gap-1.75 pb-1.25">
        <span
          className={`text-accent font-bold ${reply ? "text-label" : "text-label-lg"}`}
        >
          {comment.nickname}
        </span>
        {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게
            달라진다("11분 전"→"12분 전") — 불일치 경고를 눌러 둔다 */}
        <span className="text-caption text-text-4" suppressHydrationWarning>
          {formatRelativeTime(comment.createdAt)}
          {comment.isEdited && ", 수정됨"}
        </span>
      </div>
      {comment.isDeleted ? (
        <p className="text-body-md text-text-4 leading-body">
          삭제된 댓글이에요
        </p>
      ) : comment.isBlocked ? (
        <p className="text-body-md text-text-4 leading-body">
          차단한 사용자의 댓글이에요
        </p>
      ) : comment.isBlinded ? (
        <p className="text-body-md text-text-4 leading-body">
          블라인드된 댓글이에요
        </p>
      ) : editing ? (
        <CommentEditForm
          comment={comment}
          articleId={articleId}
          onClose={() => setEditing(false)}
        />
      ) : (
        <>
          <p
            className={`text-text leading-body pb-2 ${reply ? "text-body" : "text-body-md"}`}
          >
            {comment.content}
          </p>
          <div className="flex items-center gap-3.5">
            <CommentLikeButton comment={comment} articleId={articleId} />
            {!reply && onReply && (
              <button
                type="button"
                onClick={onReply}
                className="text-caption-lg text-text-3 font-bold active:opacity-60"
              >
                {replyLabel}
              </button>
            )}
            <div className="flex-1" />
            {mine ? (
              <CommentOwnerActions
                comment={comment}
                articleId={articleId}
                onEdit={() => setEditing(true)}
                onDeleted={onDeleted}
              />
            ) : (
              <CommentReportBlockActions comment={comment} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** 액션 줄 오른쪽의 회색 텍스트 버튼(신고·차단·수정·삭제) 공통 모양 (11.5, text-4) */
const ACTION_TEXT = "text-caption-lg text-text-4 active:opacity-60";

/**
 * 내 댓글의 수정·삭제 버튼 묶음 (KAN-333) — 액션 줄 오른쪽 끝에 붙는다.
 * 원 댓글과 대댓글이 같이 쓴다(수정·삭제 모두 같은 엔드포인트).
 *
 * 수정은 상위(`CommentItem`)의 편집 모드만 켠다 — 폼과 저장 뮤테이션은
 * `CommentEditForm` 몫이다. 삭제는 오탭 방지로 확인 시트를 먼저 띄우고
 * (로그아웃과 같은 관용), 실패 문구는 시트 안에 남겨 바로 다시 시도할 수 있게
 * 한다. 토큰 만료(401 `AUTH_REQUIRED`)만 시트를 닫고 로그인 유도로 돌린다.
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
        if (needsSocialAccount(err)) {
          setConfirming(false);
          setNeedsLogin(true);
          return;
        }
        // BE 메시지가 이미 사용자용 한국어다(예: "본인 댓글만 수정·삭제할 수 있습니다.")
        setError(
          err instanceof ApiError
            ? err.message
            : "댓글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요",
        );
      },
    });
  }

  return (
    <>
      <button type="button" onClick={onEdit} className={ACTION_TEXT}>
        수정
      </button>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className={ACTION_TEXT}
      >
        삭제
      </button>

      {confirming && (
        <ConfirmDialog
          title="댓글을 삭제할까요?"
          description="삭제한 댓글은 되돌릴 수 없어요"
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
          description="댓글 삭제는 로그인한 사용자만 할 수 있어요"
        />
      )}
    </>
  );
}

/**
 * 남의 댓글의 신고·차단 텍스트 버튼 (KAN-411) — 원 댓글과 대댓글이 같이 쓴다.
 * 시안(KAN-567)대로 더보기(⋯) 메뉴를 거치지 않고 각각 바로 시트를 연다. 전에 있던
 * 중앙 카드 액션 팝업(CommentActionsDialog)은 지웠다.
 *
 * 비로그인이면 시트 대신 로그인 유도를 띄운다(좋아요 버튼과 같은 관용 —
 * 버튼은 보여주되 요청 없이 막는다). 내 댓글에는 이 버튼이 아예 안 그려지므로
 * (mine 분기) 셀프 신고·차단은 화면에서 성립하지 않고, 오판은 BE가
 * 400(`COMMENT_SELF_REPORT`·`USER_BLOCK_SELF`)으로 막는다.
 *
 * 차단 확인은 `ConfirmDialog` 재사용 — 실패 문구를 시트 안에 남겨 재시도할 수
 * 있게 하고, 토큰 만료(401)만 시트를 닫고 로그인 유도로 돌린다(삭제와 같은
 * 관용). 차단 성공 시 캐시 반영은 `useBlockUser`가 한다.
 */
function CommentReportBlockActions({ comment }: { comment: ArticleComment }) {
  const { isLoggedIn, isGuest } = useAuth();
  const [dialog, setDialog] = useState<"none" | "report" | "block">("none");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const block = useBlockUser();

  const canAct = isLoggedIn && !isGuest;

  function handleBlock() {
    setBlockError(null);
    block.mutate(comment.userId, {
      onSuccess: () => setDialog("none"),
      onError: (err) => {
        if (needsSocialAccount(err)) {
          setDialog("none");
          setNeedsLogin(true);
          return;
        }
        // BE 메시지가 이미 사용자용 한국어다(예: "차단할 사용자를 찾을 수 없습니다.")
        setBlockError(
          err instanceof ApiError
            ? err.message
            : "차단하지 못했어요. 잠시 후 다시 시도해 주세요",
        );
      },
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (canAct ? setDialog("report") : setNeedsLogin(true))}
        className={ACTION_TEXT}
      >
        신고
      </button>
      <button
        type="button"
        onClick={() => {
          if (!canAct) {
            setNeedsLogin(true);
            return;
          }
          setBlockError(null);
          setDialog("block");
        }}
        className={ACTION_TEXT}
      >
        차단
      </button>

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
          description={`${comment.nickname}님의 댓글이 모든 화면에서 가려져요. MY의 차단 목록에서 해제할 수 있어요`}
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
          description="신고와 차단은 로그인한 사용자만 할 수 있어요"
        />
      )}
    </>
  );
}

/**
 * 댓글 좋아요 버튼 (KAN-309) — 하트(13px) + 카운트(11.5/700). 원 댓글과 대댓글이
 * 같이 쓴다. 시안(KAN-567)대로 누른 상태만 빨강이고 기본은 text-3다.
 *
 * 삭제된 댓글에는 이 버튼이 아예 안 그려진다({@link CommentItem}의 tombstone
 * 분기). BE는 삭제된 댓글의 좋아요도 200으로 받아 주므로 막는 건 화면 몫이다.
 *
 * 비로그인 사용자에게도 카운트는 그대로 보여준다 — BE가 익명 조회에도 실제 값을
 * 준다. 누르면 요청 없이 로그인 유도 시트만 뜬다.
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
          comment.liked ? "text-danger" : "text-text-3"
        } text-caption-lg flex items-center gap-1 font-bold active:opacity-60`}
      >
        <HeartMiniIcon size={13} filled={comment.liked} />
        {formatCount(comment.likeCount)}
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
