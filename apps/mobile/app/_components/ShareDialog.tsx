"use client";

import { useEffect, useState } from "react";
import { trackShare } from "@plick/core/events";
import { CheckIcon } from "@plick/ui/icons";
import { COPY_FALLBACK_NOTICE } from "@/_constants/share";
import { useCopyLink } from "@/_hooks/useCopyLink";
import { shareUrl } from "@/_utils/share";
import { BottomSheet } from "./BottomSheet";

/**
 * 링크 공유 시트 (KAN-312, 시안 KAN-567) — 주소 원문과 복사 버튼. 웹뷰에서 복사가
 * 막혀도 길게 눌러 집어갈 수 있게 주소는 늘 보여준다.
 *
 * @param path - 공유할 경로(origin은 마운트 뒤 붙인다)
 * @param articleId - 공유 이벤트 대상 기사
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
  /* origin은 서버 렌더엔 없다. 마운트 뒤에만 조립한다 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const url = mounted ? shareUrl(path) : "";
  const { status, copy } = useCopyLink(url);

  async function handleCopy() {
    if (await copy()) trackShare(articleId);
  }

  return (
    <BottomSheet onClose={onClose} label="링크 공유">
      <p className="text-title text-text-strong tracking-heading font-black">
        링크 공유
      </p>
      {/* `select-all`이라 한 번만 눌러도 전체가 잡힌다 */}
      <p className="bg-input rounded-control text-label-lg text-text-2 mt-4 px-3.5 py-3 break-all select-all">
        {url}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="bg-accent text-on-accent rounded-control text-body-md mt-3 flex h-12 w-full items-center justify-center gap-1.5 font-bold active:opacity-60"
      >
        {status === "copied" && <CheckIcon size={14} />}
        {status === "copied" ? "복사했어요" : "링크 복사"}
      </button>
      {status === "failed" && (
        <p role="status" className="text-caption text-warn mt-2.5 text-center">
          {COPY_FALLBACK_NOTICE}
        </p>
      )}
    </BottomSheet>
  );
}
