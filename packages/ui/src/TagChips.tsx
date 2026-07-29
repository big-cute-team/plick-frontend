/**
 * 해시태그 칩 목록 — `#tag` 알약 스팬. 기사 본문·릴 세부 공용.
 *
 * 래퍼 없이 스팬만 뿌리므로 줄바꿈·정렬·트레일링 요소는 부모 flex 컨테이너가 정한다.
 *
 * @param tags - `#` 제외한 키워드 목록
 */
export function TagChips({ tags }: { tags: string[] }) {
  return (
    <>
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-elevate text-text-3 text-label rounded-pill px-3 py-1"
        >
          #{tag}
        </span>
      ))}
    </>
  );
}
