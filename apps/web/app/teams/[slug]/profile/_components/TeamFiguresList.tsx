import Link from "next/link";
import { FIGURE_SECTIONS, FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import { figurePath } from "@plick/domain/format";
import type { FigureTag } from "@plick/domain/types";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";

/**
 * 팀 소속 인물 목록 (KAN-507) — 모바일 `TeamFiguresList`의 데스크톱 판이다.
 * 감독·코칭스태프, 선수, 구단주·관계자 순으로 섹션을 나누고 각 행을 누르면 그
 * 인물의 프로필과 관련 기사(`/figures/[figureId]`)로 간다.
 *
 * 모바일과 다른 건 둘이다. 넓은 폭을 살려 섹션을 2열 그리드로 깔고, 행에
 * hover·focus 상태를 얹는다. 옆 탭의 선수단(`SquadGrid`)은 타일 격자인데 여기가
 * 행인 이유는, 이 목록에는 감독·구단주가 섞여 구분 라벨이 붙고 인원도 들쭉날쭉
 * 이라 행이 읽기 낫기 때문이다.
 *
 * BE는 구분 없이 한글명순 한 배열로 주므로 여기서 가른다. 비어 있는 섹션은
 * 그리지 않고, 전부 비면 빈 문구 하나만 남긴다. 선수 행은 구분 라벨을 생략하고
 * 그 밖(감독·코치·구단주·관계자)만 이름 옆에 단다.
 *
 * @param figures 팀 프로필의 소속 인물. BE 인물 사진은 확인 시점 전원 null이라
 *   폴백 원이 기본 경로다
 */
export function TeamFiguresList({ figures }: { figures: FigureTag[] }) {
  if (figures.length === 0) {
    return (
      <p className="text-body text-text-4 py-12 text-center">
        아직 등록된 소속 인물이 없어요.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-x-8 gap-y-5 lg:grid-cols-2">
      {FIGURE_SECTIONS.map((section) => {
        const members = figures.filter((figure) =>
          section.types.includes(figure.type),
        );
        if (members.length === 0) return null;
        return (
          <section key={section.label} className="flex flex-col gap-2">
            <h2 className="text-body-lg text-text-3 font-bold">
              {section.label}
              <span className="text-text-4 ml-1.5 font-semibold">
                {members.length}
              </span>
            </h2>
            <div className="bg-elevate rounded-card flex flex-col px-5 py-1">
              {members.map((figure, i) => (
                <Link
                  key={figure.id}
                  href={figurePath(figure.id)}
                  className={`group focus-visible:outline-accent flex items-center gap-4 py-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                    i > 0 ? "border-border border-t" : ""
                  }`}
                >
                  <PlayerPhoto
                    src={figure.imageUrl}
                    name={figure.name}
                    size={40}
                  />
                  <span className="text-body-lg text-text group-hover:text-accent min-w-0 flex-1 truncate font-semibold transition-colors">
                    {figure.name}
                  </span>
                  {figure.type !== "PLAYER" && (
                    <span className="text-label text-text-4 font-bold">
                      {FIGURE_TYPE_LABEL[figure.type]}
                    </span>
                  )}
                  <span className="text-text-4 group-hover:text-text-2 transition-colors">
                    <ChevronMiniIcon size={16} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
