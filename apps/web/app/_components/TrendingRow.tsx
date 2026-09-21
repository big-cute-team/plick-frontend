import Link from "next/link";
import { TEAMS, TEAM_CODES } from "@plick/domain/constants";
import { storyPath, teamHubPath } from "@plick/domain/format";
import type { TrendItem } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { TrendDeltaBadge } from "@/_components/TrendDeltaBadge";
import { TREND_CREST_SIZE, TREND_HIGHLIGHT_RANK } from "@/_constants/trends";

/**
 * 급상승 랭킹 한 줄 (KAN-501, 이슈 전환 KAN-523) — 순위, 이름, 순위 변동.
 *
 * 이슈 줄은 이슈 제목을 한 줄로 자른다. 누르면 이슈 상세(`/stories/[storyId]`)로
 * 간다. KAN-523 때 제목 옆에 달았던 기사 수는 KAN-525에서 뺐다 — 순위 카드에
 * 순위 변동 말고 다른 숫자가 서면 읽는 사람이 헷갈리고, 제목이 그만큼 더 잘렸다.
 * `articleCount`는 이슈 상세가 계속 쓴다. 원형 사진 자리는 없다 — BE `imageUrl`이
 * 이슈의 최신 기사 이미지라 26px 원에 넣으면 무엇인지 알아볼 수 없다.
 *
 * 구단 줄은 이슈 랭킹이 없을 때의 대체다. 레지스트리 크레스트를 달고 팀
 * 허브(`/teams/[slug]`)로 간다. 팀 id가 레지스트리에 없으면(6팀 마스터라
 * 실제로는 안 생긴다) 갈 곳이 없어 링크 없는 줄로 남긴다.
 *
 * @param item 랭킹 한 줄
 * @param type 이 줄이 이슈 랭킹인지 구단 랭킹인지. 링크와 왼쪽 로고가 갈린다
 */
export function TrendingRow({
  item,
  type,
}: {
  item: TrendItem;
  type: "STORY" | "TEAM";
}) {
  const code = type === "TEAM" ? (TEAM_CODES[item.entityId] ?? null) : null;
  const href =
    type === "STORY"
      ? storyPath(String(item.entityId))
      : code && teamHubPath(code);

  const body = (
    <>
      <span
        className={`text-tab w-6 shrink-0 font-bold ${
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
      <span className="text-body text-text group-hover:text-accent min-w-0 flex-1 truncate font-semibold transition-colors">
        {item.name}
      </span>
      <TrendDeltaBadge item={item} />
    </>
  );

  const row = "flex items-center gap-2.5 py-2";

  return (
    <li className="border-border border-b last:border-b-0">
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
