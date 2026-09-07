import { LiveIcon } from "@plick/ui/icons";

/** 경기 없는 날의 빈 상태(피그마 L2) — 목록 자리 가운데에 안내만 띄운다. */
export function LiveEmptyDay() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
      <span className="bg-elevate text-text-3 grid size-14 place-items-center rounded-full">
        <LiveIcon size={26} />
      </span>
      <p className="text-title text-text font-extrabold">
        이 날은 빅6 경기가 없어요
      </p>
      <p className="text-body text-text-4">다른 날짜를 선택해 보세요</p>
    </div>
  );
}
