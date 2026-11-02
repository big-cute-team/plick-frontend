import { PARTICIPATION_NOTICE } from "@plick/domain/vs";

/** 잠금 상태에는 실제 댓글을 DOM에 싣지 않고 흐린 실루엣과 참여 안내만 표시한다. */
export function OpinionTeaser({
  locked,
  opinion,
  emptyLabel = "아직 의견이 없어요",
}: {
  locked: boolean;
  opinion?: { nickname: string; opinion: string } | null;
  emptyLabel?: string;
}) {
  if (locked) {
    return (
      <div className="relative flex min-h-12 items-center justify-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-1 flex gap-2 blur-sm"
        >
          <span className="bg-border-strong rounded-pill h-3 w-16" />
          <span className="bg-border-strong rounded-pill h-3 flex-1" />
        </div>
        <p className="text-label text-text-strong relative text-center font-bold">
          {PARTICIPATION_NOTICE}
        </p>
      </div>
    );
  }
  return (
    <p className="text-label text-text-3 flex min-h-12 min-w-0 items-center gap-1.5">
      {opinion ? (
        <>
          <span className="text-text-strong max-w-[40%] truncate font-bold">
            {opinion.nickname}
          </span>
          <span className="text-text-2 min-w-0 flex-1 truncate">
            {opinion.opinion}
          </span>
        </>
      ) : (
        emptyLabel
      )}
    </p>
  );
}
