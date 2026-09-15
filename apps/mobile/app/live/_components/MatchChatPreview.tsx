/** 미리보기에 그릴 메시지 자리 개수. */
const ROW_COUNT = 5;

/**
 * 채팅 탭의 스와이프 미리보기 (KAN-462) — 상세 탭을 좌우로 끌 때 이웃이
 * 채팅이면 진짜 패널 대신 이 자리 표시를 그린다. 진짜 `MatchChatPanel`은
 * 마운트되는 순간 세션 URL을 받고 웹소켓을 여는데, 드래그 도중 잠깐 스치는
 * 미리보기마다 접속을 열었다 닫으면 서버가 킥오프 부하 분산으로 흩어 둔
 * 재접속 간격이 헛돈다. 손을 떼고 확정된 뒤에만 실제 패널이 붙는다.
 *
 * 메시지 줄과 입력바 실루엣만 두어 커밋 순간 진짜 패널의 골격과 이어진다.
 */
export function MatchChatPreview() {
  return (
    <div
      aria-hidden
      className="flex min-h-[60dvh] animate-pulse flex-col justify-end"
    >
      <div className="px-edge flex flex-col gap-3 py-3">
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="bg-elevate rounded-control h-3 w-16" />
            <div
              className={`bg-elevate rounded-control h-3.5 ${i % 2 ? "w-1/2" : "w-3/4"}`}
            />
          </div>
        ))}
      </div>
      <div className="border-border px-edge flex items-center gap-2.5 border-t pt-2 pb-3">
        <div className="bg-elevate-2 rounded-pill h-11 flex-1" />
        <div className="bg-elevate-2 size-11 rounded-full" />
      </div>
    </div>
  );
}
