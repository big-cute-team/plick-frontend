"use client";

/**
 * 저장 실패 안내 팝업 — 중복 닉네임·변경 제한(7일) 같은 BE 거절 사유를
 * 화면 중앙 팝업으로 보여준다(단순 인라인 빨간 글자 대신, 사용자 요구).
 * 마이페이지 로그아웃 확인 팝업(`LogoutButton`)과 같은 스크림 + 카드 관용.
 *
 * @param message - 보여줄 에러 문구 (BE의 사용자용 한국어 그대로)
 * @param onClose - "확인" 또는 스크림 탭으로 닫을 때
 */
export function ErrorDialog({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="save-error-dialog-title"
    >
      {/* 스크림 — 탭하면 닫는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--plk-scrim) 60%, transparent)",
        }}
      />

      <div className="bg-bg border-border rounded-card relative w-full max-w-72 border p-6">
        <p
          id="save-error-dialog-title"
          className="text-body-lg text-text text-center font-extrabold"
        >
          저장할 수 없어요
        </p>
        <p className="text-label text-text-3 mt-2 text-center">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className="border-border text-text-2 rounded-control text-body mt-5 w-full border py-3 font-extrabold active:opacity-60"
        >
          확인
        </button>
      </div>
    </div>
  );
}
