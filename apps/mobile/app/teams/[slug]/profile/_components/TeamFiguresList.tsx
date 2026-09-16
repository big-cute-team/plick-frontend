import Link from "next/link";
import { FIGURE_SECTIONS, FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import { figurePath } from "@plick/domain/format";
import type { FigureTag } from "@plick/domain/types";
import { PlayerPhoto } from "@plick/ui/PlayerPhoto";

/**
 * 팀 소속 인물 목록 (KAN-500) — 감독·코칭스태프, 선수단, 구단주·관계자 순으로
 * 섹션을 나누고 각 행을 누르면 그 인물의 프로필과 관련 기사로 간다.
 *
 * 구성은 사진 원 + 이름 행을 `bg-elevate` 카드에 쌓는 것이다. 옆 탭의
 * 선수단(`SquadGrid`)이 타일인 것과 다른데, 이 목록은 감독·구단주까지 섞여 있어
 * 구분 라벨이 붙고 인원도 들쭉날쭉이라 행이 읽기 낫다. BE는 구분 없이 한글명순
 * 한 배열로 주므로 여기서 가른다. 비어 있는 섹션은 그리지 않고, 전부 비면 빈
 * 문구 하나만 남긴다.
 *
 * 선수 행은 구분 라벨을 생략하고 그 밖(감독·코치·구단주·관계자)만 이름 옆에
 * 단다 — 섹션 제목이 이미 구분이지만 감독과 코치가 한 섹션이라 행에서
 * 갈라 준다.
 *
 * 인물은 섹션 안에서 2열로 깐다 (KAN-514). 전에는 섹션끼리 2열로 세웠는데,
 * 감독·코칭스태프는 두어 명이고 선수는 수십 명이라 짧은 쪽 아래로 화면 절반이
 * 빈 채로 남았다. 섹션을 한 줄씩 쌓고 사람만 2열로 흘리면 그 공백이 사라지고,
 * 세로로 내려가던 길이도 절반이 된다. 칸 사이는 카드 안 구분선으로 가른다 —
 * 첫 줄이 아닌 칸에 위 선을, 오른쪽 칸에 왼쪽 선을 준다.
 *
 * 2열이 되면서 꺾쇠는 뺐다 — 한 칸이 180px 남짓이라 이름이 먼저 잘린다.
 * 칸 전체가 링크라 누를 수 있다는 건 그대로 읽힌다.
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
            <div className="bg-elevate rounded-card grid grid-cols-2 overflow-hidden">
              {members.map((figure, i) => (
                <Link
                  key={figure.id}
                  href={figurePath(figure.id)}
                  className={`border-border flex items-center gap-2.5 px-3.5 py-3 active:opacity-70 ${
                    i >= 2 ? "border-t" : ""
                  } ${i % 2 === 1 ? "border-l" : ""}`}
                >
                  {/* 사진이 없으면 원을 아예 빼 버린다 (KAN-514). BE는 인물
                      `imageUrl`을 채울 경로가 없어 사실상 전원 null이라, 폴백 원을
                      두면 행마다 의미 없는 검은 동그라미만 남는다. 사진이 생기는
                      인물이 있으면 그 행만 원이 붙는다 */}
                  {figure.imageUrl && (
                    <PlayerPhoto
                      src={figure.imageUrl}
                      name={figure.name}
                      size={36}
                    />
                  )}
                  <span className="text-body text-text min-w-0 flex-1 truncate font-semibold">
                    {figure.name}
                  </span>
                  {figure.type !== "PLAYER" && (
                    <span className="text-caption text-text-4 shrink-0 font-bold">
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
