import { FAQ_ITEMS } from "@plick/domain/faq";

/**
 * FAQ 본문 (KAN-372). 질문과 답을 항상 펼친 채로 나열한다. KAN-567에서 카드 섀시를
 * 걷고 목록 선으로 가른다(시안 전역 규칙: 본문 카드에 테두리 없음).
 *
 * 처음엔 `details/summary` 아코디언이었는데 항목이 일곱 개뿐이라 접어 둘
 * 이유가 없었다. 한 화면에서 눈으로 훑는 게 낫다.
 *
 * 문안은 `@plick/domain/faq`의 `FAQ_ITEMS`가 단일 출처다 (KAN-623). 전에는 이 파일
 * 안에 ReactNode로 있었는데 FAQPage JSON-LD가 같은 문안을 평문으로 내야 해서
 * 데이터로 내렸다. 답변 조각이 링크면 `<a>`로, 아니면 글자 그대로 그린다.
 * 좌우 패딩과 페이지 제목은 앱 쪽 래퍼가 책임진다.
 */
export function FaqBody() {
  return (
    <div>
      {FAQ_ITEMS.map((item) => (
        <section
          key={item.question}
          className="border-border-soft flex flex-col gap-1.5 border-b py-3.5"
        >
          <h2 className="text-body-md text-text-strong font-bold">
            {item.question}
          </h2>
          <div className="text-body text-text-2 leading-relaxed">
            <p>
              {item.answer.map((segment, index) =>
                typeof segment === "string" ? (
                  segment
                ) : (
                  <a key={index} href={segment.href} className="underline">
                    {segment.text}
                  </a>
                ),
              )}
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
