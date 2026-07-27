import { PULL_TRIGGER_DISTANCE } from "@/_constants/pull-refresh";

/**
 * 당겨서 새로고침 인디케이터 (KAN-314) — 콘텐츠 위쪽 화면 밖에 숨어 있다가
 * 당기는 만큼 함께 내려온다.
 *
 * 스크롤 영역 안에 절대배치로 넣고, 콘텐츠를 밀어 내리는 부모의 transform을 같이
 * 타고 내려온다. 그래서 당기지 않는 동안은 스크롤 영역 위쪽 바깥에 있어 보이지
 * 않는다(맨 위가 아니면 애초에 당길 수 없으므로 딴 데서 튀어나올 일도 없다).
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
