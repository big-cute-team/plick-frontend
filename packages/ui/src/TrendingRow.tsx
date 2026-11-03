import type { ComponentType, ReactNode } from "react";
import { TEAMS, TEAM_CODES } from "@plick/domain/constants";
import { storyPath, teamHubPath } from "@plick/domain/format";
import type { TrendItem } from "@plick/domain/types";
import { TeamCrest } from "./TeamCrest";
import { TrendDeltaBadge } from "./TrendDeltaBadge";

/** 이 순위까지는 번호를 accent로 세운다. 한눈에 상위권이 보이게 하는 장치다. */
const TREND_HIGHLIGHT_RANK = 3;

/** 구단 줄 왼쪽 크레스트의 한 변 px. 웹 우측 레일에서 이름 자리를 가장 덜 먹는 크기다. */
const TREND_CREST_SIZE = 26;

/** 줄을 감싸는 링크. 앱이 `next/link`를 넘기고, 없으면 평범한 앵커다. */
export type TrendLink = ComponentType<{
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
 * 급상승 순위 한 줄 (KAN-501, 이슈 전환 KAN-523, 시안 KAN-567). 순위, 이름, 순위 변동. 시안(웹 우측
 * 레일): 높이 33, 순위 13/900(1~3위 강조색), 이름 12.5 한 줄 말줄임, 변동은 오른쪽 끝 26px 칸에
 * 11/700. 줄 사이는 연한 선이다.
 *
 * 웹 `_components/TrendingRow`였는데 홈 실검 띠를 펼치면 두 앱이 같은 줄을 그리게 되어(KAN-709)
 * `@plick/ui`로 올렸다(ADR 0011). 이 패키지는 `next`를 모르므로 링크 컴포넌트는 앱이 `Link`로
 * 넘긴다(홈 카드가 링크를 앱에 맡기는 것과 같은 판단). 펼친 목록은 손가락 목표가 필요해 `size="lg"`
 * (높이 44, 글자 13.5)다.
 *
 * 이슈 줄은 이슈 제목을 한 줄로 자른다. 누르면 이슈 상세(`/stories/[storyId]`)로
 * 간다. KAN-523 때 제목 옆에 달았던 기사 수는 KAN-525에서 뺐다. 순위 카드에
 * 순위 변동 말고 다른 숫자가 서면 읽는 사람이 헷갈리고, 제목이 그만큼 더 잘렸다.
 * `articleCount`는 이슈 상세가 계속 쓴다. 원형 사진 자리는 없다. BE `imageUrl`이
 * 이슈의 최신 기사 이미지라 작은 원에 넣으면 무엇인지 알아볼 수 없다.
 *
 * 구단 줄은 이슈 랭킹이 없을 때의 대체다. 레지스트리 크레스트를 달고 팀
 * 허브(`/teams/[slug]`)로 간다. 팀 id가 레지스트리에 없으면(6팀 마스터라
 * 실제로는 안 생긴다) 갈 곳이 없어 링크 없는 줄로 남긴다.
 *
 * @param item 랭킹 한 줄
 * @param type 이 줄이 이슈 랭킹인지 구단 랭킹인지. 링크와 왼쪽 로고가 갈린다
 * @param size `sm`은 웹 우측 레일(33px), `lg`는 홈 실검을 펼친 목록(44px)
 * @param Link 줄을 감싸는 링크 컴포넌트. 앱은 `next/link`를 넘긴다
 */
export function TrendingRow({
  item,
  type,
  size = "sm",
  Link = Anchor,
}: {
  item: TrendItem;
  type: "STORY" | "TEAM";
  size?: "sm" | "lg";
  Link?: TrendLink;
}) {
  const code = type === "TEAM" ? (TEAM_CODES[item.entityId] ?? null) : null;
  const href =
    type === "STORY"
      ? storyPath(String(item.entityId))
      : code && teamHubPath(code);
  const large = size === "lg";

  const body = (
    <>
      <span
        className={`${large ? "text-body-md" : "text-body"} w-3.5 shrink-0 font-black tabular-nums ${
          item.rank <= TREND_HIGHLIGHT_RANK ? "text-accent" : "text-text-4"
        }`}
      >
        {item.rank}
      </span>
      {code && (
        <TeamCrest
          team={TEAMS[code]}
          size={TREND_CREST_SIZE}
          className="shrink-0"
        />
      )}
      <span
        className={`${large ? "text-body text-text-strong font-bold" : "text-label-lg text-text"} group-hover:text-accent min-w-0 flex-1 truncate`}
      >
        {item.name}
      </span>
      <TrendDeltaBadge item={item} />
    </>
  );

  const row = `flex items-center gap-2.5 ${large ? "h-11" : "h-8.25"}`;

  return (
    <li className="border-border-soft border-b last:border-b-0">
      {href ? (
        <Link
          href={href}
          className={`group focus-visible:outline-accent ${row} focus-visible:outline-2 focus-visible:-outline-offset-2`}
        >
          {body}
        </Link>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}
