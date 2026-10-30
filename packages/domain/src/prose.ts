/**
 * @file 운영자가 직접 쓰는 글(소개·가이드·팀 소개)의 공용 모양 (KAN-652) - web·mobile 화면과
 * llms.txt가 같이 읽는다.
 *
 * 기사 본문은 원문 트윗의 요약이라 짧고 수가 많다. 그것만으로는 검색 엔진이 사이트를
 * 복제·자동 생성 콘텐츠 집합으로 봐서(애드센스 "가치가 별로 없는 콘텐츠" 거절), 운영자가
 * 쓴 긴 글을 데이터로 두고 두 앱이 같은 본문을 그린다. 글은 평문 문단 배열이라 JSON-LD나
 * 안내문에 그대로 이어 붙일 수 있다.
 */

/** 본문 안 링크 하나. 앱 내부 경로만 둔다. */
export interface ProseLink {
  text: string;
  href: string;
}

/** 소제목 하나와 그 아래 문단들. 소제목이 없으면 머리 문단이다. */
export interface ProseSection {
  heading?: string;
  paragraphs: readonly string[];
  /** 문단 뒤에 붙는 관련 링크. 화면은 목록으로, 평문은 글자만 남긴다 */
  links?: readonly ProseLink[];
}

/**
 * 절 목록을 평문 한 덩어리로 편다 - llms.txt와 글자 수 검사용.
 *
 * @param sections 절 목록
 * @example proseText([{ heading: "소개", paragraphs: ["가", "나"] }]) // "소개\n가\n나"
 */
export function proseText(sections: readonly ProseSection[]): string {
  return sections
    .flatMap((section) => [
      ...(section.heading ? [section.heading] : []),
      ...section.paragraphs,
    ])
    .join("\n");
}
