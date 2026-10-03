/**
 * 활동 목록의 실패 자리 — 문구 + 다시 시도 텍스트 버튼. 첫 페이지와 다음 페이지 실패가
 * 같은 모양을 쓴다 (KAN-567).
 *
 * @param message 실패 문구
 * @param onRetry 다시 시도 콜백
 * @param disabled 이미 받는 중이면 잠근다
 */
export function ActivityRetry({
  message,
  onRetry,
  disabled = false,
}: {
  message: string;
  onRetry: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-8">
      <p className="text-body-md text-text-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="text-label-lg text-accent hover:text-accent-hover focus-visible:outline-accent font-bold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
      >
        다시 시도
      </button>
    </div>
  );
}
