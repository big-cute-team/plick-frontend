/**
 * 지금 열려 있다는 표시 (KAN-742). 빨간 점 뒤로 같은 색 고리가 퍼지며 사라진다. "해외축구 LIVE"
 * 이름 앞에 두 앱이 같은 모양으로 쓴다. 뜻은 옆 글자가 전하므로 스크린리더에서는 감춘다.
 * 움직임을 줄이도록 설정한 기기에서는 점만 남는다.
 *
 * @param className - 점 크기. 기본은 `size-2.5`
 */
export function LivePulse({ className = "size-2.5" }: { className?: string }) {
  return (
    <span aria-hidden className={`relative inline-flex shrink-0 ${className}`}>
      <span className="bg-danger absolute inset-0 animate-ping rounded-full opacity-75 motion-reduce:hidden" />
      <span className="bg-danger relative inline-flex size-full rounded-full" />
    </span>
  );
}
