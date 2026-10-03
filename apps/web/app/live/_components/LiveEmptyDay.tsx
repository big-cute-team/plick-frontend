/** 경기 없는 날의 빈 상태 — 목록 자리에 안내 한 줄만 둔다 (KAN-567 톤). */
export function LiveEmptyDay() {
  return (
    <p className="text-body-md text-text-4 px-2 py-10">
      이 날은 빅6 경기가 없어요
    </p>
  );
}
