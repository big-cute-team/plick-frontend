import Link from "next/link";
import { FIGURE_SECTIONS, FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import { figurePath } from "@plick/domain/format";
import type { FigureTag } from "@plick/domain/types";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { PlayerPhoto } from "@/_components/PlayerPhoto";

/**
 * 팀 소속 인물 목록 (KAN-500) — 감독·코칭스태프, 선수단, 구단주·관계자 순으로
 * 섹션을 나누고 각 행을 누르면 그 인물의 프로필과 관련 기사로 간다.
 *
 * 구성은 라이브 선수단(`SquadList`)과 맞췄다 — 사진 원 + 이름 + 꺾쇠 행을
 * `bg-elevate` 카드에 쌓는다. 거기는 시트를 여는 버튼이고 여기는 링크라는 것만
 * 다르다. BE는 구분 없이 한글명순 한 배열로 주므로 여기서 가른다. 비어 있는
 * 섹션은 그리지 않고, 전부 비면 빈 문구 하나만 남긴다.
 *
 * 선수 행은 구분 라벨을 생략하고 그 밖(감독·코치·구단주·관계자)만 이름 옆에
 * 단다 — 섹션 제목이 이미 구분이지만 감독과 코치가 한 섹션이라 행에서
 * 갈라 준다.
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
    <div className="px-edge flex flex-col gap-4 pt-2 pb-6">
      {FIGURE_SECTIONS.map((section) => {
        const members = figures.filter((figure) =>
          section.types.includes(figure.type),
        );
        if (members.length === 0) return null;
        return (
          <section key={section.label} className="flex flex-col gap-2">
            <h2 className="text-label text-text-3 font-bold">
              {section.label}
              <span className="text-text-4 ml-1.5 font-semibold">
                {members.length}
              </span>
            </h2>
            <div className="bg-elevate rounded-card flex flex-col px-4 py-1">
              {members.map((figure, i) => (
                <Link
                  key={figure.id}
                  href={figurePath(figure.id)}
                  className={`flex items-center gap-3 py-3 active:opacity-70 ${
                    i > 0 ? "border-border border-t" : ""
                  }`}
                >
                  <PlayerPhoto
                    src={figure.imageUrl}
                    name={figure.name}
                    size={36}
                  />
                  <span className="text-body-lg text-text min-w-0 flex-1 truncate font-semibold">
                    {figure.name}
                  </span>
                  {figure.type !== "PLAYER" && (
                    <span className="text-label text-text-4 font-bold">
                      {FIGURE_TYPE_LABEL[figure.type]}
                    </span>
                  )}
                  <span className="text-text-4">
                    <ChevronMiniIcon size={14} />
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
