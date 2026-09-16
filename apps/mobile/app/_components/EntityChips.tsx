import Link from "next/link";
import { FIGURE_TYPE_LABEL } from "@plick/domain/constants";
import { figurePath, hashtagHref } from "@plick/domain/format";
import type { FigureTag } from "@plick/domain/types";
import { PlayerPhoto } from "@/_components/PlayerPhoto";

/** 칩 공통 모양 — `@plick/ui`의 `TagChips`와 같은 알약이다. */
const CHIP = "bg-elevate text-label rounded-pill inline-flex items-center";

/**
 * 태그 줄 — 해시태그(팀) 칩과 인물 칩 (KAN-500).
 *
 * 팀 칩은 해시태그의 팀 한글명이 레지스트리에 매핑되면 팀 프로필로 가는
 * 링크고, 매핑이 안 되는 태그는 `TagChips`와 같은 글자 칩으로 남는다. 인물
 * 칩은 사진 원 + 이름이고 인물 프로필로 간다. 감독·코치·구단주는 이름 옆에
 * 구분 라벨을 달고 선수는 생략한다(태그 대부분이 선수라 매번 붙이면 글자만
 * 는다).
 *
 * `TagChips`처럼 래퍼 없이 칩만 뿌린다 — 줄바꿈·정렬·트레일링 요소는 부모
 * flex 컨테이너가 정한다. 둘 다 비어 있으면 아무것도 그리지 않으므로 부모가
 * 빈 줄을 남기지 않으려면 길이를 보고 감싼다.
 *
 * `@plick/ui`의 `TagChips`를 확장하지 않고 앱에 둔 이유: 링크 규약(팀 프로필·
 * 인물 프로필 경로)이 앱 라우트에 묶여 있고, 웹은 아직 이 화면이 없다. 웹이
 * 두 번째 사용처가 되면 경로를 prop으로 주입하는 모양으로 승격을 본다
 * (ADR 0011 게이트 A).
 *
 * @param hashtags - `#` 제외한 해시태그
 * @param figures - 태그된 인물
 */
export function EntityChips({
  hashtags = [],
  figures,
}: {
  hashtags?: string[];
  figures: FigureTag[];
}) {
  return (
    <>
      {hashtags.map((tag) => {
        const href = hashtagHref(tag);
        return href ? (
          <Link
            key={tag}
            href={href}
            className={`${CHIP} text-text-2 px-3 py-1 font-semibold active:opacity-70`}
          >
            #{tag}
          </Link>
        ) : (
          <span key={tag} className={`${CHIP} text-text-3 px-3 py-1`}>
            #{tag}
          </span>
        );
      })}
      {figures.map((figure) => (
        <Link
          key={figure.id}
          href={figurePath(figure.id)}
          className={`${CHIP} text-text-2 gap-1.5 py-1 pr-3 pl-1 font-semibold active:opacity-70`}
        >
          <PlayerPhoto src={figure.imageUrl} name="" size={20} />
          {figure.name}
          {figure.type !== "PLAYER" && (
            <span className="text-caption text-text-4 font-bold">
              {FIGURE_TYPE_LABEL[figure.type]}
            </span>
          )}
        </Link>
      ))}
    </>
  );
}
