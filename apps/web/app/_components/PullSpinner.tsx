import { PULL_TRIGGER_DISTANCE } from "@/_constants/pull-refresh";

/**
 * 당겨서 새로고침 인디케이터 (KAN-379, 모바일 KAN-314 이식) — 콘텐츠 위쪽에
 * 숨어 있다가 당기는 만큼 함께 내려온다.
 *
 * 콘텐츠를 밀어 내리는 부모(`FeedPullRefresh`) 안에 절대배치로 넣어 부모의
 * transform을 같이 타고 내려온다. 모바일과 달리 이 앱은 문서가 스크롤이라
 * 위쪽을 잘라 줄 overflow 경계가 없지만, 당기기 전에는 진하기(opacity)가 0이라
 * 보이지 않는다.
 *
 * 문턱까지 당기는 동안은 진하기와 회전으로 진행도를 알린다 — 다 차면 놓아도
 * 된다는 신호다. 갱신이 시작되면 진행도와 무관하게 계속 돈다.
 *
 * @param distance 콘텐츠가 내려온 거리(px)
 * @param refreshing 갱신이 도는 중인지
 */
export function PullSpinner({
  distance,
  refreshing,
}: {
  distance: number;
  refreshing: boolean;
}) {
  const progress = Math.min(distance / PULL_TRIGGER_DISTANCE, 1);

  return (
    <div
      aria-hidden={!refreshing}
      className="pointer-events-none absolute inset-x-0 -top-11 flex h-11 items-center justify-center"
    >
      <span
        role="status"
        aria-label="새로고침 중"
        className={`border-text-4 size-7 rounded-full border-2 border-t-transparent ${
          refreshing ? "animate-spin" : ""
        }`}
        style={
          refreshing
            ? undefined
            : {
                opacity: progress,
                transform: `rotate(${progress * 270}deg)`,
              }
        }
      />
    </div>
  );
}
