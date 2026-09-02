"use client";

import Link from "next/link";
import { VoteCard } from "@plick/ui/VoteCard";
import type { InitialDebateList } from "@plick/domain/types";
import { useDebates } from "@/_hooks/useDebates";

/** 첫 로딩에 보여줄 자리 개수 — 카드가 커서 기사 리스트보다 적게 둔다. */
const SKELETON_COUNT = 3;

/**
 * 토론 리스트 본체 (KAN-418, 시안 T1) — 투표 카드 리스트.
 *
 * 카드는 표시 전용이고(투표 상태·결과는 그대로 보여준다) 누르면 소속 기사
 * 상세로 간다 — 티켓 규약대로 실제 투표는 기사·릴 화면이 맡는다.
 *
 * 마감 토론도 리스트에 함께 온다. contentType(FINISH) 마감은 기사 상세와 같은
 * 규약으로 `closed`로 넘기고, closesAt 경과 마감은 카드가 스스로 겹친다(KAN-436).
 *
 * @param initial 서버 컴포넌트가 받아 둔 리스트 씨앗. 없으면 클라가 직접 받는다.
 */
export function DebatesFeed({ initial }: { initial?: InitialDebateList }) {
  const { data, isPending, isError, isFetching, refetch } = useDebates(initial);
  const debates = data ?? [];

  return (
    <section className="px-edge">
      <h2 className="text-body-lg text-text pt-2 pb-3 font-extrabold">
        🔥 지금 뜨거운 VS
      </h2>

      {isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <DebateCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="py-12 text-center">
          <p className="text-body text-text-4">VS를 불러오지 못했어요.</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-elevate text-label text-text rounded-control mt-3 px-4 py-2 font-bold active:opacity-70 disabled:opacity-50"
          >
            다시 시도
          </button>
        </div>
      ) : debates.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {debates.map((debate) => (
            <li key={debate.id}>
              <Link
                href={`/articles/${debate.articleId}`}
                className="block active:opacity-70"
              >
                <VoteCard
                  debate={debate}
                  closed={debate.contentType === "FINISH"}
                  size="sm"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-text-4 py-12 text-center">
          아직 VS가 없어요.
        </p>
      )}
    </section>
  );
}

/** 투표 카드 자리 스켈레톤 — 배지·질문·트랙 2개의 실루엣이다. */
function DebateCardSkeleton() {
  return (
    <div className="bg-elevate rounded-card flex animate-pulse flex-col gap-2.5 p-3.5">
      <div className="bg-elevate rounded-badge h-4 w-16" />
      <div className="bg-elevate rounded-control h-5 w-3/4" />
      <div className="bg-elevate-2 rounded-control h-9" />
      <div className="bg-elevate-2 rounded-control h-9" />
    </div>
  );
}
