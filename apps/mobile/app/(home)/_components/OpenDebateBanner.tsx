import Link from "next/link";
import { openDebates } from "@plick/domain/format";
import type { DebateListItem } from "@plick/domain/types";
import { VsMark } from "@plick/ui/VsMark";

/**
 * 홈 상단의 VS 띠 (KAN-504, 시안 KAN-567) — 진행 중인 투표 질문과 A 비율을 한 줄로
 * 보여준다. 누르면 그 기사(투표 카드가 있는 곳)로 간다.
 *
 * 대표로 세우는 건 마감이 가장 가까운 투표다({@link openDebates}) — 재촉할
 * 이유가 가장 큰 쪽이고, 최신순 첫 건을 쓰면 오늘 자정에 닫히는 투표를 두고
 * 일주일 뒤 마감을 보여주게 된다.
 *
 * 마감 판정을 여기서 다시 하는 이유는 BE가 `closesAt`이 지나도 기사
 * `contentType`을 FINISH로 넘기지 않기 때문이다(KAN-436·437). 도메인 헬퍼가
 * 두 기준을 OR로 겹쳐 준다.
 *
 * 열린 투표가 없으면 아무것도 그리지 않는다 — 실패를 빈 배열로 접는 규약도
 * {@link TodayMatchBanner}와 같다.
 *
 * @param debates 토론 리스트 응답(마감 포함). 필터·정렬은 이 컴포넌트가 한다.
 */
export function OpenDebateBanner({ debates }: { debates: DebateListItem[] }) {
  const open = openDebates(debates);
  const featured = open[0];
  if (!featured) return null;

  const total = featured.voteCountA + featured.voteCountB;
  const pctA =
    total === 0 ? 0 : Math.round((featured.voteCountA / total) * 100);

  return (
    <Link
      href={`/articles/${featured.articleId}`}
      className="bg-elevate rounded-card flex items-center gap-2.25 p-3 active:opacity-80"
    >
      <VsMark size="md" />
      <span className="text-body text-text-strong min-w-0 flex-1 truncate font-bold">
        {featured.topic}
      </span>
      <span className="text-caption-lg text-accent shrink-0 font-bold">
        {pctA}%
      </span>
    </Link>
  );
}
