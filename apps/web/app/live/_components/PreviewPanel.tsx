"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { PredictionFailure } from "@plick/core/prediction-errors";
import type { MatchDetail } from "@plick/domain/live";
import {
  buildTeamCompare,
  type KeyPlayers,
  type PredictionSummary,
} from "@plick/domain/prediction";
import { KeyPlayerVs } from "@plick/ui/KeyPlayerVs";
import { TeamCompareTable } from "@plick/ui/TeamCompareTable";
import { useKeyPlayers } from "@plick/core/prediction-queries";
import { useKeyPlayerVote } from "@/_hooks/useKeyPlayerVote";
import type { MatchTabKey } from "@/_types/live";
import { PredictionPreviewBand } from "./PredictionPreviewBand";
import { PredictionToast } from "./PredictionToast";
import { PreviewGrid, PreviewSectionTitle } from "./PreviewGrid";

/* 비로그인이 투표하면 뜨는 팝업. 눌러야 뜨는 조건부 UI라 초기 번들에서 뺀다 */
const PredictionAuthDialog = dynamic(
  () => import("./PredictionAuthDialog").then((m) => m.PredictionAuthDialog),
  { ssr: false },
);

/**
 * 경기 상세 프리뷰 탭 (KAN-699, 시안 가이드 §5.3, 모바일 `PreviewTab`의 웹 판). 위 줄은 팀 비교 표와
 * 키플레이어 VS를 좌우 2단으로, 그 아래 승부예측 묶음(예측 탭으로 가는 띠), 그리고 전부터 있던 결장자·
 * 상대 전적·리그 순위·직전 선발(`PreviewGrid`)이다. 시안에는 앞의 셋만 있지만 뒤의 넷도 이 탭이 유일한
 * 자리라 그대로 둔다. 좁은 폭에서는 2단이 1단으로 접힌다.
 *
 * 팀 비교는 경기 상세의 `preview`로 도메인이 만들고 재료가 없으면 그리지 않는다. 키플레이어는 따로 받는
 * 쿼리(`useKeyPlayers`)라 404(빅6 밖)면 묶음이 없다. 승부예측 묶음은 예측 탭이 서는 조건(요약이 있음)과
 * 같다. 넷이 다 비면 안내 한 줄이다.
 *
 * 투표 실패는 종류별로 가른다. 비로그인 401은 로그인 팝업, 나머지(마감 409, 스쿼드 밖 400, 네트워크)는
 * 한 줄 토스트다. 웹은 전역 토스트 스토어가 없어 예측 탭처럼 여기서 문구와 일련번호를 든다.
 *
 * @param detail 경기 상세
 * @param summary 예측 요약. 예측 없는 경기는 null
 * @param keyPlayers 서버가 받아 둔 키플레이어 씨앗. null은 예측 없는 경기, undefined는 서버가 못 받은 것
 * @param onSelectTab 탭을 바꿀 때. 승부예측 묶음이 예측 탭으로 보낸다
 */
export function PreviewPanel({
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
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string | null; seq: number }>({
    message: null,
    seq: 0,
  });
  const clearToast = useCallback(
    () => setToast((t) => ({ ...t, message: null })),
    [],
  );
  const vote = useKeyPlayerVote(header.id, (failure: PredictionFailure) => {
    if (failure.kind === "login") setAuthOpen(true);
    else setToast((t) => ({ message: failure.message, seq: t.seq + 1 }));
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
      <p className="text-body-md text-text-4 py-10">
        프리뷰 정보가 아직 없어요
      </p>
    );
  }

  return (
    <div>
      {/* 한쪽만 있으면 그 섹션이 왼쪽 반을 쓴다. 3열 표와 두 명 VS는 폭이 좁아야 읽혀 1단으로 늘리지 않는다 */}
      {(compare || keyPlayers) && (
        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {compare && (
            <section className="min-w-0">
              <PreviewSectionTitle className="pt-5 pb-2">
                팀 비교
              </PreviewSectionTitle>
              <TeamCompareTable
                home={header.home}
                away={header.away}
                compare={compare}
                size="lg"
              />
            </section>
          )}
          {keyPlayers && (
            <section className="min-w-0">
              <PreviewSectionTitle className="pt-5 pb-3.5">
                키플레이어
              </PreviewSectionTitle>
              <KeyPlayerVs
                home={header.home}
                away={header.away}
                players={keyPlayers}
                canVote={keyPlayers.status === "OPEN"}
                voting={vote.isPending}
                onVote={(side, playerId) => vote.mutate({ side, playerId })}
                size="lg"
              />
            </section>
          )}
        </div>
      )}
      {summary && (
        <PredictionPreviewBand
          header={header}
          summary={summary}
          onOpenPrediction={() => onSelectTab("prediction")}
        />
      )}
      {preview && <PreviewGrid preview={preview} />}
      {authOpen && (
        <PredictionAuthDialog mode="login" onClose={() => setAuthOpen(false)} />
      )}
      <PredictionToast
        message={toast.message}
        seq={toast.seq}
        onDone={clearToast}
      />
    </div>
  );
}
