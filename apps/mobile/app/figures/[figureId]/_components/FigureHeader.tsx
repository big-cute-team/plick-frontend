import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import { teamProfilePath } from "@plick/domain/format";
import type { FigureProfile } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";

/**
 * 인물 프로필 머리 (KAN-500, KAN-567 리디자인, 시안 선수 프로필 머리). 왼쪽
 * 60px 원, 이름 23/900, 영문명 12.5, 소속 팀 링크(엠블럼 16 + 이름 12.5/700),
 * 있으면 한 줄 소개다.
 *
 * 시안의 등번호 상자는 인물 사전에 등번호가 없어 못 그린다(API 공백). 그 자리를
 * 비우면 머리가 왼쪽으로 쏠려 사진도 이니셜도 없는 회색 원으로 채운다. 사진은
 * 시안 규칙대로 그리지 않는다.
 *
 * 소속 팀은 레지스트리에 있는 팀이면 로고와 함께 팀 프로필 링크고, 없으면
 * (BE 마스터가 6팀이라 실제로는 안 생기지만) 글자만 둔다. 소속이 없는 인물은
 * 줄을 뺀다. 소속 여부는 아래 "기본 정보"가 다시 말한다.
 *
 * @param figure 인물 프로필
 */
export function FigureHeader({ figure }: { figure: FigureProfile }) {
  const team = figure.team;
  const registry = team?.code ? TEAMS[team.code] : null;

  return (
    <header className="px-edge pt-5 pb-1">
      <div className="flex items-center gap-3.5">
        <span aria-hidden className="bg-avatar size-15 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <h1 className="text-profile tracking-title text-text-strong font-black">
            {figure.name}
          </h1>
          {figure.nameEn && (
            <p className="text-label-lg text-text-3 mt-1.5 truncate">
              {figure.nameEn}
            </p>
          )}
          {team &&
            (registry ? (
              <Link
                href={teamProfilePath(registry.code)}
                className="text-label-lg text-text mt-2 inline-flex items-center gap-1.25 font-bold active:opacity-70"
              >
                <TeamCrest team={registry} size={16} />
                {team.name}
              </Link>
            ) : (
              <span className="text-label-lg text-text mt-2 inline-block font-bold">
                {team.name}
              </span>
            ))}
        </div>
      </div>
      {figure.description && (
        <p className="text-body text-text-2 tracking-snug pt-4 leading-relaxed">
          {figure.description}
        </p>
      )}
    </header>
  );
}
