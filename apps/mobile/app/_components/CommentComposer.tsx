import { SendMiniIcon } from "@plick/ui/icons";

/**
 * 댓글 입력바 — pill 인풋 + accent 원형 전송 버튼. 기사 세부·릴 세부 시트 공용.
 * 전송은 BE 연동 시 핸들러를 붙인다(퍼블리싱 단계라 미연결).
 *
 * @param className - 래퍼 form에 덧붙일 클래스(여백 등)
 */
export function CommentComposer({ className = "" }: { className?: string }) {
  return (
    <form className={`flex items-center gap-2.5 ${className}`}>
      <input
        type="text"
        placeholder="팬 반응 남기기…"
        className="bg-elevate-2 border-border text-body text-text placeholder:text-text-4 rounded-pill h-11 min-w-0 flex-1 border px-4 focus-visible:outline-none"
      />
      <button
        type="submit"
        aria-label="댓글 등록"
        className="bg-accent text-on-accent grid size-11 shrink-0 place-items-center rounded-full active:opacity-60"
      >
        <SendMiniIcon size={17} />
      </button>
    </form>
  );
}
