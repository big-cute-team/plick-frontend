"use client";

import { useState } from "react";
import type { MatchPreview, MatchSummary } from "@plick/domain/live";
import type { TeamCompare } from "@plick/domain/prediction";
import { TeamCompareTable } from "@plick/ui/TeamCompareTable";
import { ChevronDownIcon, ChevronUpIcon } from "@plick/ui/icons";
import {
  PREVIEW_LESS_LABEL,
  PREVIEW_MORE_ID,
  PREVIEW_MORE_LABEL,
} from "@/_constants/live";
import {
  Absentees,
  HeadToHead,
  LeaguePositions,
  PreviewSectionTitle,
} from "./PreviewGrid";

/**
 * 예측/프리뷰 탭의 프리뷰 자리 (KAN-709, 모바일 `PreviewSection`의 웹 판). 위 줄은 2단이다. 왼쪽
 * 팀 비교 표, 오른쪽 결장자(전에 키플레이어 VS가 있던 자리). 그 아래 "프리뷰 더 보기" 토글을 누르면
 * 상대 전적과 리그 순위가 다시 2단으로 펼쳐진다. 기본은 접힘이고 토글 상태는 이 컴포넌트 상태라
 * 탭을 나갔다 오면 다시 접힌다. 좁은 폭에서는 2단이 1단으로 접힌다.
 *
 * 접어 두는 이유는 첫 화면이다. 1280×800에서 투표와 2단 다음에 여론 머리글이 걸쳐 보여야 하는데
 * 상대 전적 다섯 줄과 순위 두 줄까지 펼치면 여론이 한 화면 아래로 밀린다.
 *
 * 한쪽만 있으면 그 섹션이 왼쪽 반을 쓴다. 3열 표는 폭이 좁아야 읽혀 1단으로 늘리지 않는다. 팀 비교
 * 재료와 결장자가 다 없으면 윗줄을 비우고, 접어 둘 블록이 없으면 토글도 두지 않는다. 전부 없으면
 * null이라 호출부(`PredictionPanel`)가 빈 안내를 세운다.
 *
 * @param header 경기 헤더(두 팀)
 * @param preview 경기 상세의 프리뷰
 * @param compare 도메인이 만든 팀 비교 표. 재료가 없으면 null
 */
export function PreviewSection({
  header,
  preview,
  compare,
}: {
  header: MatchSummary;
  preview: MatchPreview;
  compare: TeamCompare | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const absentees = preview.absentees.length > 0;
  const more =
    preview.headToHead.length > 0 || preview.leaguePositions.length > 0;
  if (!compare && !absentees && !more) return null;

  return (
    <div>
      {(compare || absentees) && (
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
          {absentees && (
            <Absentees preview={preview} titleClassName="pt-4 pb-2" />
          )}
        </div>
      )}
      {more && (
        <>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={expanded ? PREVIEW_MORE_ID : undefined}
            onClick={() => setExpanded((value) => !value)}
            className="text-body text-text-2 hover:text-text-strong focus-visible:outline-accent mt-1 flex h-10 w-full items-center justify-center gap-1 font-bold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            {expanded ? PREVIEW_LESS_LABEL : PREVIEW_MORE_LABEL}
            {expanded ? (
              <ChevronUpIcon size={14} />
            ) : (
              <ChevronDownIcon size={14} />
            )}
          </button>
          {expanded && (
            <div
              id={PREVIEW_MORE_ID}
              className="grid grid-cols-1 gap-x-10 md:grid-cols-2"
            >
              {preview.headToHead.length > 0 && (
                <HeadToHead preview={preview} />
              )}
              {preview.leaguePositions.length > 0 && (
                <LeaguePositions preview={preview} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
