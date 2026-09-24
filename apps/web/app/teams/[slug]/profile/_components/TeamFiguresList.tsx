import Link from "next/link";
import { FIGURE_SECTIONS, FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import { figurePath } from "@plick/domain/format";
import type { FigureTag } from "@plick/domain/types";

/**
 * 팀 소속 인물 목록 (KAN-507 → KAN-567 톤 정리) — 모바일 `TeamFiguresList`의 데스크톱
 * 판이다. 감독, 코칭스태프, 선수, 구단주, 관계자 순으로 섹션을 나누고 행을 누르면 그
 * 인물의 프로필과 관련 기사(`/figures/[figureId]`)로 간다. 시안 웹 규칙대로 면과
 * 테두리 없이 섹션 제목 14/900과 목록 구분선 행으로 그린다. 인물은 섹션 안에서
 * 2열로 흘린다 (KAN-514). 인물 사진은 시안 규칙(프로필 이미지 없음)대로 뺐다.
 *
 * BE는 구분 없이 한글명순 한 배열로 주므로 여기서 가른다. 비어 있는 섹션은
 * 그리지 않고, 전부 비면 빈 문구 하나만 남긴다. 선수 행은 구분 라벨을 생략하고
 * 그 밖(감독, 코치, 구단주, 관계자)만 이름 옆에 단다.
 *
 * @param figures 팀 프로필의 소속 인물
 */
export function TeamFiguresList({ figures }: { figures: FigureTag[] }) {
  if (figures.length === 0) {
    return (
      <p className="text-body-md text-text-4 py-10">
        아직 등록된 소속 인물이 없어요
      </p>
    );
  }

  return (
    <div>
      {FIGURE_SECTIONS.map((section) => {
        const members = figures.filter((figure) =>
          section.types.includes(figure.type),
        );
        if (members.length === 0) return null;
        return (
          <section key={section.label} className="pb-4">
            <p className="text-body-md text-text-strong pt-4.5 pb-1.5 font-black">
              {section.label}
              <span className="text-caption-lg text-text-4 ml-1.5 font-medium">
                {members.length}
              </span>
            </p>
            <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
              {members.map((figure) => (
                <Link
                  key={figure.id}
                  href={figurePath(figure.id)}
                  className="border-border-soft hover:text-accent focus-visible:outline-accent flex h-9 items-center gap-2 border-b transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <span className="text-body text-text-strong hover:text-accent min-w-0 flex-1 truncate font-bold">
                    {figure.name}
                  </span>
                  {figure.type !== "PLAYER" && (
                    <span className="text-label text-text-3">
                      {FIGURE_TYPE_LABEL[figure.type]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
