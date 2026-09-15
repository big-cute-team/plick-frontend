/**
 * 섹션 제목 앞에 붙는 "지금 살아 있는 목록" 표시 점 (KAN-481). 홈·기사 페이지의
 * "지금 올라온 소식" 제목이 두 앱에서 같이 단다.
 *
 * 색은 라이브 스코어의 LIVE 칩(MatchHeaderBlock·MatchHeaderCard)과 같은 danger다 —
 * 앱 안에서 "라이브"는 이미 빨간 점으로 굳어 있고, 옆 리스트의 초록 VS 칩·NEW
 * 태그와 색이 겹치지 않게 한다. 번쩍임은 Tailwind 내장 `animate-ping`이라 앱
 * globals.css에 키프레임을 복제할 필요가 없다(DebateLiveChip과 다른 점).
 *
 * 장식이라 `aria-hidden`이고, 제목 글자 크기와 무관하게 `size` 하나로 점·링 폭을
 * 같이 정한다.
 *
 * @param size 점 지름 유틸(Tailwind `size-*`). 모바일 섹션 제목은 기본값(2 = 8px),
 *   웹 hero 제목은 한 단계 키운다.
 */
export function LiveDot({ size = "size-2" }: { size?: string }) {
  return (
    <span aria-hidden className={`relative inline-flex shrink-0 ${size}`}>
      <span className="bg-danger absolute inset-0 animate-ping rounded-full opacity-75" />
      <span className="bg-danger relative inline-flex size-full rounded-full" />
    </span>
  );
}
