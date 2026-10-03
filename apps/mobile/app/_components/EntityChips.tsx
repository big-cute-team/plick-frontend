import Link from "next/link";
import { figurePath, hashtagHref } from "@plick/domain/format";
import type { FigureTag } from "@plick/domain/types";

/** 칩 공통 모양. 시안(KAN-567)의 pill 칩: 높이 28, 좌우 12, bg-chip, 12px */
const CHIP =
  "bg-chip text-label text-text-2 rounded-pill inline-flex h-7 items-center px-3";

/**
 * 태그 줄, 해시태그(팀) 칩과 인물 칩 (KAN-500, 시안 KAN-567 "태그와 원문 링크").
 *
 * 전부 `#이름` 글자 칩이다. 팀 한글명이 레지스트리에 매핑되는 해시태그와 인물 태그는
 * 700에 각자 프로필로 가는 링크고, 매핑이 안 되는 태그는 400 글자 칩으로 남는다.
 * 전에 인물 칩에 붙이던 사진 원과 감독·코치 구분 라벨은 시안 규칙(아바타를 그리지
 * 않는다, 칩은 이름만)대로 뺐다.
 *
 * 래퍼 없이 칩만 뿌린다. 줄바꿈·정렬·트레일링 요소는 부모 flex 컨테이너가
 * 정한다. 둘 다 비어 있으면 아무것도 그리지 않는다.
 *
 * 앱에 둔 이유: 링크 규약(팀 프로필·인물 프로필 경로)이 앱 라우트에 묶여 있다.
 * 웹이 같은 모양을 쓰게 되면 경로를 prop으로 주입하는 모양으로 승격을 본다
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
            className={`${CHIP} font-bold active:opacity-70`}
          >
            #{tag}
          </Link>
        ) : (
          <span key={tag} className={CHIP}>
            #{tag}
          </span>
        );
      })}
      {figures.map((figure) => (
        <Link
          key={figure.id}
          href={figurePath(figure.id)}
          className={`${CHIP} font-bold active:opacity-70`}
        >
          #{figure.name}
        </Link>
      ))}
    </>
  );
}
