"use client";

import { useState } from "react";
import {
  hasPreviewBlocks,
  type MatchPreview,
  type MatchSummary,
} from "@plick/domain/live";
import type { TeamCompare } from "@plick/domain/prediction";
import { TeamCompareTable } from "@plick/ui/TeamCompareTable";
import { ChevronDownIcon, ChevronUpIcon } from "@plick/ui/icons";
import {
  PREVIEW_LESS_LABEL,
  PREVIEW_MORE_ID,
  PREVIEW_MORE_LABEL,
} from "@/_constants/live";
import { PreviewBlocks, PreviewSectionTitle } from "./PreviewBlocks";

/**
 * 예측/프리뷰 탭의 프리뷰 자리 (KAN-709). 팀 비교 표가 먼저 서고, 그 아래 "프리뷰 더 보기" 토글을
 * 누르면 결장자, 상대 전적, 리그 순위(`PreviewBlocks`)가 펼쳐진다. 기본은 접힘이고 토글 상태는
 * 이 컴포넌트 상태라 탭을 나갔다 오면 다시 접힌다.
 *
 * 접어 두는 이유는 첫 화면이다. 투표와 팀 비교 다음에 여론 머리글까지 스크롤 없이 보여야 하는데
 * (기준 iPhone 15, Safari 주소창 있음) 결장자 명단만 해도 한 화면이 넘는다. 전에 프리뷰 탭이
 * 따로일 때는 위에서 아래로 다 펼쳤었다.
 *
 * 팀 비교 재료가 없으면 표를 그리지 않고, 접어 둘 블록이 하나도 없으면 토글도 두지 않는다. 둘 다
 * 없으면 null이라 호출부(`PredictionTab`)가 빈 안내를 세운다.
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
  const more = hasPreviewBlocks(preview);
  if (!compare && !more) return null;

  return (
    <div className="px-edge">
      {compare && (
        <section>
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
      {more && (
        <>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={expanded ? PREVIEW_MORE_ID : undefined}
            onClick={() => setExpanded((value) => !value)}
            className="text-body text-text-2 flex min-h-11 w-full items-center justify-center gap-1 font-bold active:opacity-60"
          >
            {expanded ? PREVIEW_LESS_LABEL : PREVIEW_MORE_LABEL}
            {expanded ? (
              <ChevronUpIcon size={14} />
            ) : (
              <ChevronDownIcon size={14} />
            )}
          </button>
          {expanded && (
            <div id={PREVIEW_MORE_ID}>
              <PreviewBlocks preview={preview} className="pb-2" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
