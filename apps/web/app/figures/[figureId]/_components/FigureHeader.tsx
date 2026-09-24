import Link from "next/link";
import { FIGURE_TYPE_LABEL, TEAMS } from "@plick/domain/constants";
import { teamProfilePath } from "@plick/domain/format";
import type { FigureProfile } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";

/**
 * 인물 프로필 머리 (KAN-501 → KAN-567 시안 프로필 1225-1249행). 왼쪽 72px 자리는
 * 시안이 선수면 등번호 상자, 아니면 회색 원인데 인물 사전에 등번호가 없어 늘 회색 원
 * (이름 첫 글자)이다. 오른쪽에 종류 라벨 12/700 강조색, 이름 30/900 -.045em, 그
 * 아래 영문명 13 보조색과 소속 팀 링크(엠블럼 16 + 13/700, hover 강조색). 소속 팀
 * 링크는 팀 프로필(`/teams/[slug]/profile`)로 간다. 웹에도 팀 프로필이 생겨
 * (KAN-507) 모바일과 같은 곳을 가리킨다.
 *
 * 사진과 소개는 시안 규칙(프로필 이미지 없음, 안내 문구 없음)대로 머리에 두지 않는다.
 * 소개는 우측 기본 정보에 있다. 레지스트리에 없는 팀이면(BE 마스터가 6팀이라 실제로는
 * 안 생긴다) 엠블럼과 링크 없이 이름만 둔다.
 *
 * @param figure 인물 프로필
 */
export function FigureHeader({ figure }: { figure: FigureProfile }) {
  const team = figure.team;
  const registry = team?.code ? TEAMS[team.code] : null;

  return (
    <header className="border-border flex items-center gap-5 border-b pb-5.5">
      <span
        aria-hidden
        className="bg-avatar text-text-4 grid size-18 shrink-0 place-items-center rounded-full text-xl font-bold"
      >
        {figure.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-label text-accent pb-1.5 font-bold">
          {FIGURE_TYPE_LABEL[figure.type]}
        </p>
        <h1 className="text-read-title text-text-strong tracking-title truncate leading-[1.2] font-black">
          {figure.name}
        </h1>
        {(figure.nameEn || team) && (
          <div className="flex items-center gap-2.5 pt-2.25">
            {figure.nameEn && (
              <span className="text-body text-text-3 truncate">
                {figure.nameEn}
              </span>
            )}
            {team &&
              (registry ? (
                <Link
                  href={teamProfilePath(registry.code)}
                  className="text-body text-text hover:text-accent focus-visible:outline-accent flex shrink-0 items-center gap-1.25 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <TeamCrest team={registry} size={16} />
                  {team.name}
                </Link>
              ) : (
                <span className="text-body text-text font-bold">
                  {team.name}
                </span>
              ))}
          </div>
        )}
      </div>
    </header>
  );
}
