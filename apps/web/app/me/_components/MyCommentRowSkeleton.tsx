/** 내 댓글 줄 자리 — 본문 두 줄과 오른쪽 기사 제목 칸의 실루엣. */
export function MyCommentRowSkeleton() {
  return (
    <div className="border-border-soft flex animate-pulse gap-5 border-b py-3.75">
      <div className="flex flex-1 flex-col gap-2">
        <div className="bg-chip h-4 w-4/5" />
        <div className="bg-chip h-4 w-2/5" />
      </div>
      <div className="bg-chip h-4 w-61.5 shrink-0" />
    </div>
  );
}
