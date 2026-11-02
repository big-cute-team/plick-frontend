"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ApiError, needsSocialAccount } from "@plick/core/client";
import { formatCount } from "@plick/domain/format";
import type {
  PredictionOpinion,
  PredictionReportTarget,
} from "@plick/domain/prediction";
import { HeartMiniIcon } from "@plick/ui/icons";
import { useAuth } from "@/_components/AuthProvider";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { PREDICTION_REPORT_LOGIN_PROMPT } from "@/_constants/predictions";
import { useBlockUser } from "@/_hooks/useBlockUser";
import { usePredictionOpinionLike } from "@/_hooks/usePredictionOpinionLike";

/* 신고·차단·로그인 시트는 탭해야 뜨는 UI라 초기 번들에서 뺀다 (KAN-428과 같은 판단) */
const ConfirmDialog = dynamic(
  () => import("@/_components/ConfirmDialog").then((m) => m.ConfirmDialog),
  { ssr: false },
);
const LoginPromptDialog = dynamic(
  () =>
    import("@/_components/LoginPromptDialog").then((m) => m.LoginPromptDialog),
  { ssr: false },
);
const PredictionReportSheet = dynamic(
  () => import("./PredictionReportSheet").then((m) => m.PredictionReportSheet),
  { ssr: false },
);

/** 액션 줄 오른쪽의 회색 글자 버튼(신고·차단). 12px, 세로 패딩으로 터치 목표 44px */
const ACTION_TEXT = "text-label text-text-4 -my-3 py-3 active:opacity-60";

/**
 * 의견 공감 버튼 (KAN-697). 하트 13px + 수 12/700. 눌렸으면 빨강, 아니면 보조색(댓글 좋아요와
 * 같은 모양). 비로그인은 요청 없이 로그인 안내만 뜬다. 낙관 갱신과 롤백은
 * `usePredictionOpinionLike`가 한다. 의견 행과 의견 상세(KAN-698)가 같이 쓴다.
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
        className={`${
          opinion.liked ? "text-danger-strong" : "text-text-3"
        } text-label -my-3 flex items-center gap-1 py-3 font-bold tabular-nums active:opacity-60`}
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
 * 의견·답글의 신고·차단 글자 버튼 (KAN-697, 답글은 KAN-698). 댓글의 `CommentReportBlockActions`와
 * 같은 분기다. 비로그인은 로그인 안내, 게스트는 신고만 막혀 연동 안내로 돌린다(차단은 세션만
 * 있으면 된다). 차단은 확인 시트를 거치고 성공하면 닫힌다. 캐시에서 그 사용자의 의견과 답글을
 * 빼는 건 `useBlockUser`가 한다.
 *
 * @param target 신고할 의견이나 답글. 신고 시트가 종류로 제목과 액션을 가른다
 * @param author 글쓴이. 차단 대상과 확인 문구에 쓴다
 */
export function PredictionMoreActions({
  target,
  author,
}: {
  target: PredictionReportTarget;
  author: { userId: number; nickname: string };
}) {
  const { isLoggedIn, isGuest, ensureSession } = useAuth();
  const [dialog, setDialog] = useState<"none" | "report" | "block">("none");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const block = useBlockUser();
  const { nickname, userId } = author;

  /* 신고는 소셜 사용자 전용이라 게스트는 연동 안내로, 차단은 세션만 있으면 된다 */
  const canReport = isLoggedIn && !isGuest;

  function handleBlock() {
    setBlockError(null);
    block.mutate(userId, {
      onSuccess: () => setDialog("none"),
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
      <button
        type="button"
        onClick={() => (canReport ? setDialog("report") : setNeedsLogin(true))}
        className={ACTION_TEXT}
      >
        신고
      </button>
      <button
        type="button"
        onClick={async () => {
          /* 처음 온 사람은 게스트를 받기 전일 수 있다 (KAN-665) */
          if (!isLoggedIn && !(await ensureSession())) {
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
        <PredictionReportSheet
          target={target}
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
          description={`${nickname}님의 의견과 댓글이 모든 화면에서 가려져요. MY의 차단 목록에서 해제할 수 있어요`}
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
          description={PREDICTION_REPORT_LOGIN_PROMPT}
        />
      )}
    </>
  );
}
