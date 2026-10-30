import type { ProseSection } from "@plick/domain/prose";

/**
 * 운영자가 쓴 글의 본문 (KAN-652) - 소개, 가이드, 팀 허브의 팀 소개가 같이 쓴다.
 *
 * 절마다 소제목(h2)과 문단, 끝에 관련 링크 목록을 그린다. FaqBody처럼 카드 없이 흐름으로
 * 두고(시안 전역 규칙: 본문 카드에 테두리 없음), 좌우 패딩과 페이지 제목(h1)은 앱 쪽 래퍼가
 * 책임진다. 문안은 `@plick/domain`의 데이터가 단일 출처라 두 앱이 같은 글자를 낸다.
 *
 * @param sections 절 목록
 * @param updatedAt 마지막으로 손본 날(YYYY-MM-DD). 있으면 본문 끝에 적는다
 * @param headingLevel 소제목 레벨. 페이지 본문이면 h2, 다른 h2 아래 끼워 넣는 팀 소개면 h3
 */
export function ProseBody({
  sections,
  updatedAt,
  headingLevel = "h2",
}: {
  sections: readonly ProseSection[];
  updatedAt?: string;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <div className="text-body text-text flex flex-col gap-6 leading-relaxed">
      {sections.map((section, index) => (
        <section key={section.heading ?? index} className="flex flex-col gap-2">
          {section.heading && (
            <Heading className="text-body-md text-text-strong font-bold">
              {section.heading}
            </Heading>
          )}
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
          {section.links && section.links.length > 0 && (
            <ul className="text-body text-text-2 flex flex-wrap gap-x-4 gap-y-1">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="underline">
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {updatedAt && (
        <p className="text-caption text-text-3">
          {updatedAt} 기준으로 운영자가 손본 글입니다.
        </p>
      )}
    </div>
  );
}
