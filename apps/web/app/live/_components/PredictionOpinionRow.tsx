"use client";

import { TEAMS } from "@plick/domain/constants";
import { formatRelativeTime } from "@plick/domain/format";
import {
  formatPredictionRecord,
  predictionPickLabel,
  predictionVerdictLabel,
  type PredictionOpinion,
  type PredictionPick,
} from "@plick/domain/prediction";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { PREDICTION_DELETED_OPINION } from "@/_constants/predictions";
import {
  OpinionLikeButton,
  PredictionMoreActions,
} from "./PredictionOpinionActions";
import { PredictionReplies } from "./PredictionReplies";

/**
 * 예측 의견 한 행 (KAN-697, 시안 가이드 §5.4, 모바일 `PredictionOpinionRow`의 웹 판). 첫 줄에
 * 마이팀 엠블럼 16px, 닉네임 14/700, 기록(`첫 예측`, `3전 3적중`, `24전 17적중 71%`), 픽 배지,
 * 정산 뒤 적중·빗나감, 오른쪽 끝에 시간이 한 줄로 선다. 앱은 픽 배지와 적중 여부가 둘째 줄인데
 * 웹은 폭이 넉넉해 첫 줄에 같이 둔다. 본문은 15px 세 줄 말줄임이고 하단은 하트와 수, `답글 [n]`
 * (빨강은 답글 수에만), 신고, 차단이다.
 *
 * 행을 누르면 그 아래로 답글이 펼쳐진다(KAN-698, 시안 가이드 §5.6 "웹: 의견 행을 누르면 그
 * 아래로 펼친다"). 펼치면 본문 말줄임이 풀리고 `PredictionReplies`가 답글 목록과 입력줄을 그린다.
 * 안에 버튼이 있어 `<button>`으로 감쌀 수 없으니 `role=button`에 Enter·Space 처리다. 액션 줄과
 * 펼친 영역은 전파를 막아 그 안의 클릭이 행을 접지 않게 한다. 팝업은 포털인데 React 이벤트는
 * 포털 밖 조상으로도 올라오므로 같은 가드가 팝업 안의 클릭도 막는다. 열림 상태는 호출부가 든다
 * (한 번에 하나만 펼친다).
 *
 * 답글이 남은 삭제 의견(`isDeleted`)은 본문 자리에 대체 문구만 남기고 픽 배지, 적중 여부, 액션
 * 줄을 뺀다(티켓 완료 조건). 그때 `pick`과 `result`는 null이다. 답글은 남아 있으니 펼치기는 된다.
 * 내 의견은 목록 `items`에 오지 않고 내 예측 상자로 따로 서므로 여기서 내 글 분기는 없다.
 *
 * @param opinion 의견
 * @param matchId 이 의견이 달린 경기 id. 공감 캐시 갱신에 쓴다
 * @param teams 홈·원정 팀명(픽 라벨용)
 * @param myPick 내 픽. 답글 입력줄 안내가 원 의견 픽과 같은지로 갈린다
 * @param expanded 답글이 펼쳐져 있는가
 * @param onToggle 행을 눌렀을 때
 */
export function PredictionOpinionRow({
  opinion,
  matchId,
  teams,
  myPick,
  expanded,
  onToggle,
}: {
  opinion: PredictionOpinion;
  matchId: number;
  teams: { home: string; away: string };
  myPick: PredictionPick | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const verdict = predictionVerdictLabel(opinion.result);
  const favorite = opinion.author.favoriteTeam;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="border-border-soft focus-visible:outline-accent cursor-pointer border-b pt-4 pb-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
    >
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
          <p
            className={`text-body-lg text-text mt-2.25 leading-[1.65] break-words whitespace-pre-wrap ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {opinion.opinion}
          </p>
          {/* 액션 줄의 클릭은 행 토글로 올라가지 않는다. 포털 팝업 안의 클릭도 여기서 멈춘다 */}
          <div
            className="flex items-center gap-3.5 pt-2.25"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
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
            <PredictionMoreActions
              target={{ kind: "opinion", id: opinion.id }}
              author={opinion.author}
            />
          </div>
        </>
      )}

      {expanded && (
        <div
          className="cursor-default"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <PredictionReplies
            opinion={opinion}
            matchId={matchId}
            teams={teams}
            myPick={myPick}
          />
        </div>
      )}
    </div>
  );
}
