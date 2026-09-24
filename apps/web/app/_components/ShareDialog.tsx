"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { trackShare } from "@plick/core/events";
import { CheckIcon } from "@plick/ui/icons";
import { COPY_FALLBACK_NOTICE } from "@/_constants/share";
import { useCopyLink } from "@/_hooks/useCopyLink";
import { shareUrl } from "@/_utils/share";

/**
 * 링크 공유 팝업 (KAN-312, web 이식 KAN-349, 시안 KAN-567 다이얼로그) — 릴과 기사
 * 세부(KAN-485)의 공유 버튼이 쓴다.
 *
 * 모바일과 같은 주소 확인 + 복사 버튼 팝업이고, `ConfirmDialog`와 같은 각진 상자다.
 * 주소는 칩 면(`bg-chip`) 상자에 두고 "링크 복사"는 강조색 채운 면, 그 밑에 테두리
 * "닫기". 무엇을 공유할지는 호출부가 경로로 정한다(릴은 `reelSharePath`, 기사는
 * `articleSharePath`).
 *
 * body로 포털을 뚫는다 — 릴 카드·세부 패널 안은 `transform`이 걸린 조상이 될 수
 * 있고, 그러면 `position: fixed`의 기준 상자가 어긋난다(`LoginPromptDialog`와
 * 같은 이유).
 *
 * 주소는 마운트 뒤에 만든다. `location.origin`은 서버 렌더에 없다.
 *
 * 복사가 끝나면 공유 이벤트(`share`)를 보낸다 (KAN-543). 팝업을 연 것이 아니라 실제로
 * 복사된 순간이 확산 신호다. 실패(클립보드 막힘)는 보내지 않는다.
 *
 * @param path 공유할 앱 내 경로 — 절대 주소는 여기서 origin을 붙여 만든다
 * @param articleId 공유하는 기사(릴) id. 공유 이벤트에 싣는다
 * @param onClose 닫기 버튼 또는 딤 클릭으로 닫을 때
 */
export function ShareDialog({
  path,
  articleId,
  onClose,
}: {
  path: string;
  articleId: string;
  onClose: () => void;
}) {
  /* 포털 대상(document)도 origin도 서버 렌더엔 없다. 마운트 뒤에만 그린다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const url = mounted ? shareUrl(path) : "";
  const { status, copy } = useCopyLink(url);

  async function handleCopy() {
    if (await copy()) trackShare(articleId);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
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
          id="share-dialog-title"
          className="text-body-lg text-text-strong text-center font-black"
        >
          링크 공유
        </p>
        <p className="text-label-lg text-text-3 mt-2 text-center">
          이 링크를 복사해 공유해 보세요
        </p>

        {/* 주소 원문 — 복사가 막힌 환경에서 드래그해 직접 집어갈 수 있게 늘 보여준다.
            `select-all`이라 한 번만 클릭해도 전체가 잡힌다 */}
        <p className="bg-chip text-label text-text-2 mt-4 px-3 py-2.5 break-all select-all">
          {url}
        </p>

        <button
          type="button"
          onClick={handleCopy}
          className="bg-accent text-on-accent text-body hover:bg-accent-hover focus-visible:outline-accent mt-2.25 flex h-9.5 w-full items-center justify-center gap-1.5 font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {status === "copied" && <CheckIcon size={14} />}
          {status === "copied" ? "복사했어요" : "링크 복사"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="border-border-strong text-text-2 text-body hover:bg-elevate focus-visible:outline-accent mt-2.25 flex h-9.5 w-full items-center justify-center border font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          닫기
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
