"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { PredictionFailure } from "@plick/core/prediction-errors";
import type { MatchDetail } from "@plick/domain/live";
import {
  buildTeamCompare,
  type KeyPlayers,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { KeyPlayerVs } from "@plick/ui/KeyPlayerVs";
import { TeamCompareTable } from "@plick/ui/TeamCompareTable";
import { useKeyPlayers } from "@/_hooks/useKeyPlayers";
import { useKeyPlayerVote } from "@/_hooks/useKeyPlayerVote";
import { useErrorToast } from "@/_stores/error-toast";
import type { MatchTabKey } from "@/_types/live";
import { PredictionPreviewBand } from "./PredictionPreviewBand";
import { PreviewBlocks, PreviewSectionTitle } from "./PreviewBlocks";

/* 비로그인이 투표하면 뜨는 시트. 눌러야 뜨는 조건부 UI라 초기 번들에서 뺀다 */
const PredictionAuthSheet = dynamic(
  () => import("./PredictionAuthSheet").then((m) => m.PredictionAuthSheet),
  { ssr: false },
);

/**
 * 경기 상세 프리뷰 탭 (KAN-699, 시안 가이드 §5.3). 위에서 아래로 팀 비교 표, 키플레이어 VS와 투표,
 * 승부예측 묶음(예측 탭으로 가는 띠), 그리고 전부터 있던 결장자·상대 전적·리그 순위·직전 선발
 * (`PreviewBlocks`)이다. 시안에는 앞의 셋만 있지만 뒤의 넷도 이 탭이 유일한 자리라 그대로 둔다.
 *
 * 팀 비교는 경기 상세의 `preview`(팀 전적, 순위, 맞대결 요약)로 도메인이 만들고 재료가 없으면 그리지
 * 않는다. 키플레이어는 따로 받는 쿼리(`useKeyPlayers`)라 404(빅6 밖)면 묶음이 없다. 승부예측 묶음은
 * 예측 탭이 서는 조건(요약이 있음)과 같다. 넷이 다 비면 안내 한 줄이다.
 *
 * 투표 실패는 종류별로 가른다. 비로그인 401은 로그인 시트, 나머지(마감 409, 스쿼드 밖 400, 네트워크)는
 * 전역 토스트다. 게스트도 투표할 수 있어 연동 안내는 오지 않는다.
 *
 * @param detail 경기 상세
 * @param summary 예측 요약. 예측 없는 경기는 null
 * @param keyPlayers 서버가 받아 둔 키플레이어 씨앗. null은 예측 없는 경기, undefined는 서버가 못 받은 것
 * @param onSelectTab 탭을 바꿀 때. 승부예측 묶음이 예측 탭으로 보낸다
 */
export function PreviewTab({
  detail,
  summary,
  keyPlayers: seed,
  onSelectTab,
}: {
  detail: MatchDetail;
  summary: PredictionSummary | null;
  keyPlayers: KeyPlayers | null | undefined;
  onSelectTab: (tab: MatchTabKey) => void;
}) {
  const { header, preview } = detail;
  const { data: keyPlayers = null } = useKeyPlayers(header.id, seed);
  const showToast = useErrorToast((state) => state.show);
  const [authOpen, setAuthOpen] = useState(false);
  const vote = useKeyPlayerVote(header.id, (failure: PredictionFailure) => {
    if (failure.kind === "login") setAuthOpen(true);
    else showToast(failure.message);
  });
  const compare = useMemo(
    () =>
      preview
        ? buildTeamCompare(preview, { home: header.home, away: header.away })
        : null,
    [preview, header.home, header.away],
  );

  if (!compare && !keyPlayers && !summary && !preview) {
    return (
      <p className="text-body text-text-4 py-16 text-center">
        프리뷰 정보가 아직 없어요
      </p>
    );
  }

  return (
    <>
      <div className={`px-edge flex flex-col ${preview ? "" : "pb-6"}`}>
        {compare && (
          <section>
            <PreviewSectionTitle>팀 비교</PreviewSectionTitle>
            <TeamCompareTable
              home={header.home}
              away={header.away}
              compare={compare}
            />
          </section>
        )}
        {keyPlayers && (
          <section>
            <PreviewSectionTitle className="pt-7 pb-3.5">
              키플레이어
            </PreviewSectionTitle>
            <KeyPlayerVs
              home={header.home}
              away={header.away}
              players={keyPlayers}
              canVote={keyPlayers.status === "OPEN"}
              voting={vote.isPending}
              onVote={(side, playerId) => vote.mutate({ side, playerId })}
            />
          </section>
        )}
        {summary && (
          <PredictionPreviewBand
            header={header}
            summary={summary}
            onOpenPrediction={() => onSelectTab("prediction")}
          />
        )}
      </div>
      {preview && <PreviewBlocks preview={preview} />}
      {authOpen && (
        <PredictionAuthSheet mode="login" onClose={() => setAuthOpen(false)} />
      )}
    </>
  );
}
