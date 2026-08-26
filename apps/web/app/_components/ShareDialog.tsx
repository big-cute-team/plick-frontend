"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CloseIcon } from "@plick/ui/icons";
import { COPY_FALLBACK_NOTICE } from "@/_constants/share";
import { useCopyLink } from "@/_hooks/useCopyLink";
import { shareUrl } from "@/_utils/share";

/**
 * 링크 공유 팝업 (KAN-312, web 이식 KAN-349) — 릴의 공유 버튼이 쓴다.
 *
 * 모바일과 같은 주소 확인 + 복사 버튼 팝업이고, `LoginPromptDialog`와 같은
 * 스크림 + 카드 관용이다. 데스크톱이라 hover·focus-visible을 얹었다.
 * 무엇을 공유할지는 호출부가 경로로 정한다(릴은 `reelSharePath`).
 *
 * body로 포털을 뚫는다 — 릴 카드·세부 패널 안은 `transform`이 걸린 조상이 될 수
 * 있고, 그러면 `position: fixed`의 기준 상자가 어긋난다(`LoginPromptDialog`와
 * 같은 이유).
 *
 * 주소는 마운트 뒤에 만든다. `location.origin`은 서버 렌더에 없다.
 *
 * @param path 공유할 앱 내 경로 — 절대 주소는 여기서 origin을 붙여 만든다
 * @param onClose X 버튼 또는 스크림 클릭으로 닫을 때
 */
export function ShareDialog({
  path,
  onClose,
}: {
  path: string;
  onClose: () => void;
}) {
  /* 포털 대상(document)도 origin도 서버 렌더엔 없다. 마운트 뒤에만 그린다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const url = mounted ? shareUrl(path) : "";
  const { status, copy } = useCopyLink(url);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
    >
      {/* 스크림 — 클릭하면 닫는다 */}
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
          className="text-icon hover:bg-elevate focus-visible:outline-accent absolute top-3 right-3 flex size-8.5 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
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
          이 링크를 복사해 공유해 보세요.
        </p>

        {/* 주소 원문 — 복사가 막힌 환경에서 드래그해 직접 집어갈 수 있게 늘 보여준다.
            `select-all`이라 한 번만 클릭해도 전체가 잡힌다 */}
        <p className="bg-elevate-2 border-border rounded-control text-label text-text-2 mt-4 border px-3.5 py-3 break-all select-all">
          {url}
        </p>

        <button
          type="button"
          onClick={copy}
          className="bg-accent text-on-accent rounded-control text-body focus-visible:outline-accent mt-3 flex w-full items-center justify-center gap-1.5 py-3 font-extrabold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 active:opacity-80"
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
