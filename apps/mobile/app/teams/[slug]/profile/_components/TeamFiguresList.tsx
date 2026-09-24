import Link from "next/link";
import { FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import { figurePath } from "@plick/domain/format";
import type { FigureTag } from "@plick/domain/types";

/**
 * 팀 소속 인물 목록 (KAN-500, KAN-567 리디자인). 기사에서 뽑은 인물 사전이라
 * 감독·구단주까지 섞여 있다. 선수단 행과 같은 생김새로 이름 13.5/700 + 구분
 * 라벨 11을 한 줄씩 쌓고, 누르면 그 인물의 프로필로 간다.
 *
 * KAN-514의 2열 카드 그리드를 시안대로 행 목록으로 되돌렸다. BE는 구분 없이
 * 한글명순 한 배열로 주고, 여기서는 그 순서를 그대로 둔다. 사진 원은 시안 규칙대로
 * 그리지 않는다. 비어 있으면 섹션 자체를 호출부가 뺀다.
 *
 * @param figures 기사에서 뽑은 소속 인물
 */
export function TeamFiguresList({ figures }: { figures: FigureTag[] }) {
  return (
    <ul>
      {figures.map((figure) => (
        <li key={figure.id}>
          <Link
            href={figurePath(figure.id)}
            className="border-border-soft flex items-center gap-2.5 border-b py-2.5 active:opacity-70"
          >
            <span className="text-body text-text-strong min-w-0 flex-1 truncate font-bold">
              {figure.name}
            </span>
            <span className="text-caption text-text-3 shrink-0">
              {FIGURE_TYPE_LABEL[figure.type]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
