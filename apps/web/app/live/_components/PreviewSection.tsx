"use client";

import { useState } from "react";
import type { MatchPreview, MatchSummary } from "@plick/domain/live";
import type { TeamCompare } from "@plick/domain/prediction";
import { TeamCompareTable } from "@plick/ui/TeamCompareTable";
import { ChevronDownIcon, ChevronUpIcon } from "@plick/ui/icons";
import {
  PREVIEW_ABSENTEES_ID,
  PREVIEW_ABSENTEES_LABEL,
  PREVIEW_LESS_LABEL,
} from "@/_constants/live";
import {
  Absentees,
  HeadToHead,
  LeaguePositions,
  PreviewSectionTitle,
} from "./PreviewGrid";

/**
 * 예측/프리뷰 탭의 프리뷰 자리 (KAN-709, 모바일 `PreviewSection`의 웹 판). 위 줄은 2단이다. 왼쪽
 * 팀 비교 표, 오른쪽 상대 전적과 리그 순위. 그 아래 "결장자 확인하기" 토글을 누르면 결장자가 팀별
 * 두 단으로 펼쳐진다 (KAN-710). 기본은 접힘이고 토글 상태는 이 컴포넌트 상태라 탭을 나갔다 오면
 * 다시 접힌다. 좁은 폭에서는 2단이 1단으로 접힌다.
 *
 * KAN-709에서는 오른쪽이 결장자였고 토글이 상대 전적과 리그 순위를 펼쳤다. 결장자는 두 팀 합쳐
 * 열 줄을 넘기기 일쑤라 윗줄 높이를 결장자가 정했고, 1280×800에서 여론 머리글이 첫 화면 밖으로
 * 밀렸다. 상대 전적 다섯 줄과 순위 두 줄은 높이가 정해져 있어 오른쪽에 두고, 긴 쪽을 접었다.
 * 모바일은 1단이라 그대로 "프리뷰 더 보기" 안에 셋 다 있다.
 *
 * 한쪽만 있으면 그 섹션이 왼쪽 반을 쓴다. 3열 표는 폭이 좁아야 읽혀 1단으로 늘리지 않는다. 팀 비교
 * 재료와 상대 전적, 순위가 다 없으면 윗줄을 비우고, 결장자가 없으면 토글도 두지 않는다. 전부 없으면
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
  const headToHead = preview.headToHead.length > 0;
  const positions = preview.leaguePositions.length > 0;
  if (!compare && !absentees && !headToHead && !positions) return null;

  return (
    <div>
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
      {absentees && (
        <>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={expanded ? PREVIEW_ABSENTEES_ID : undefined}
            onClick={() => setExpanded((value) => !value)}
            className="text-body text-text-2 hover:text-text-strong focus-visible:outline-accent mt-1 flex h-10 w-full items-center justify-center gap-1 font-bold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            {expanded ? PREVIEW_LESS_LABEL : PREVIEW_ABSENTEES_LABEL}
            {expanded ? (
              <ChevronUpIcon size={14} />
            ) : (
              <ChevronDownIcon size={14} />
            )}
          </button>
          {expanded && (
            <div id={PREVIEW_ABSENTEES_ID}>
              <Absentees preview={preview} titleClassName="pt-1 pb-2" split />
            </div>
          )}
        </>
      )}
    </div>
  );
}
