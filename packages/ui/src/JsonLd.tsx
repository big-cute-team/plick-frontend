/**
 * JSON-LD 구조화 데이터를 심는 script 태그 (KAN-351).
 *
 * 화면에 아무것도 그리지 않는 서버 컴포넌트다. 데이터 조립은
 * `@plick/domain/jsonld` 빌더가 맡고, 여기는 직렬화와 삽입만 한다.
 *
 * `<`를 유니코드 이스케이프로 바꾸는 건 XSS 가드다 — 기사 제목에 파싱이 어긋난
 * 원문 트윗이 그대로 들어온 행이 있어(`ArticleDetail.title`) `</script>` 조각이
 * 태그를 조기 종료시키는 걸 막는다. JSON 파서에게는 같은 문자열이라 검색엔진
 * 해석에는 영향이 없다.
 *
 * @param data 빌더가 만든 schema.org 객체
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
