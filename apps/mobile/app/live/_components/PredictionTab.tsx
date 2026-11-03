"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PredictionFailure } from "@plick/core/prediction-errors";
import { hasPreviewBlocks, type MatchDetail } from "@plick/domain/live";
import {
  buildTeamCompare,
  formatPredictionCount,
  predictionStatusLine,
  predictionVerdictLabel,
  type MyPrediction,
  type PredictionPick,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { PredictionBar } from "@plick/ui/PredictionBar";
import { ChevronRightIcon } from "@plick/ui/icons";
import { SESSION_KIND, SESSION_KIND_COOKIE } from "@/_constants/api";
import { readCookie } from "@/_utils/cookie";
import {
  PREDICTION_RANKING_LINK_LABEL,
  PREDICTION_VOTE_LABEL,
} from "@/_constants/predictions";
import { useErrorToast } from "@/_stores/error-toast";
import { debateTabPath } from "@/_utils/debates";
import { PredictionOpinions } from "./PredictionOpinions";
import { PreviewSection } from "./PreviewSection";

/* 시트 셋은 눌러야 뜨는 조건부 UI라 초기 번들에서 뺀다 (KAN-428과 같은 판단) */
const PredictionComposerSheet = dynamic(
  () =>
    import("./PredictionComposerSheet").then((m) => m.PredictionComposerSheet),
  { ssr: false },
);
const PredictionAuthSheet = dynamic(
  () => import("./PredictionAuthSheet").then((m) => m.PredictionAuthSheet),
  { ssr: false },
);
const PredictionCancelSheet = dynamic(
  () => import("./PredictionCancelSheet").then((m) => m.PredictionCancelSheet),
  { ssr: false },
);

/** 지금 떠 있는 시트. 한 번에 하나만 선다. 작성 시트의 `pick`은 바 칸에서 열 때 미리 고른 픽이다. */
type Sheet =
  | { kind: "compose"; mine: MyPrediction | null; pick: PredictionPick | null }
  | { kind: "auth"; mode: "login" | "link" | "submitted" }
  | { kind: "cancel" }
  | null;

/**
 * 경기 상세 예측/프리뷰 탭 (KAN-696 예측 탭과 KAN-699 프리뷰 탭을 KAN-709에서 합쳤다. 시안 가이드
 * §4·§5.3·§5.4). 위에서 아래로 투표(상태 줄과 참여 수, 3분할 바), 프리뷰(팀 비교 표, "프리뷰 더
 * 보기" 토글 안의 결장자·상대 전적·리그 순위), 여론(`PredictionOpinions`: 머리글, 픽 필터, 내 예측
 * 상자, 잠금 지면이나 의견 목록)이다. 첫 화면(iPhone 15, Safari 주소창 있음)에 투표, 팀 비교, 여론
 * 머리글까지 보이는 게 목표라 헤더를 줄이고 프리뷰 나머지를 접었다.
 *
 * 요약(`summary`)이 없는 경기(빅6 밖, 요약 404)는 투표와 여론 없이 프리뷰만 그린다. 탭 이름은
 * 그래도 "예측/프리뷰"다. 프리뷰 재료도 없으면(라이브·종료 경기는 `preview`가 null) 투표와 여론만이고,
 * 둘 다 없으면 안내 한 줄이다.
 *
 * 투표의 상태별 표시는 전과 같다(§4 표). UPCOMING은 열림 시각만 보이고 바와 작성, 의견이 없다.
 * OPEN에서 예측 전이면 바는 `?%` 균등이고 바 바로 아래 `투표하기` 버튼이 서며, 바의 칸을 눌러도
 * 그 픽이 골라진 작성 시트가 열린다 (KAN-710. 전에는 버튼이 여론 머리글에 있어 프리뷰 아래로
 * 밀렸다). 의견 자리는 잠금 지면이라 거기서도 작성이 열린다. 예측 뒤에는 실제 비율에 내 픽 체크,
 * 내 예측 상자(수정, 취소)가 서고 바는 읽기 전용이다. LOCKED 이후는 바와 상자만 읽기 전용이다.
 * 게스트도 작성 시트를 열고(KAN-705) 제출 성공 뒤에만 연동 안내를 띄운다. 정산된 경기는 상태 줄
 * 오른쪽에 투표 화면 랭킹 탭으로 가는 `랭킹 >` 링크가 선다(KAN-701).
 *
 * @param detail 경기 상세(헤더와 프리뷰)
 * @param summary 예측 요약. 예측 없는 경기는 null
 */
export function PredictionTab({
  detail,
  summary,
}: {
  detail: MatchDetail;
  summary: PredictionSummary | null;
}) {
  const { header, preview } = detail;
  const showToast = useErrorToast((state) => state.show);
  const [sheet, setSheet] = useState<Sheet>(null);
  const compare = useMemo(
    () =>
      preview
        ? buildTeamCompare(preview, { home: header.home, away: header.away })
        : null,
    [preview, header.home, header.away],
  );
  const hasPreview =
    preview !== null && (compare !== null || hasPreviewBlocks(preview));

  if (!summary && !hasPreview) {
    return (
      <p className="text-body text-text-4 py-16 text-center">
        프리뷰 정보가 아직 없어요
      </p>
    );
  }

  const teams = { home: header.home.name, away: header.away.name };
  const mine = summary?.myPrediction ?? null;
  const statusLine = summary ? predictionStatusLine(summary, teams) : null;
  const verdict = predictionVerdictLabel(mine?.result);
  /* 예측 전의 OPEN. 바 칸이 버튼이 되고 바 아래 투표하기가 선다 */
  const votable = summary?.status === "OPEN" && mine === null;

  /* 고칠 내 예측은 여는 순간의 값을 들고 간다. 열려 있는 동안 요약이 다시 와도 시트가 모드를 바꾸지 않게 */
  function openCompose(editing: boolean, pick: PredictionPick | null = null) {
    setSheet({ kind: "compose", mine: editing ? mine : null, pick });
  }

  function handleFailure(failure: PredictionFailure) {
    switch (failure.kind) {
      case "login":
        setSheet({ kind: "auth", mode: "login" });
        return;
      case "link-account":
        setSheet({ kind: "auth", mode: "link" });
        return;
      default:
        setSheet(null);
        showToast(failure.message);
    }
  }

  return (
    <>
      {summary && (
        <div className="px-edge pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pb-2.5">
            {statusLine && (
              <span
                className={`text-body-md min-w-0 font-bold tabular-nums ${
                  summary.status === "LOCKED" || summary.status === "SETTLED"
                    ? "text-text-strong"
                    : "text-text-3"
                }`}
              >
                {statusLine}
              </span>
            )}
            {verdict && (
              <span
                className={`text-body shrink-0 font-bold ${
                  verdict === "적중" ? "text-accent" : "text-text-4"
                }`}
              >
                {verdict}
              </span>
            )}
            {summary.status === "SETTLED" && (
              <Link
                href={debateTabPath("rank")}
                className="text-body text-accent -my-3 flex shrink-0 items-center gap-px py-3 font-bold active:opacity-60"
              >
                {PREDICTION_RANKING_LINK_LABEL}
                <ChevronRightIcon size={14} />
              </Link>
            )}
            <div className="flex-1" />
            <span className="text-label text-text-3 shrink-0 whitespace-nowrap tabular-nums">
              {formatPredictionCount(summary.totalCount)}
            </span>
          </div>
          {summary.status !== "UPCOMING" && (
            <PredictionBar
              home={header.home}
              away={header.away}
              distribution={summary.distribution}
              myPick={mine?.pick ?? null}
              totalCount={summary.totalCount}
              onPick={votable ? (pick) => openCompose(false, pick) : undefined}
            />
          )}
          {votable && (
            <button
              type="button"
              onClick={() => openCompose(false)}
              className="text-body-md text-accent mt-1 -mr-2 ml-auto flex h-9 w-fit items-center px-2 font-bold active:opacity-60"
            >
              {PREDICTION_VOTE_LABEL}
            </button>
          )}
        </div>
      )}

      {preview && hasPreview && (
        <PreviewSection header={header} preview={preview} compare={compare} />
      )}

      {summary && summary.status !== "UPCOMING" && (
        <PredictionOpinions
          summary={summary}
          teams={teams}
          onCompose={() => openCompose(false)}
          onEdit={() => openCompose(true)}
          onCancel={() => setSheet({ kind: "cancel" })}
        />
      )}
      {!summary && <div className="pb-4" />}

      {sheet?.kind === "compose" && (
        <PredictionComposerSheet
          header={header}
          mine={sheet.mine}
          initialPick={sheet.pick}
          onClose={() => setSheet(null)}
          onFailure={handleFailure}
          onSubmitted={() =>
            setSheet(
              readCookie(SESSION_KIND_COOKIE) === SESSION_KIND.guest
                ? { kind: "auth", mode: "submitted" }
                : null,
            )
          }
        />
      )}
      {sheet?.kind === "auth" && (
        <PredictionAuthSheet mode={sheet.mode} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === "cancel" && (
        <PredictionCancelSheet
          matchId={header.id}
          onClose={() => setSheet(null)}
          onFailure={handleFailure}
        />
      )}
    </>
  );
}
