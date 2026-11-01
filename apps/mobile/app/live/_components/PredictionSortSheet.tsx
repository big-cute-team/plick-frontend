"use client";

import {
  PREDICTION_OPINION_SORTS,
  type PredictionOpinionSort,
} from "@plick/domain/prediction";
import { CheckIcon } from "@plick/ui/icons";
import { BottomSheet } from "@/_components/BottomSheet";

/**
 * 의견 정렬 시트 (KAN-697, 시안 가이드 §5.4 "앱은 텍스트 버튼이 정렬 시트를 연다"). 적중률순,
 * 최신순, 공감순 세 행이고 지금 정렬은 강조색 틴트 면에 체크가 붙는다. 신고 시트의 사유 행과
 * 같은 모양이다. 행을 누르면 고르고 바로 닫힌다.
 *
 * @param value 지금 정렬
 * @param onSelect 정렬을 골랐을 때. 호출부가 시트를 닫는다
 * @param onClose 딤·Escape로 닫을 때
 */
export function PredictionSortSheet({
  value,
  onSelect,
  onClose,
}: {
  value: PredictionOpinionSort;
  onSelect: (sort: PredictionOpinionSort) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} label="정렬">
      <p className="text-title text-text-strong tracking-heading font-black">
        정렬
      </p>
      <div
        role="radiogroup"
        aria-label="의견 정렬"
        className="mt-4 flex flex-col gap-2"
      >
        {PREDICTION_OPINION_SORTS.map(({ value: sort, label }) => {
          const selected = sort === value;
          return (
            <button
              key={sort}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(sort)}
              className={`rounded-control flex h-12 items-center gap-2.5 px-3.5 text-left active:opacity-70 ${
                selected ? "bg-accent-tint" : "bg-elevate"
              }`}
            >
              <span
                className={`text-body-md flex-1 ${
                  selected
                    ? "text-accent font-bold"
                    : "text-text-strong font-medium"
                }`}
              >
                {label}
              </span>
              {selected && (
                <CheckIcon size={17} className="text-accent shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
