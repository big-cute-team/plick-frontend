"use client";

import { useState } from "react";
import { ApiError, needsSocialAccount } from "@plick/core/client";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import type { ArticleComment } from "@plick/domain/types";
import { HeartMiniIcon } from "@plick/ui/icons";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { useBlockUser } from "@/_hooks/useBlockUser";
import { useCommentLike } from "@/_hooks/useCommentLike";
import { useDeleteComment } from "@/_hooks/useDeleteComment";
import { useAuth } from "./AuthProvider";
import { CommentComposer } from "./CommentComposer";
import { CommentEditForm } from "./CommentEditForm";
import { ConfirmDialog } from "./ConfirmDialog";
import { LoginPromptDialog } from "./LoginPromptDialog";
import { NoticeDialog } from "./NoticeDialog";
import { ReportCommentDialog } from "./ReportCommentDialog";

/** 액션 줄의 보조 글자 버튼(답글·수정·삭제·신고·차단) 공통 — 11.5px 보조색 */
const ACTION =
  "text-caption-lg text-text-3 focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * 댓글 한 스레드 (시안 KAN-567 "댓글") — 원 댓글 + (있으면) 접힌 답글들. 기사
 * 세부·릴 세부 패널 공용. 스레드는 위아래 14px 여백과 연한 밑선으로 나뉜다.
 *
 * 답글은 기본으로 접혀 있고 "답글 N개"를 눌러야 펼쳐진다(피그마 W2 기사 세부,
 * 모바일도 KAN-307에서 같은 모양이 됐다). 펼치면 글자가 "답글 접기"로 바뀐다
 * (시안). 내가 답글을 새로 달면 바로 보이도록 자동으로 펼친다. 답글 목록은
 * 시안대로 왼쪽 2px 연한 세로선 안에 들여쓴다.
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
    <div className="border-border-soft border-b py-3.5">
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
          replyTo={comment.nickname}
          onCancel={() => setReplying(false)}
          onPosted={() => {
            setExpanded(true);
            onPosted?.();
          }}
          className="mt-2.75"
        />
      )}

      {hasReplies && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="text-caption-lg text-accent hover:text-accent-hover focus-visible:outline-accent mt-2.5 inline-block font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {expanded ? "답글 접기" : `답글 ${comment.replies.length}개`}
        </button>
      )}

      {expanded && (
        <div className="border-border-soft mt-2.5 ml-0.5 border-l-2 pl-5">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              articleId={articleId}
              reply
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 댓글 한 줄 (작성자·시간 + 본문 + 좋아요·답글·신고·차단). 시안(KAN-567): 닉네임
 * 12.5/700 강조색, 시각 11 보조색, 본문 14/1.65, 답글은 12/700과 13.5/1.6으로 한
 * 단 작다. 아바타 원은 시안에 없어 뺐다(프로필 이미지는 없다는 규칙).
 *
 * 삭제된 댓글은 목록에서 빠지지 않고 tombstone으로 온다(`content` null) —
 * 답글이 딸린 원 댓글이 지워져도 답글은 계속 보여야 해서다. 본문 자리에
 * 안내 문구만 남기고 액션 줄은 감춘다.
 *
 * 답글 버튼은 원 댓글에만 둔다 — BE가 대댓글의 답글도 막지는 않지만 조회가
 * 최상위 아래로 평탄화되므로 화면은 1단까지만 연다(KAN-303, be-verify 확인).
 * 좋아요는 원 댓글과 대댓글이 같은 엔드포인트를 쓰므로 양쪽에 그대로 둔다.
 *
 * 내 댓글이면 수정·삭제 버튼을(KAN-333), 남의 댓글이면 신고·차단 버튼을
 * (KAN-411) 얹는다. 내 댓글 판별은 작성자 `userId` 대조다 — KAN-411에서 BE가
 * 댓글에 작성자 id를 실어 주면서 닉네임 대조를 교체했다(닉네임은 변경 가능한
 * 값이라 대조 근거로 약했다). 오판해도 BE가 403 `COMMENT_FORBIDDEN`으로 막는다.
 *
 * 차단한 사용자의 댓글(`isBlocked`)과 운영자 블라인드 댓글(`isBlinded`)은
 * tombstone처럼 본문 자리에 안내 문구만 남기고 액션 줄을 감춘다 — 서버가
 * 목록에서 빼지 않고 플래그로 내려주므로(be-verify 확인) 표시는 화면 몫이다.
 * 시안의 BEST 표식은 BE에 그 값이 없어 그리지 않는다(API 공백).
 *
 * @param articleId - 이 댓글이 달린 기사(릴) id — 좋아요 캐시 갱신에 쓴다
 * @param reply - 답글이면 한 단 작은 글자로 렌더
 * @param onReply - "답글" 클릭 콜백. 없거나 답글 행이면 버튼을 그리지 않는다
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
  const body = reply
    ? "text-body text-text leading-body"
    : "text-body-md text-text leading-[1.65]";
  const muted = reply
    ? "text-body text-text-4 leading-body"
    : "text-body-md text-text-4 leading-[1.6]";

  return (
    <div className={reply ? "py-2.25" : ""}>
      <div className="flex items-baseline gap-2 pb-1.25">
        <span
          className={`text-accent font-bold ${reply ? "text-label" : "text-label-lg"}`}
        >
          {comment.nickname}
        </span>
        {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게
            달라진다("11분 전"→"12분 전") — 불일치 경고를 눌러 둔다 */}
        <span className="text-caption text-text-3" suppressHydrationWarning>
          {formatRelativeTime(comment.createdAt)}
          {comment.isEdited && ", 수정됨"}
        </span>
      </div>
      {comment.isDeleted ? (
        <p className={muted}>삭제된 댓글이에요</p>
      ) : comment.isBlocked ? (
        <p className={muted}>차단한 사용자의 댓글이에요</p>
      ) : comment.isBlinded ? (
        <p className={muted}>블라인드된 댓글이에요</p>
      ) : editing ? (
        <CommentEditForm
          comment={comment}
          articleId={articleId}
          onClose={() => setEditing(false)}
        />
      ) : (
        <>
          <p className={`${body} ${reply ? "mb-1.5" : "mb-1.75"}`}>
            {comment.content}
          </p>
          <div className="flex items-center gap-3.75">
            <CommentLikeButton comment={comment} articleId={articleId} />
            {!reply && onReply && (
              <button
                type="button"
                onClick={onReply}
                className={`${ACTION} hover:text-accent font-bold`}
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
  );
}

/**
 * 내 댓글의 수정·삭제 버튼 묶음 (KAN-333, 모바일과 동시 구현) — 액션 줄의 답글
 * 버튼 옆에 붙는다. 원 댓글과 대댓글이 같이 쓴다(수정·삭제 모두 같은 엔드포인트).
 *
 * 수정은 상위(`CommentItem`)의 편집 모드만 켠다 — 폼과 저장 뮤테이션은
 * `CommentEditForm` 몫이다. 삭제는 오클릭 방지로 확인 팝업을 먼저 띄우고,
 * 실패 문구는 팝업 안에 남겨 바로 다시 시도할 수 있게 한다. 토큰 만료
 * (401 `AUTH_REQUIRED`)만 팝업을 닫고 로그인 유도로 돌린다.
 *
 * @param articleId 이 댓글이 달린 기사(릴) id — 목록 캐시 갱신에 쓴다
 * @param onEdit "수정" 클릭 콜백 — 상위가 본문을 인라인 폼으로 바꾼다
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
      <button
        type="button"
        onClick={onEdit}
        className={`${ACTION} hover:text-text-strong`}
      >
        수정
      </button>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className={`${ACTION} hover:text-text-strong`}
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
 * 남의 댓글의 신고·차단 버튼 (KAN-411, 모바일과 동시 구현, 시안 KAN-567) — 액션
 * 줄에 "신고", "차단" 글자 버튼으로 바로 선다. 원 댓글과 대댓글이 같이 쓴다.
 * 전에는 ⋯ 버튼이 신고·차단 선택 팝업을 먼저 열었는데 시안이 두 글자를 줄에
 * 그대로 두어 그 중간 팝업을 없앴다.
 *
 * 비로그인이면 팝업 대신 로그인 유도를 띄운다(좋아요 버튼과 같은 관용 —
 * 버튼은 보여주되 요청 없이 막는다). 내 댓글에는 이 버튼들이 아예 안 그려지므로
 * (mine 분기) 셀프 신고·차단은 화면에서 성립하지 않고, 오판은 BE가
 * 400(`COMMENT_SELF_REPORT`·`USER_BLOCK_SELF`)으로 막는다.
 *
 * 차단 확인은 `ConfirmDialog` 재사용 — 실패 문구를 팝업 안에 남겨 재시도할 수
 * 있게 하고, 토큰 만료(401)만 팝업을 닫고 로그인 유도로 돌린다(삭제와 같은
 * 관용). 성공하면 시안대로 "OOO님을 차단했어요" 안내 팝업으로 바뀐다. 차단
 * 성공 시 캐시 반영은 `useBlockUser`가 한다.
 */
function CommentMoreActions({ comment }: { comment: ArticleComment }) {
  const { isLoggedIn, isGuest } = useAuth();
  const [dialog, setDialog] = useState<"none" | "report" | "block" | "blocked">(
    "none",
  );
  const [needsLogin, setNeedsLogin] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const block = useBlockUser();

  function open(next: "report" | "block") {
    if (!isLoggedIn || isGuest) {
      setNeedsLogin(true);
      return;
    }
    setBlockError(null);
    setDialog(next);
  }

  function handleBlock() {
    setBlockError(null);
    block.mutate(comment.userId, {
      onSuccess: () => setDialog("blocked"),
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
        onClick={() => open("report")}
        className={`${ACTION} hover:text-text-strong`}
      >
        신고
      </button>
      <button
        type="button"
        onClick={() => open("block")}
        className={`${ACTION} hover:text-text-strong`}
      >
        차단
      </button>

      {dialog === "report" && (
        <ReportCommentDialog
          commentId={comment.id}
          nickname={comment.nickname}
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
          description={`${comment.nickname}님의 댓글이 모든 화면에서 가려집니다. MY의 차단 목록에서 해제할 수 있어요`}
          confirmLabel="차단"
          pending={block.isPending}
          error={blockError}
          onConfirm={handleBlock}
          onClose={() => setDialog("none")}
        />
      )}

      {dialog === "blocked" && (
        <NoticeDialog
          title={`${comment.nickname}님을 차단했어요`}
          description="이 사용자의 댓글이 가려집니다"
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
 * 댓글 좋아요 버튼 (KAN-309, web 이식 KAN-331, 시안 KAN-567) — 하트 13px + 수
 * 11.5/700. 눌렸으면 빨강, 아니면 보조색이고 hover에 빨강. 원 댓글과 대댓글이
 * 같이 쓴다.
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
        className={`text-caption-lg focus-visible:outline-accent inline-flex items-center gap-1 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 ${
          comment.liked ? "text-danger" : "text-text-3 hover:text-danger"
        }`}
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
