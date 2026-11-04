"use client";

import { useMemo } from "react";
import type { MatchDetail } from "@plick/domain/live";
import { buildTeamCompare } from "@plick/domain/prediction";
import { TeamCompareTable } from "@plick/ui/TeamCompareTable";
import {
  Absentees,
  HeadToHead,
  LeaguePositions,
  PreviewSectionTitle,
} from "./PreviewGrid";

/**
 * 경기 상세 프리뷰 탭 (KAN-699, 시안 가이드 §5.3, 모바일 `PreviewTab`의 웹 판. KAN-709에서 예측과
 * 합쳤다가 KAN-729에서 다시 뗐다). 위 줄은 2단이다. 왼쪽 팀 비교 표, 오른쪽 상대 전적과 리그 순위.
 * 그 아래 결장자가 팀별 두 단으로 전체 폭에 선다. 접는 토글은 없다. 합쳐 있던 동안은 "결장자 확인하기"
 * 토글 안에 결장자를 접어 1280×800 첫 화면에 여론 머리글을 들이려 했는데(KAN-710), 탭이 따로 선
 * 지금은 접을 이유가 없다. 좁은 폭에서는 2단이 1단으로 접힌다.
 *
 * 한쪽만 있으면 그 섹션이 왼쪽 반을 쓴다. 3열 표는 폭이 좁아야 읽혀 1단으로 늘리지 않는다. 팀 비교는
 * 경기 상세의 `preview`로 도메인이 만들고 재료가 없으면 그리지 않는다. 블록 셋도 각자 비어 있으면
 * 빠진다. 전부 없으면 안내 한 줄이다. 예측 탭이 서는 조건(요약이 있음)과는 무관해서 빅6 밖 예정
 * 경기도 이 탭은 있다.
 *
 * @param detail 경기 상세(헤더와 프리뷰)
 */
export function PreviewPanel({ detail }: { detail: MatchDetail }) {
  const { header, preview } = detail;
  const compare = useMemo(
    () =>
      preview
        ? buildTeamCompare(preview, { home: header.home, away: header.away })
        : null,
    [preview, header.home, header.away],
  );
  const absentees = preview !== null && preview.absentees.length > 0;
  const headToHead = preview !== null && preview.headToHead.length > 0;
  const positions = preview !== null && preview.leaguePositions.length > 0;

  if (!preview || (!compare && !absentees && !headToHead && !positions)) {
    return (
      <p className="text-body-md text-text-4 py-10">
        프리뷰 정보가 아직 없어요
      </p>
    );
  }

  return (
    <div className="pb-4">
      {(compare || headToHead || positions) && (
        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {compare && (
            <section className="min-w-0">
              <PreviewSectionTitle className="pt-4 pb-2">
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
          {(headToHead || positions) && (
            <div className="min-w-0">
              {headToHead && (
                <HeadToHead preview={preview} titleClassName="pt-4 pb-2" />
              )}
              {positions && <LeaguePositions preview={preview} />}
            </div>
          )}
        </div>
      )}
      {absentees && <Absentees preview={preview} split />}
    </div>
  );
}
