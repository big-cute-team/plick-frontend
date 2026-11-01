"use client";

import { useState } from "react";
import { ApiError, needsSocialAccount } from "@plick/core/client";
import { TEAMS } from "@plick/domain/constants";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import {
  formatPredictionRecord,
  predictionPickLabel,
  predictionVerdictLabel,
  type PredictionOpinion,
} from "@plick/domain/prediction";
import { HeartMiniIcon } from "@plick/ui/icons";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { useAuth } from "@/_components/AuthProvider";
import { ConfirmDialog } from "@/_components/ConfirmDialog";
import { LoginPromptDialog } from "@/_components/LoginPromptDialog";
import { NoticeDialog } from "@/_components/NoticeDialog";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import {
  PREDICTION_DELETED_OPINION,
  PREDICTION_REPORT_LOGIN_PROMPT,
} from "@/_constants/predictions";
import { useBlockUser } from "@/_hooks/useBlockUser";
import { usePredictionOpinionLike } from "@/_hooks/usePredictionOpinionLike";
import { PredictionReportDialog } from "./PredictionReportDialog";

/** 액션 줄의 보조 글자 버튼(신고·차단) 공통. 12px 보조색, hover에 진하게 */
const ACTION =
  "text-label text-text-3 hover:text-text-strong focus-visible:outline-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * 예측 의견 한 행 (KAN-697, 시안 가이드 §5.4, 모바일 `PredictionOpinionRow`의 웹 판). 첫 줄에
 * 마이팀 엠블럼 16px, 닉네임 14/700, 기록(`첫 예측`, `3전 3적중`, `24전 17적중 71%`), 픽 배지,
 * 정산 뒤 적중·빗나감, 오른쪽 끝에 시간이 한 줄로 선다. 앱은 픽 배지와 적중 여부가 둘째 줄인데
 * 웹은 폭이 넉넉해 첫 줄에 같이 둔다. 본문은 15px 세 줄 말줄임이고 하단은 하트와 수, `답글 [n]`
 * (빨강은 답글 수에만), 신고, 차단이다.
 *
 * 답글이 남은 삭제 의견(`isDeleted`)은 본문 자리에 대체 문구만 남기고 픽 배지, 적중 여부, 액션
 * 줄을 뺀다(티켓 완료 조건). 그때 `pick`과 `result`는 null이다. 내 의견은 목록 `items`에 오지
 * 않고 내 예측 상자로 따로 서므로 여기서 내 글 분기는 없다. 오판은 BE가 400
 * `PREDICTION_SELF_REPORT`로 막고 팝업이 그 문구를 띄운다.
 *
 * 행을 눌러 답글을 펼치는 건 답글 티켓(KAN-698) 몫이라 지금은 행 자체가 버튼이 아니다.
 *
 * @param opinion 의견
 * @param matchId 이 의견이 달린 경기 id. 공감 캐시 갱신에 쓴다
 * @param teams 홈·원정 팀명(픽 라벨용)
 */
export function PredictionOpinionRow({
  opinion,
  matchId,
  teams,
}: {
  opinion: PredictionOpinion;
  matchId: number;
  teams: { home: string; away: string };
}) {
  const verdict = predictionVerdictLabel(opinion.result);
  const favorite = opinion.author.favoriteTeam;

  return (
    <div className="border-border-soft border-b pt-4 pb-3.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {favorite && <TeamCrest team={TEAMS[favorite]} size={16} decorative />}
        <span className="text-body-md text-text-strong font-bold">
          {opinion.author.nickname}
        </span>
        <span className="text-label text-text-3 tabular-nums">
          {formatPredictionRecord(opinion.author.record)}
        </span>
        {!opinion.isDeleted && opinion.pick !== null && (
          <span className="bg-chip text-label text-text-strong inline-flex h-5.5 items-center px-1.75 font-bold">
            {predictionPickLabel(opinion.pick, teams)}
          </span>
        )}
        {!opinion.isDeleted && verdict && (
          <span
            className={`text-label font-bold ${
              verdict === "적중" ? "text-accent" : "text-text-4"
            }`}
          >
            {verdict}
          </span>
        )}
        <div className="flex-1" />
        {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게 달라진다 */}
        <span
          className="text-label text-text-4 shrink-0"
          suppressHydrationWarning
        >
          {formatRelativeTime(opinion.createdAt)}
          {opinion.isEdited && !opinion.isDeleted && ", 수정됨"}
        </span>
      </div>

      {opinion.isDeleted ? (
        <p className="text-body-lg text-text-4 mt-2.25 leading-[1.65]">
          {PREDICTION_DELETED_OPINION}
        </p>
      ) : (
        <>
          <p className="text-body-lg text-text mt-2.25 line-clamp-3 leading-[1.65] break-words whitespace-pre-wrap">
            {opinion.opinion}
          </p>
          <div className="flex items-center gap-3.5 pt-2.25">
            <OpinionLikeButton opinion={opinion} matchId={matchId} />
            <span className="flex items-baseline gap-0.75">
              <span className="text-label text-text-3">답글</span>
              {opinion.replyCount > 0 && (
                <span className="text-label text-danger-strong font-bold tabular-nums">
                  [{opinion.replyCount}]
                </span>
              )}
            </span>
            <div className="flex-1" />
            <OpinionMoreActions opinion={opinion} />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 의견 공감 버튼. 하트 13px + 수 12/700. 눌렸으면 빨강, 아니면 보조색이고 hover에 빨강
 * (댓글 좋아요와 같은 모양). 비로그인은 요청 없이 로그인 안내만 뜬다. 낙관 갱신과 롤백은
 * `usePredictionOpinionLike`가 한다.
 */
function OpinionLikeButton({
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
        className={`text-label focus-visible:outline-accent inline-flex items-center gap-1 font-bold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
          opinion.liked
            ? "text-danger-strong"
            : "text-text-3 hover:text-danger-strong"
        }`}
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
 * 의견의 신고·차단 글자 버튼. 댓글의 `CommentMoreActions`와 같은 분기다. 비로그인은 로그인
 * 안내, 게스트는 신고만 막혀 연동 안내로 돌린다(차단은 세션만 있으면 된다). 차단은 확인 팝업을
 * 거치고 성공하면 "OOO님을 차단했어요" 안내로 바뀐다. 캐시에서 그 사용자의 의견을 빼는 건
 * `useBlockUser`가 한다.
 */
function OpinionMoreActions({ opinion }: { opinion: PredictionOpinion }) {
  const { isLoggedIn, isGuest, ensureSession } = useAuth();
  const [dialog, setDialog] = useState<"none" | "report" | "block" | "blocked">(
    "none",
  );
  const [needsLogin, setNeedsLogin] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const block = useBlockUser();
  const { nickname, userId } = opinion.author;

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
          predictionId={opinion.id}
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
