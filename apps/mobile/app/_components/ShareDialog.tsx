"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CloseIcon } from "@plick/ui/icons";
import { COPY_FALLBACK_NOTICE } from "@/_constants/share";
import { useCopyLink } from "@/_hooks/useCopyLink";
import { articleShareUrl } from "@/_utils/share";

/**
 * 링크 공유 팝업 (KAN-312) — 기사 세부와 릴스의 공유 버튼이 함께 쓴다.
 *
 * 티켓대로 네이티브 공유 시트가 아니라 주소를 눈으로 보여 주고 복사 버튼을 다는
 * 팝업이다. 릴스에서 열어도 릴 주소가 아니라 기사 세부 주소를 준다
 * ({@link articleShareUrl}) — 링크를 받은 사람이 커서 피드의 특정 릴이 아니라
 * 읽을 수 있는 기사 페이지로 떨어지게 하려는 것이다.
 *
 * `LoginPromptDialog`와 같은 스크림 + 카드 관용에 같은 이유로 body 포털을 쓴다.
 * 릴스 액션 레일엔 `drop-shadow` 필터가 걸려 있는데, 필터가 걸린 조상은
 * `position: fixed`의 기준 상자가 돼서 그 안에 두면 `inset-0`이 화면이 아니라
 * 레일에 맞는다. body 밑으로 옮기면 어디서 부르든 화면 전체를 덮는다.
 *
 * 주소는 마운트 뒤에 만든다. `location.origin`은 서버 렌더에 없다.
 *
 * @param articleId 공유할 기사(=릴) id
 * @param onClose X 버튼 또는 스크림 탭으로 닫을 때
 */
export function ShareDialog({
  articleId,
  onClose,
}: {
  articleId: string;
  onClose: () => void;
}) {
  /* 포털 대상(document)도 origin도 서버 렌더엔 없다. 마운트 뒤에만 그린다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const url = mounted ? articleShareUrl(articleId) : "";
  const { status, copy } = useCopyLink(url);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
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

      <div className="bg-bg border-border rounded-card relative w-full max-w-80 border p-6">
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="text-icon absolute top-3 right-3 flex size-8.5 items-center justify-center active:opacity-60"
        >
          <CloseIcon size={18} />
        </button>

        <p
          id="share-dialog-title"
          className="text-body-lg text-text pt-2 text-center font-extrabold"
        >
          링크 공유
        </p>
        <p className="text-label text-text-3 mt-2 text-center">
          이 링크를 복사해 기사를 공유해 보세요.
        </p>

        {/* 주소 원문 — 복사가 막힌 웹뷰에서 길게 눌러 직접 집어갈 수 있게 늘 보여준다.
            `select-all`이라 한 번만 눌러도 전체가 잡힌다 */}
        <p className="bg-elevate-2 border-border rounded-control text-label text-text-2 mt-4 border px-3.5 py-3 break-all select-all">
          {url}
        </p>

        <button
          type="button"
          onClick={copy}
          className="bg-accent text-on-accent rounded-control text-body mt-3 flex w-full items-center justify-center gap-1.5 py-3 font-extrabold active:opacity-60"
        >
          {status === "copied" && <CheckIcon size={14} />}
          {status === "copied" ? "복사했어요" : "링크 복사"}
        </button>

        {status === "failed" && (
          <p
            role="status"
            className="text-caption text-warn mt-2.5 text-center"
          >
            {COPY_FALLBACK_NOTICE}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
