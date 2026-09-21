import Link from "next/link";
import { FIGURE_TYPE_LABEL, TEAMS } from "@plick/domain/constants";
import { teamHubPath } from "@plick/domain/format";
import type { FigureProfile } from "@plick/domain/types";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";
import { TeamCrest } from "@plick/ui/TeamCrest";

/**
 * 인물 프로필 머리 (KAN-501) — 사진, 이름·구분·영문명, 소속 팀, 한 줄 소개.
 * 모바일 `figures/[figureId]/_components/FigureHeader.tsx`의 데스크톱 판이다.
 *
 * 모바일과 다른 곳이 둘이다. 소속 팀 링크가 팀 프로필(`/teams/[slug]/profile`)이
 * 아니라 팀 허브(`/teams/[slug]`)다 — 웹에는 팀 프로필 화면이 없고 팀 허브가
 * 그 팀 기사를 모아 보여주는 자리다. 그리고 데스크톱이라 링크에 hover·focus
 * 상태를 얹는다.
 *
 * 사진·소개는 확인 시점 실데이터가 대부분 null이다. 둘 다 없으면 자리를 그리지
 * 않는다 — 빈 원을 깔아 두면 로드에 실패한 것처럼 보인다. 레지스트리에 없는
 * 팀이면(BE 마스터가 6팀이라 실제로는 안 생긴다) 로고와 링크 없이 이름만 둔다.
 *
 * @param figure 인물 프로필
 */
export function FigureHeader({ figure }: { figure: FigureProfile }) {
  const team = figure.team;
  const registry = team?.code ? TEAMS[team.code] : null;

  return (
    <header className="flex flex-col gap-4 pt-7 pb-5">
      <div className="flex items-center gap-5">
        {figure.imageUrl && (
          <PlayerPhoto src={figure.imageUrl} name={figure.name} size={80} />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-hero text-text tracking-heading truncate font-extrabold">
            {figure.name}
          </h1>
          <p className="text-label text-text-3 flex items-center gap-2">
            <span className="bg-elevate rounded-pill text-text-2 px-2 py-0.5 font-bold">
              {FIGURE_TYPE_LABEL[figure.type]}
            </span>
            {figure.nameEn && <span className="truncate">{figure.nameEn}</span>}
          </p>
          {team ? (
            registry ? (
              <Link
                href={teamHubPath(registry.code)}
                className="text-body text-text-2 hover:text-accent focus-visible:outline-accent flex w-fit items-center gap-1.5 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <TeamCrest team={registry} size={20} />
                {team.name}
              </Link>
            ) : (
              <span className="text-body text-text-2 font-semibold">
                {team.name}
              </span>
            )
          ) : (
            <span className="text-body text-text-4">소속 팀 정보 없음</span>
          )}
        </div>
      </div>
      {figure.description && (
        <p className="text-read-body text-text-2 leading-body-lg tracking-snug">
          {figure.description}
        </p>
      )}
    </header>
  );
}
