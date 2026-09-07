"use client";

import Link from "next/link";
import { VoteCard } from "@plick/ui/VoteCard";
import type { InitialDebateList } from "@plick/domain/types";
import { QueryBoundary } from "@/_components/QueryBoundary";
import { useDebates } from "@/_hooks/useDebates";

/** 첫 로딩에 보여줄 자리 개수 — 카드가 커서 기사 리스트보다 적게 둔다. */
const SKELETON_COUNT = 3;

/**
 * 토론 리스트 본체 (KAN-418, 시안 T1) — 투표 카드 리스트.
 *
 * 제목과 경계만 세우고 리스트는 {@link DebateList}가 그린다 (KAN-447).
 * 씨앗 없이 들어와 클라가 받는 동안은 Suspense fallback(스켈레톤)이,
 * 실패는 경계의 에러 UI가 받는다 — 손으로 쓰던 isPending·isError 분기를
 * 경계 선언으로 옮겼고, 제목은 경계 밖이라 실패해도 남는다.
 *
 * @param initial 서버 컴포넌트가 받아 둔 리스트 씨앗. 없으면 클라가 직접 받는다.
 */
export function DebatesFeed({ initial }: { initial?: InitialDebateList }) {
  return (
    <section className="px-edge">
      <h2 className="text-body-lg text-text pt-2 pb-3 font-extrabold">
        🔥 지금 뜨거운 VS
      </h2>

      <QueryBoundary
        fallback={
          <div className="flex flex-col gap-3">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <DebateCardSkeleton key={i} />
            ))}
          </div>
        }
        errorMessage="VS를 불러오지 못했어요."
      >
        <DebateList initial={initial} />
      </QueryBoundary>
    </section>
  );
}

/**
 * 리스트 본체 — suspense 쿼리를 부르는 쪽이라 경계 안에 산다. 성공 케이스만
 * 그린다. 카드는 표시 전용이고(투표 상태·결과는 그대로 보여준다) 누르면 소속
 * 기사 상세로 간다 — 티켓 규약대로 실제 투표는 기사·릴 화면이 맡는다.
 *
 * 마감 토론도 리스트에 함께 온다. contentType(FINISH) 마감은 기사 상세와 같은
 * 규약으로 `closed`로 넘기고, closesAt 경과 마감은 카드가 스스로 겹친다(KAN-436).
 */
function DebateList({ initial }: { initial?: InitialDebateList }) {
  const { data: debates } = useDebates(initial);

  if (debates.length === 0) {
    return (
      <p className="text-body text-text-4 py-12 text-center">
        아직 VS가 없어요.
      </p>
    );
  }

  return (
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
