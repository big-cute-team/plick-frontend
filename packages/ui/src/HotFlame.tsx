/**
 * 홈 "핫이슈" 섹션 제목 앞 불꽃 (KAN-515). 두 앱 홈이 같이 단다.
 *
 * "지금 올라온 소식" 제목의 {@link LiveDot}과 같은 번쩍임이다. 같은 불꽃을 한 벌
 * 더 겹쳐 Tailwind 내장 `animate-ping`으로 부풀렸다 사라지게 하고, 원본은
 * 제자리에 둔다. 점 대신 불꽃이 퍼진다는 것만 다르다.
 *
 * 장식이라 `aria-hidden`이다. 제목 텍스트는 호출부가 "핫이슈"로 따로 단다.
 */
export function HotFlame() {
  return (
    <span aria-hidden className="relative inline-flex shrink-0 leading-none">
      <span className="absolute inset-0 animate-ping opacity-75">🔥</span>
      <span className="relative">🔥</span>
    </span>
  );
}
