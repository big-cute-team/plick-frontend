"use client";

import { useRouter } from "next/navigation";
import { TEAMS } from "@plick/domain/constants";
import { formatRelativeTime } from "@plick/domain/format";
import {
  formatPredictionRecord,
  predictionPickLabel,
  predictionVerdictLabel,
  type PredictionOpinion,
} from "@plick/domain/prediction";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { PREDICTION_DELETED_OPINION } from "@/_constants/predictions";
import {
  OpinionLikeButton,
  PredictionMoreActions,
} from "./PredictionOpinionActions";

/**
 * 예측 의견 한 행 (KAN-697, 시안 가이드 §5.4). 첫 줄은 마이팀 엠블럼 16px, 닉네임 13/700,
 * 기록(`첫 예측`, `3전 3적중`, `24전 17적중 71%`), 오른쪽 끝 시간이고 둘째 줄이 픽 배지와 정산 뒤
 * 적중·빗나감이다. 본문은 14px 세 줄 말줄임, 하단은 하트와 수, 답글이 있으면 `답글 [n]`(빨강은
 * 답글 수에만), 오른쪽에 신고와 차단이다. 작은 글자 버튼은 세로 패딩으로 터치 목표를 넓힌다.
 *
 * 행을 누르면 의견 상세(답글) 화면으로 간다(KAN-698, 시안 가이드 §5.6 "앱: 의견을 누르면 의견
 * 상세 화면"). 안에 버튼이 있어 `<a>`로 감쌀 수 없으니 `role=button`에 라우터 push다. 하단 액션
 * 줄은 전파를 막아 하트나 신고를 눌렀을 때 화면이 넘어가지 않게 한다. 시트와 팝업은 포털인데
 * React 이벤트는 포털 밖 조상으로도 올라오므로 같은 가드가 그 안의 탭도 막는다. 경기 id를
 * 쿼리로 같이 보내 상세 화면이 403에서도 돌아갈 경기를 안다.
 *
 * `detail`이면 의견 상세 화면 맨 위의 원 의견이다. 말줄임이 없고 행 자체가 버튼이 아니며 `답글
 * [n]`은 그 아래 머리글이 따로 그려 액션 줄에서 뺀다.
 *
 * 답글이 남은 삭제 의견(`isDeleted`)은 본문 자리에 대체 문구만 남기고 픽 배지, 적중 여부, 액션
 * 줄을 뺀다(티켓 완료 조건). 그때 `pick`과 `result`는 null이다. 내 의견은 목록 `items`에 오지
 * 않고 내 예측 상자로 따로 서므로 여기서 내 글 분기는 없다.
 *
 * @param opinion 의견
 * @param matchId 이 의견이 달린 경기 id. 공감 캐시 갱신과 상세 화면 링크에 쓴다
 * @param teams 홈·원정 팀명(픽 라벨용)
 * @param detail 의견 상세 화면의 원 의견이면 true
 */
export function PredictionOpinionRow({
  opinion,
  matchId,
  teams,
  detail = false,
}: {
  opinion: PredictionOpinion;
  matchId: number;
  teams: { home: string; away: string };
  detail?: boolean;
}) {
  const router = useRouter();
  const verdict = predictionVerdictLabel(opinion.result);
  const favorite = opinion.author.favoriteTeam;
  const navigable = !detail;

  function open() {
    router.push(`/live/predictions/${opinion.id}?match=${matchId}`);
  }

  return (
    <div
      role={navigable ? "button" : undefined}
      tabIndex={navigable ? 0 : undefined}
      onClick={navigable ? open : undefined}
      onKeyDown={
        navigable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }
          : undefined
      }
      className={`border-border-soft border-b pt-3.5 pb-3 ${
        navigable ? "active:opacity-70" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {favorite && <TeamCrest team={TEAMS[favorite]} size={16} decorative />}
        <span
          className={`text-text-strong truncate font-bold ${
            detail ? "text-body-md" : "text-body"
          }`}
        >
          {opinion.author.nickname}
        </span>
        <span className="text-label text-text-3 shrink-0 tabular-nums">
          {formatPredictionRecord(opinion.author.record)}
        </span>
        <div className="flex-1" />
        {/* 상대 시각은 SSR과 하이드레이션 사이에 분 경계를 넘으면 정당하게 달라진다 */}
        <span
          className="text-caption text-text-4 shrink-0"
          suppressHydrationWarning
        >
          {formatRelativeTime(opinion.createdAt)}
          {opinion.isEdited && !opinion.isDeleted && ", 수정됨"}
        </span>
      </div>

      {opinion.isDeleted ? (
        <p className="text-body-md text-text-4 mt-2 leading-relaxed">
          {PREDICTION_DELETED_OPINION}
        </p>
      ) : (
        <>
          {opinion.pick !== null && (
            <div className="flex items-center gap-2 pt-2">
              <span className="bg-chip rounded-badge text-label text-text-strong inline-flex h-5.5 items-center px-1.75 font-bold">
                {predictionPickLabel(opinion.pick, teams)}
              </span>
              {verdict && (
                <span
                  className={`text-label font-bold ${
                    verdict === "적중" ? "text-accent" : "text-text-4"
                  }`}
                >
                  {verdict}
                </span>
              )}
            </div>
          )}
          <p
            className={`text-text mt-2 leading-relaxed break-words whitespace-pre-wrap ${
              detail ? "text-body-lg" : "text-body-md line-clamp-3"
            }`}
          >
            {opinion.opinion}
          </p>
          {/* 액션 줄의 탭은 행 열기로 올라가지 않는다. 포털 시트 안의 탭도 여기서 멈춘다 */}
          <div
            className="flex items-center gap-3.5 pt-2.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <OpinionLikeButton opinion={opinion} matchId={matchId} />
            {!detail && opinion.replyCount > 0 && (
              <span className="flex items-baseline gap-0.75">
                <span className="text-label text-text-3">답글</span>
                <span className="text-label text-danger-strong font-bold tabular-nums">
                  [{opinion.replyCount}]
                </span>
              </span>
            )}
            <div className="flex-1" />
            <PredictionMoreActions
              target={{ kind: "opinion", id: opinion.id }}
              author={opinion.author}
            />
          </div>
        </>
      )}
    </div>
  );
}
