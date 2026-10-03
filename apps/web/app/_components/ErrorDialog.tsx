"use client";

/**
 * 저장 실패 안내 팝업 (KAN-319, 모바일 이식, 시안 KAN-567 다이얼로그) — 중복
 * 닉네임·변경 제한(7일) 같은 BE 거절 사유를 화면 중앙 팝업으로 보여준다.
 * `ConfirmDialog`와 같은 각진 상자(`border-strong` + `shadow-dialog`)에 테두리
 * "확인" 하나다. 프로필 수정·온보딩(KAN-320)이 함께 쓴다.
 *
 * @param message - 보여줄 에러 문구 (BE의 사용자용 한국어 그대로)
 * @param onClose - "확인" 또는 딤 클릭으로 닫을 때
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
      {/* 딤 — 클릭하면 닫는다 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="bg-dim-strong absolute inset-0"
      />

      <div className="bg-bg border-border-strong shadow-dialog relative w-full max-w-76 border px-5.5 pt-6 pb-5">
        <p
          id="save-error-dialog-title"
          className="text-body-lg text-text-strong text-center font-black"
        >
          저장할 수 없어요
        </p>
        <p className="text-label-lg text-text-3 mt-2 text-center leading-[1.6]">
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="border-border-strong text-text-2 text-body hover:bg-elevate focus-visible:outline-accent mt-4.5 flex h-9.5 w-full items-center justify-center border font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          확인
        </button>
      </div>
    </div>
  );
}
