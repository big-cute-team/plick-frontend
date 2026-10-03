/**
 * 경기 없는 날의 빈 상태 (피그마 L2, KAN-567 톤). 목록 자리 가운데에 두 줄
 * 안내만 둔다. 전에 있던 아이콘 원은 시안의 빈 상태가 문구뿐이라 뺐다.
 */
export function LiveEmptyDay() {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-20 text-center">
      <p className="text-body-lg text-text-strong font-black">
        이 날은 빅6 경기가 없어요
      </p>
      <p className="text-body text-text-4">다른 날짜를 선택해 보세요</p>
    </div>
  );
}
