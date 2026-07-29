/**
 * 피드 끝에 붙어 있는 다음 릴 자리 (KAN-276).
 *
 * 다음 페이지가 있는 동안 항상 한 장 붙어 있다. 받는 중에만 슬라이드를 넣었다 빼면
 * 그때마다 캐러셀이 다시 초기화되면서 넘김이 툭 끊기므로, 자리를 미리 잡아 두고
 * 내용만 채운다. 릴 한 장을 통째로 스켈레톤으로 덮는 대신 작은 스피너만 돌려서
 * 다음 릴이 오는 중이라는 것만 알린다.
 */
export function ReelLoadingSlide() {
  return (
    <div className="bg-reel-bg flex h-full w-full shrink-0 basis-full items-center justify-center">
      <span
        role="status"
        aria-label="다음 릴스를 불러오는 중"
        className="border-text-4 size-8 animate-spin rounded-full border-2 border-t-transparent"
      />
    </div>
  );
}
