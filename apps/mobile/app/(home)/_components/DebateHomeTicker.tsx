"use client";
import { useRef, useState } from "react";
import { useHomeDebates } from "@plick/core/home-queries";
import { useOnScreen } from "@plick/core/useOnScreen";
import { useDebateClock } from "@plick/core/use-debate-clock";
import type { DebateListItem, InitialDebateList } from "@plick/domain/types";
import { DEBATE_TICKER_INTERVAL_MS, openDebates } from "@plick/domain/vs";
import { RotatingLine } from "@plick/ui/RotatingLine";
import { ArticleLink } from "@/_components/ArticleLink";

/** 펼친 전체 목록의 id. 띠의 펼치기 버튼이 `aria-controls`로 가리킨다. */
const DEBATE_LIST_ID = "home-debate-list";

/**
 * 진행 중인 투표를 한 줄에 하나씩 순서대로 넘기는 홈 투표 띠 (KAN-710). 실검 띠 바로 아래 서고
 * 오른쪽 끝 화살표를 누르면 띠 아래로 진행 중인 투표 전체가 펼쳐진다. 펼친 동안 자동 회전은
 * 멈춘다(실검과 같은 `RotatingLine`). 전환은 3초마다다. 실검(4.5초)과 같은 속도였는데 투표는 한 줄이
 * 질문뿐이라 더 느리게 보여 당겼다(KAN-714). 한 줄은 질문과 참여 수, 펼친 줄은 질문 아래에 선택지 둘과
 * 참여 수다. 누르면 그 기사(`ArticleLink`)로 가서 거기서 투표한다. 홈에서 바로 투표하지 않는다.
 *
 * 전에는 승부예측 아래 가로 카드 트랙(`DebateHomeTrack`)이었고 마감된 투표도 뒤에 붙였다. 카드가
 * 286px라 아래 소식 섹션이 첫 화면에서 500px 넘게 밀리던 것(ADR 0237 §4)을 띠 한 줄(48px)로
 * 바꿔 돌려받는다. 마감된 투표는 띠에 싣지 않는다. 돌아가는 한 줄에 "마감"이 섞이면 누를 이유가
 * 없는 줄이 자리를 차지한다. 마감 시각이 지나면 `useDebateClock`이 그 줄을 빼고 목록을 다시 받는다.
 *
 * 진행 중인 투표가 하나도 없거나 아직 못 받았으면 띠를 그리지 않는다. 실검처럼 빈 줄을 세우지 않는 건
 * 이 띠가 없어도 홈이 성립해서다. 다만 감시 요소(`ref`)는 높이 0으로 늘 흐름에 남긴다. `empty:hidden`으로
 * `display: none`을 만들면 `useOnScreen`이 안 보인다고 보고해 30초 폴링이 멈추고, 그 뒤 열린 투표가
 * 새로고침 전에는 안 뜬다(헤드리스 리뷰 지적). 높이 0인 요소도 뷰포트 안에 있으면 교차로 잡힌다.
 *
 * @param initial 서버가 받아 둔 투표 목록. 못 받았으면 undefined
 */
export function DebateHomeTicker({
  initial,
}: {
  initial: InitialDebateList | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(ref);
  const { data, refetch } = useHomeDebates(initial, visible);
  const now = useDebateClock(data ?? [], refetch);
  const [expanded, setExpanded] = useState(false);
  const open = openDebates(data ?? [], now);
  return (
    <div ref={ref} className={open.length > 0 ? "px-edge pt-3" : ""}>
      {open.length > 0 && (
        <>
          <RotatingLine
            label="투표"
            items={open.map((debate) => ({
              id: debate.id,
              content: (
                <ArticleLink
                  articleId={debate.articleId}
                  aria-label={`${debate.topic} 투표하러 가기`}
                  className="text-body text-text-strong focus-visible:outline-accent hover:text-accent flex h-full min-w-0 flex-1 items-center gap-2 focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {debate.topic}
                  </span>
                  <span className="text-caption text-text-3 shrink-0 tabular-nums">
                    {participantsLabel(debate)}
                  </span>
                </ArticleLink>
              ),
            }))}
            interval={DEBATE_TICKER_INTERVAL_MS}
            expanded={expanded}
            onToggle={() => setExpanded((value) => !value)}
            expandControls={DEBATE_LIST_ID}
          />
          {expanded && (
            <ol
              id={DEBATE_LIST_ID}
              aria-label="진행 중인 투표 전체"
              className="bg-elevate rounded-card mt-1 px-3 py-1"
            >
              {open.map((debate) => (
                <li
                  key={debate.id}
                  className="border-border-soft border-b last:border-b-0"
                >
                  <ArticleLink
                    articleId={debate.articleId}
                    aria-label={`${debate.topic} 투표하러 가기`}
                    className="focus-visible:outline-accent hover:text-accent flex min-h-11 flex-col justify-center gap-0.5 py-1.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
                  >
                    <span className="text-body text-text-strong truncate font-bold">
                      {debate.topic}
                    </span>
                    <span className="text-caption text-text-3 truncate">
                      {debate.optionA} vs {debate.optionB} ·{" "}
                      {participantsLabel(debate)} 참여
                    </span>
                  </ArticleLink>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

/** 참여 수 한 토막(`1,234명`). 카드의 참여 수 표기와 같은 셈이다. */
function participantsLabel(debate: DebateListItem): string {
  return `${(debate.voteCountA + debate.voteCountB).toLocaleString()}명`;
}
