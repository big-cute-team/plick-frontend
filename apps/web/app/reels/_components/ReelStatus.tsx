/**
 * 릴 자리를 통째로 채우는 안내 화면 (KAN-323) — 에러와 빈 상태에 쓴다.
 *
 * 릴은 한 장이 뷰어를 통째로 채워 리스트처럼 문구를 아래에 덧붙일 자리가 없다.
 * 그래서 릴이 놓일 자리에 같은 크기로 대신 들어간다. 모바일 `ReelStatus`와 같은
 * 문구, 구조이고 바탕은 뷰어와 같은 회색 면(`bg-chip`, KAN-567)이다. 버튼은 시안의
 * 확정 행동 규칙대로 채운 강조색 상자다.
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
    <div className="bg-chip flex h-full w-full shrink-0 flex-col items-center justify-center">
      <p className="text-body-md text-text-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retryDisabled}
          className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-3.5 h-9.5 px-4.5 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
