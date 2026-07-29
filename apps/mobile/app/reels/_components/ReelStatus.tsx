/**
 * 릴 자리를 통째로 채우는 안내 화면 (KAN-276) — 에러와 빈 상태에 쓴다.
 *
 * 릴은 한 장이 화면 전체라 리스트처럼 문구를 아래에 덧붙일 자리가 없다.
 * 그래서 릴이 놓일 자리에 같은 크기로 대신 들어간다.
 *
 * @param message 보여줄 문구
 * @param onRetry 재시도 버튼을 달 때만 넘긴다
 * @param retryDisabled 이미 받는 중이면 눌러도 소용없으므로 잠근다
 */
export function ReelStatus({
  message,
  onRetry,
  retryDisabled = false,
}: {
  message: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
}) {
  return (
    <div className="bg-bg flex h-full w-full shrink-0 basis-full flex-col items-center justify-center">
      <p className="text-body text-text-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retryDisabled}
          className="bg-elevate text-label text-text rounded-control mt-3 px-4 py-2 font-bold active:opacity-70 disabled:opacity-50"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
