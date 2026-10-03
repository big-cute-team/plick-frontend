"use client";

import { BottomSheet, SheetActions } from "./BottomSheet";

/**
 * 확인 시트 — 차단·삭제·탈퇴·로그아웃처럼 되돌리기 어려운 행동 앞에 선다.
 * 시안(KAN-567)대로 가운데 팝업이 아니라 바텀 시트다. 이름은 호출부 호환을 위해
 * 그대로 두었다.
 *
 * @param title - 시트 제목 (예: "OOO님을 차단할까요?")
 * @param description - 설명 한두 줄
 * @param confirmLabel - 확정 버튼 문구
 * @param pending - 요청 진행 중 — 버튼과 딤 닫기를 잠근다
 * @param error - 실패 메시지. 있으면 버튼 위에 빨강으로 보여준다
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pending = false,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} label={title} locked={pending}>
      <p className="text-title text-text-strong tracking-heading font-black">
        {title}
      </p>
      <p className="text-body text-text-3 mt-2 leading-relaxed">
        {description}
      </p>
      {error && <p className="text-caption text-danger mt-2">{error}</p>}
      <SheetActions
        onCancel={onClose}
        onConfirm={onConfirm}
        confirmLabel={confirmLabel}
        pending={pending}
      />
    </BottomSheet>
  );
}
