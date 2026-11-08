"use client";

import { useState } from "react";
import { ApiError, needsSocialAccount } from "@plick/core/client";
import { formatCount } from "@plick/domain/format";
import type {
  PredictionOpinion,
  PredictionReportTarget,
} from "@plick/domain/prediction";
import { HeartMiniIcon } from "@plick/ui/icons";
import { useAuth } from "@/_components/AuthProvider";
import { ConfirmDialog } from "@/_components/ConfirmDialog";
import { LoginPromptDialog } from "@/_components/LoginPromptDialog";
import { NoticeDialog } from "@/_components/NoticeDialog";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { PREDICTION_REPORT_LOGIN_PROMPT } from "@/_constants/predictions";
import { useBlockUser } from "@/_hooks/useBlockUser";
import { usePredictionOpinionLike } from "@/_hooks/usePredictionOpinionLike";
import { PredictionReportDialog } from "./PredictionReportDialog";

/** 액션 줄의 보조 글자 버튼(신고·차단) 공통. 12px 보조색, hover에 진하게 */
const ACTION =
  "text-label text-text-3 hover:text-text-strong focus-visible:outline-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * 의견 공감 버튼 (KAN-697, 모바일 `OpinionLikeButton`의 웹 판). 하트 13px + 수 12/700. 눌렸으면
 * 빨강, 아니면 보조색이고 hover에 빨강(댓글 좋아요와 같은 모양). 비로그인은 요청 없이 로그인
 * 안내만 뜬다. 낙관 갱신과 롤백은 `usePredictionOpinionLike`가 한다.
 *
 * @param opinion 의견
 * @param matchId 이 의견이 달린 경기 id. 공감 캐시 갱신에 쓴다
 */
export function OpinionLikeButton({
  opinion,
  matchId,
}: {
  opinion: PredictionOpinion;
  matchId: number;
}) {
  const like = usePredictionOpinionLike(matchId, opinion);

  return (
    <>
      <button
        type="button"
        onClick={like.toggle}
        aria-pressed={opinion.liked}
        aria-label={`공감 ${formatCount(opinion.likeCount)}`}
        className="text-label text-like focus-visible:outline-accent inline-flex items-center gap-1 font-bold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <HeartMiniIcon size={13} filled={opinion.liked} />
        {formatCount(opinion.likeCount)}
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
 * 의견·답글의 신고·차단 글자 버튼 (KAN-697, 답글은 KAN-698, 모바일 `PredictionMoreActions`의
 * 웹 판). 댓글의 `CommentMoreActions`와 같은 분기다. 비로그인은 로그인 안내, 게스트는 신고만
 * 막혀 연동 안내로 돌린다(차단은 세션만 있으면 된다). 차단은 확인 팝업을 거치고 성공하면
 * "OOO님을 차단했어요" 안내로 바뀐다. 캐시에서 그 사용자의 의견과 답글을 빼는 건 `useBlockUser`가
 * 한다.
 *
 * @param target 신고할 의견이나 답글. 신고 팝업이 종류로 제목과 액션을 가른다
 * @param author 글쓴이. 차단 대상과 안내 문구에 쓴다
 */
export function PredictionMoreActions({
  target,
  author,
}: {
  target: PredictionReportTarget;
  author: { userId: number; nickname: string };
}) {
  const { isLoggedIn, isGuest, ensureSession } = useAuth();
  const [dialog, setDialog] = useState<"none" | "report" | "block" | "blocked">(
    "none",
  );
  const [needsLogin, setNeedsLogin] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const block = useBlockUser();
  const { nickname, userId } = author;

  async function open(next: "report" | "block") {
    /* 처음 온 사람은 게스트를 받기 전일 수 있다 (KAN-667). 차단은 게스트 세션으로도 된다 */
    if (!isLoggedIn && !(await ensureSession())) {
      setNeedsLogin(true);
      return;
    }
    /* 신고는 소셜 사용자 전용이라 게스트는 연동 안내다. 방금 받은 게스트도 마찬가지다 */
    if (next === "report" && (isGuest || !isLoggedIn)) {
      setNeedsLogin(true);
      return;
    }
    setBlockError(null);
    setDialog(next);
  }

  function handleBlock() {
    setBlockError(null);
    block.mutate(userId, {
      onSuccess: () => setDialog("blocked"),
      onError: (err) => {
        if (needsSocialAccount(err)) {
          setDialog("none");
          setNeedsLogin(true);
          return;
        }
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
      <button type="button" onClick={() => open("report")} className={ACTION}>
        신고
      </button>
      <button type="button" onClick={() => open("block")} className={ACTION}>
        차단
      </button>

      {dialog === "report" && (
        <PredictionReportDialog
          target={target}
          nickname={nickname}
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
          description={`${nickname}님의 의견과 댓글이 모든 화면에서 가려집니다. MY의 차단 목록에서 해제할 수 있어요`}
          confirmLabel="차단"
          pending={block.isPending}
          error={blockError}
          onConfirm={handleBlock}
          onClose={() => setDialog("none")}
        />
      )}

      {dialog === "blocked" && (
        <NoticeDialog
          title={`${nickname}님을 차단했어요`}
          description="이 사용자의 의견과 댓글이 가려집니다"
          onClose={() => setDialog("none")}
        />
      )}

      {needsLogin && (
        <LoginPromptDialog
          onClose={() => setNeedsLogin(false)}
          description={PREDICTION_REPORT_LOGIN_PROMPT}
        />
      )}
    </>
  );
}
