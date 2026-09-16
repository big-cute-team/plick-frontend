import Link from "next/link";
import { FIGURE_TYPE_LABEL, TEAMS } from "@plick/domain/constants";
import { teamProfilePath } from "@plick/domain/format";
import type { FigureProfile } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { PlayerPhoto } from "@/_components/PlayerPhoto";

/**
 * 인물 프로필 머리 (KAN-500) — 사진, 이름·구분·영문명, 소속 팀, 한 줄 소개.
 *
 * 소속 팀은 레지스트리에 있는 팀이면 로고와 함께 팀 프로필 링크고, 없으면
 * (BE 마스터가 6팀이라 실제로는 안 생기지만) 글자만 둔다. 소속이 없는 인물은
 * 그 줄을 "소속 팀 정보 없음"으로 채운다 — 줄을 비우면 무소속인지 로드 실패인지
 * 구분이 안 된다.
 *
 * 사진·소개는 확인 시점 실데이터가 대부분 null이다. 사진은 `PlayerPhoto`의
 * 폴백 원, 소개는 줄을 빼는 게 기본 경로다.
 */
export function FigureHeader({ figure }: { figure: FigureProfile }) {
  const team = figure.team;
  const registry = team?.code ? TEAMS[team.code] : null;

  return (
    <header className="px-edge flex flex-col gap-3 pt-5 pb-3">
      <div className="flex items-center gap-4">
        <PlayerPhoto src={figure.imageUrl} name={figure.name} size={64} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-headline text-text truncate font-extrabold">
            {figure.name}
          </h1>
          <p className="text-label text-text-3 flex items-center gap-1.5">
            <span className="bg-elevate rounded-pill text-text-2 px-2 py-0.5 font-bold">
              {FIGURE_TYPE_LABEL[figure.type]}
            </span>
            {figure.nameEn && <span className="truncate">{figure.nameEn}</span>}
          </p>
          {team ? (
            registry ? (
              <Link
                href={teamProfilePath(registry.code)}
                className="text-body text-text-2 flex items-center gap-1.5 font-semibold active:opacity-70"
              >
                <TeamCrest team={registry} size={18} />
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
        <p className="text-body-lg text-text-2 leading-body-lg tracking-snug">
          {figure.description}
        </p>
      )}
    </header>
  );
}
