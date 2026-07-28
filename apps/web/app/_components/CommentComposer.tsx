import { SendMiniIcon } from "@plick/ui/icons";

/**
 * 댓글 입력바 — pill 인풋 + accent 원형 전송 버튼. 기사 세부·릴 세부 패널 공용.
 * 전송은 BE 연동 시 핸들러를 붙인다.
 *
 * 앞쪽 아바타 원과 placeholder는 뺐다(KAN-323) — 모바일이 KAN-307에서 같은
 * 정리를 했고, 입력바 구조를 두 앱이 같게 둔다.
 *
 * @param className - 래퍼 form에 덧붙일 클래스(여백 등)
 */
export function CommentComposer({ className = "" }: { className?: string }) {
  return (
    <form className={`flex items-center gap-2.5 ${className}`}>
      <input
        type="text"
        aria-label="댓글 입력"
        className="bg-elevate-2 border-border text-body text-text focus-visible:border-border-strong rounded-pill h-11 min-w-0 flex-1 border px-4 focus-visible:outline-none"
      />
      <button
        type="submit"
        aria-label="댓글 등록"
        className="bg-accent text-on-accent focus-visible:outline-accent grid size-11 shrink-0 place-items-center rounded-full hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <SendMiniIcon size={17} />
      </button>
    </form>
  );
}
