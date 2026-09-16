import Link from "next/link";
import { TEAMS, TEAM_CODES } from "@plick/domain/constants";
import { figurePath, teamHubPath } from "@plick/domain/format";
import type { TrendItem, TrendType } from "@plick/domain/types";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { TrendDeltaBadge } from "@/_components/TrendDeltaBadge";

/** 이 순위까지는 번호를 accent로 세운다. 한눈에 상위권이 보이게 하는 장치다. */
const HIGHLIGHT_RANK = 3;

/** 왼쪽 로고·사진의 한 변 px. 320px 사이드바 폭에서 이름 자리를 가장 덜 먹는 크기다. */
const AVATAR = 26;

/**
 * 급상승 랭킹 한 줄 (KAN-501) — 순위, 로고·사진, 이름, 변화 표시.
 *
 * 누르면 그 팀이나 선수의 관련 기사 전체 보기로 간다. 팀은 팀 허브
 * (`/teams/[slug]`), 선수는 인물 프로필(`/figures/[figureId]`)이고 둘 다 관련
 * 기사 목록이 본문이다. 팀 id가 레지스트리에 없으면(6팀 마스터라 실제로는 안
 * 생긴다) 갈 곳이 없어 링크 없는 줄로 남긴다.
 *
 * 팀 로고는 BE `imageUrl`이 아니라 레지스트리 크레스트를 그린다 — 팀은 6개
 * 고정이라 에셋이 앱 안에 이미 있고, BE 로고는 확인 시점 전부 null이다(팀
 * 프로필 KAN-500과 같은 판단). 선수 사진은 그렇게 박아둘 수 없어(200명이 넘는다)
 * `imageUrl`이 오면 쓰고, 없으면 자리 자체를 그리지 않고 이름이 순위 바로 옆에
 * 붙는다 — 확인 시점 전 행이 빈 값이라 빈 원을 깔면 목록 전체가 회색 원 줄이
 * 된다. 값이 채워지기 시작하면 그 줄부터 사진이 붙는다.
 *
 * @param item 랭킹 한 줄
 * @param type 이 줄이 팀 랭킹인지 선수 랭킹인지 — 링크와 사진 자리가 갈린다
 */
export function TrendingRow({
  item,
  type,
}: {
  item: TrendItem;
  type: TrendType;
}) {
  const code = type === "TEAM" ? (TEAM_CODES[item.entityId] ?? null) : null;
  const href =
    type === "TEAM"
      ? code && teamHubPath(code)
      : figurePath(String(item.entityId));

  const body = (
    <>
      <span
        className={`text-tab w-6 shrink-0 font-bold ${
          item.rank <= HIGHLIGHT_RANK ? "text-accent" : "text-text-4"
        }`}
      >
        {item.rank}
      </span>
      {code ? (
        <TeamCrest team={TEAMS[code]} size={AVATAR} className="shrink-0" />
      ) : (
        item.imageUrl && (
          <PlayerPhoto src={item.imageUrl} name={item.name} size={AVATAR} />
        )
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
