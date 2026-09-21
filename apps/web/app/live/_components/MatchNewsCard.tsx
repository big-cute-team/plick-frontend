"use client";

import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import { articlesTeamPath } from "@plick/domain/format";
import type { MatchSummary } from "@plick/domain/live";
import { ChevronMiniIcon } from "@plick/ui/icons";
import { PostListItem } from "@/_components/PostListItem";
import { PostListItemSkeleton } from "@/_components/PostListItemSkeleton";
import { MATCH_NEWS_SKELETON_COUNT } from "@/_constants/live";
import { useMatchNews } from "@/_hooks/useMatchNews";
import { matchTeamCodes } from "@/_utils/live";

/**
 * 경기 상세 뉴스 탭 (KAN-484) — 양 팀 기사를 최신순으로 합쳐 한 카드에 깐다.
 *
 * 경기를 보다가 "이 팀 요즘 무슨 얘기가 도나"가 궁금해지는 자리인데, 그때까지는
 * 기사 목록으로 나갔다 팀을 다시 고르고 돌아와야 했다. 줄은 피드와 같은
 * `PostListItem`(article 변형)이라 눌렀을 때 가는 곳도 같다.
 *
 * 빅6 밖 팀은 기사에 태그되지 않아(`TeamCode`가 없다) 목록에서 빠진다. 양 팀이
 * 다 빅6 밖이면 부를 것이 없어 안내 한 줄만 남는다. 모바일 `MatchNewsBlock`과
 * 같은 데이터·같은 빈 상태다.
 *
 * @param header 경기 헤더 — 양 팀을 여기서 읽는다
 */
export function MatchNewsCard({ header }: { header: MatchSummary }) {
  const teams = matchTeamCodes(header);
  const { data, isPending, isError, refetch } = useMatchNews(teams, true);

  if (teams.length === 0) {
    return <EmptyCard label="이 경기 팀의 기사는 아직 모으지 않아요" />;
  }

  if (isPending) {
    return (
      <section className="bg-elevate rounded-card px-6 py-2">
        {Array.from({ length: MATCH_NEWS_SKELETON_COUNT }, (_, i) => (
          <PostListItemSkeleton key={i} variant="article" />
        ))}
      </section>
    );
  }

  if (isError) {
    return (
      <section className="bg-elevate rounded-card flex flex-col items-center gap-3 py-16">
        <p className="text-body-lg text-text-4">기사를 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="bg-elevate-2 rounded-pill text-body text-text hover:bg-elevate focus-visible:outline-accent px-5 py-2.5 font-bold transition-colors focus-visible:outline-2"
        >
          다시 시도
        </button>
      </section>
    );
  }

  if (data.length === 0) {
    return <EmptyCard label="아직 올라온 기사가 없어요" />;
  }

  return (
    <section className="bg-elevate rounded-card px-6 py-2">
      <ul>
        {data.map((article) => (
          <li key={article.id}>
            <PostListItem post={article} variant="article" />
          </li>
        ))}
      </ul>
      {/* 더 보는 건 기사 목록의 팀 탭이 원본이다 — 피드와 같은 규약 */}
      <div className="flex flex-wrap gap-2 py-4">
        {teams.map((code) => (
          <Link
            key={code}
            href={articlesTeamPath(code)}
            className="bg-elevate-2 rounded-control text-body text-text hover:bg-elevate focus-visible:outline-accent flex items-center gap-1.5 px-4 py-2.5 font-bold transition-colors focus-visible:outline-2"
          >
            {TEAMS[code].name} 기사 더 보기
            <ChevronMiniIcon size={14} className="text-text-4" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <p className="bg-elevate rounded-card text-body-lg text-text-4 py-20 text-center">
      {label}
    </p>
  );
}
