"use client";

import { useId, useState, type ComponentType, type ReactNode } from "react";
import {
  MATCH_BRIEFING_CAUTION_LABEL,
  MATCH_BRIEFING_EVIDENCE_CLOSE_LABEL,
  MATCH_BRIEFING_EVIDENCE_LABEL,
  MATCH_BRIEFING_SOURCE_KIND_LABEL,
  MATCH_BRIEFING_TITLE,
  matchBriefingAsOfLabel,
  matchBriefingEvidence,
  matchBriefingSourceHref,
  type MatchBriefing,
} from "@plick/domain/match-briefing";
import { ChevronDownIcon, ChevronUpIcon } from "./icons";

/** 근거 줄을 감싸는 링크. 앱이 `next/link`를 넘기고, 없으면 평범한 앵커다(`TrendingRow`와 같은 규약). */
export type MatchBriefingLink = ComponentType<{
  href: string;
  className?: string;
  children: ReactNode;
}>;

function Anchor({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/**
 * AI 경기 브리핑 카드 (KAN-724). 예측/프리뷰 탭의 투표 아래, 팀 비교 위에 선다. 위에서 아래로 제목과
 * 자료 기준 시각("11월 4일 12:00 기준"), 핵심 문장 1~3개, 주의사항 한 줄, "근거 보기" 토글이다. 토글을
 * 펼치면 문장들이 가리키는 출처가 종류(기사, 경기)와 제목으로 줄줄이 서고 각 줄이 기존 기사 상세나
 * 경기 상세로 간다. 기본은 접힘이라 모바일에서 투표 진입이 긴 글에 밀리지 않는다.
 *
 * 모델이 만든 문자열은 전부 JSX 텍스트 노드로만 그린다. HTML로 렌더하지 않는다. 출처 목록에 있는
 * 근거만 링크가 되고(검증은 `parseMatchBriefing`), 근거가 하나도 없으면 토글을 두지 않는다.
 *
 * 면은 `bg-elevate`에 `rounded-card`라 웹에서 각지고 테두리는 없다(홈 예측 카드와 같은 판단). 토글은
 * `button`에 `aria-expanded`와 `aria-controls`를 달아 키보드로 열고 닫는다. 링크 컴포넌트는 이
 * 패키지가 `next`를 모르므로 앱이 넘긴다.
 *
 * @param briefing 검증을 거친 브리핑. 보일지 말지는 호출부(`useMatchBriefing`)가 정한다
 * @param size `sm`은 앱(패딩 14), `lg`는 웹(패딩 16, hover·focus 상태)
 * @param Link 근거 줄을 감싸는 링크 컴포넌트. 앱은 `next/link`를 넘긴다
 */
export function MatchBriefingCard({
  briefing,
  size = "sm",
  Link = Anchor,
  className = "",
}: {
  briefing: MatchBriefing;
  size?: "sm" | "lg";
  Link?: MatchBriefingLink;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const evidence = matchBriefingEvidence(briefing);
  const large = size === "lg";
  const interactive = large
    ? "hover:text-accent-hover focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2"
    : "active:opacity-60";

  return (
    <section
      aria-label={MATCH_BRIEFING_TITLE}
      className={`rounded-card bg-elevate min-w-0 ${
        large ? "px-4 pt-3.5 pb-2" : "px-3.5 pt-3 pb-1.5"
      } ${className}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h3
          className={`text-text-strong min-w-0 font-bold ${
            large ? "text-body-md" : "text-body"
          }`}
        >
          {MATCH_BRIEFING_TITLE}
        </h3>
        <span className="text-caption text-text-3 ml-auto shrink-0 tabular-nums">
          {matchBriefingAsOfLabel(briefing.dataAsOf)}
        </span>
      </div>
      <ul
        className={`text-text-2 mt-2 flex flex-col gap-1.5 ${
          large ? "text-body-md" : "text-body"
        }`}
      >
        {briefing.points.map((point, index) => (
          <li key={index} className="flex gap-2 leading-relaxed">
            <span
              aria-hidden
              className="bg-accent rounded-pill mt-[0.6em] size-1.5 shrink-0"
            />
            <span className="min-w-0 break-words">{point.text}</span>
          </li>
        ))}
      </ul>
      {briefing.cautions.length > 0 && (
        <p className="text-caption text-text-4 mt-2 leading-relaxed break-words">
          <span className="font-bold">{MATCH_BRIEFING_CAUTION_LABEL}</span>
          <span> · </span>
          {briefing.cautions[0]}
        </p>
      )}
      {evidence.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={expanded ? panelId : undefined}
            onClick={() => setExpanded((value) => !value)}
            className={`text-label text-accent mt-1 -ml-1 flex items-center gap-0.5 px-1 font-bold ${
              large ? "h-8" : "h-9"
            } ${interactive}`}
          >
            {expanded
              ? MATCH_BRIEFING_EVIDENCE_CLOSE_LABEL
              : MATCH_BRIEFING_EVIDENCE_LABEL}
            {expanded ? (
              <ChevronUpIcon size={14} />
            ) : (
              <ChevronDownIcon size={14} />
            )}
          </button>
          {expanded && (
            <ul
              id={panelId}
              className="border-border-soft mb-1 flex flex-col gap-1 border-t pt-2"
            >
              {evidence.map((source) => {
                const href = matchBriefingSourceHref(source);
                const label = (
                  <>
                    <span className="text-caption text-text-4 shrink-0 font-bold">
                      {MATCH_BRIEFING_SOURCE_KIND_LABEL[source.kind]}
                    </span>
                    <span className="min-w-0 break-words">{source.title}</span>
                  </>
                );
                const rowClass = `text-label text-text-3 flex min-w-0 items-baseline gap-1.5 leading-relaxed ${
                  large ? "py-0.5" : "py-1"
                }`;
                return (
                  <li key={source.id}>
                    {href ? (
                      <Link
                        href={href}
                        className={`${rowClass} underline underline-offset-2 ${interactive}`}
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className={rowClass}>{label}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
