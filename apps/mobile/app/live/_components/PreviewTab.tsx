"use client";

import { useMemo } from "react";
import { hasPreviewBlocks, type MatchDetail } from "@plick/domain/live";
import { buildTeamCompare } from "@plick/domain/prediction";
import { TeamCompareTable } from "@plick/ui/TeamCompareTable";
import { PreviewBlocks, PreviewSectionTitle } from "./PreviewBlocks";

/**
 * 경기 상세 프리뷰 탭 (KAN-699, 시안 가이드 §5.3. KAN-709에서 예측과 합쳤다가 KAN-729에서 다시 뗐다).
 * 위에서 아래로 팀 비교 표, 결장자, 상대 전적, 리그 순위(`PreviewBlocks`)를 접는 토글 없이 다 펼친다.
 * 합쳐 있던 동안은 "프리뷰 더 보기" 토글 안에 뒤의 셋을 접어 뒀는데, 첫 화면을 투표와 여론에 내주려던
 * 것이라 탭이 따로 선 지금은 접을 이유가 없다.
 *
 * 팀 비교는 경기 상세의 `preview`(팀 전적, 순위, 맞대결 요약)로 도메인이 만들고 재료가 없으면 그리지
 * 않는다. 블록 셋도 각자 비어 있으면 빠진다. 전부 없으면 안내 한 줄이다. 예측 탭이 서는 조건(요약이
 * 있음)과는 무관해서 빅6 밖 예정 경기도 이 탭은 있다.
 *
 * @param detail 경기 상세(헤더와 프리뷰)
 */
export function PreviewTab({ detail }: { detail: MatchDetail }) {
  const { header, preview } = detail;
  const compare = useMemo(
    () =>
      preview
        ? buildTeamCompare(preview, { home: header.home, away: header.away })
        : null,
    [preview, header.home, header.away],
  );
  const blocks = preview !== null && hasPreviewBlocks(preview);

  if (!compare && !blocks) {
    return (
      <p className="text-body text-text-4 py-16 text-center">
        프리뷰 정보가 아직 없어요
      </p>
    );
  }

  return (
    <>
      {compare && (
        <section className="px-edge">
          <PreviewSectionTitle className="pt-3.5 pb-1">
            팀 비교
          </PreviewSectionTitle>
          <TeamCompareTable
            home={header.home}
            away={header.away}
            compare={compare}
          />
        </section>
      )}
      {preview && blocks && <PreviewBlocks preview={preview} />}
    </>
  );
}
