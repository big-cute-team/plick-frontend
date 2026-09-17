/**
 * 사진 없는 핫이슈 카드 머리에 다는 작은 🔥 핫이슈 태그 (KAN-515). 모바일·웹
 * `HotTextCard`가 팀 태그 자리에 같이 단다.
 *
 * 팀 태그를 걷어낸 자리라 "이게 왜 여기 있나"를 한눈에 알려야 해서 태그째
 * 깜빡인다. 번쩍임은 Tailwind 내장 `animate-pulse`라 앱 globals.css에 키프레임을
 * 복제할 필요가 없다(LiveDot과 같은 이유).
 *
 * 색은 라이브 점(LiveDot)과 같은 danger 틴트다. 옆에 서는 루머 단계 라벨은
 * 회색 글자뿐이라 둘이 섞여 읽히지 않는다.
 */
export function HotBadge() {
  return (
    <span className="bg-danger/15 text-danger rounded-badge text-micro tracking-label inline-flex animate-pulse items-center gap-0.5 px-1.5 py-0.5 leading-none font-extrabold whitespace-nowrap">
      <span aria-hidden>🔥</span>
      핫이슈
    </span>
  );
}
