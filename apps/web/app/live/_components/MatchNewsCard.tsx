"use client";

import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import { articlesTeamPath } from "@plick/domain/format";
import type { MatchSummary } from "@plick/domain/live";
import { PostListItem } from "@/_components/PostListItem";
import { PostListItemSkeleton } from "@/_components/PostListItemSkeleton";
import { MATCH_NEWS_SKELETON_COUNT } from "@/_constants/live";
import { useMatchNews } from "@/_hooks/useMatchNews";
import { matchTeamCodes } from "@/_utils/live";

/**
 * 경기 상세 뉴스 탭 (KAN-484 → KAN-567 톤 정리). 양 팀 기사를 최신순으로 합쳐 표 행
 * (`PostListItem` article 변형, 시안의 `40px 1fr 128px 54px` 표)으로 깐다. 눌렀을 때
 * 가는 곳도 피드와 같다. 아래에 팀별 "기사 더 보기" 텍스트 링크를 둔다.
 *
 * 빅6 밖 팀은 기사에 태그되지 않아(`TeamCode`가 없다) 목록에서 빠진다. 양 팀이
 * 다 빅6 밖이면 부를 것이 없어 안내 한 줄만 남는다. 모바일 `MatchNewsBlock`과
 * 같은 데이터, 같은 빈 상태다.
 *
 * @param header 경기 헤더. 양 팀을 여기서 읽는다
 */
export function MatchNewsCard({ header }: { header: MatchSummary }) {
  const teams = matchTeamCodes(header);
  const { data, isPending, isError, refetch } = useMatchNews(teams, true);

  if (teams.length === 0) {
    return <Empty label="이 경기 팀의 기사는 아직 모으지 않아요" />;
  }

  if (isPending) {
    return (
      <div className="pt-2">
        {Array.from({ length: MATCH_NEWS_SKELETON_COUNT }, (_, i) => (
          <PostListItemSkeleton key={i} variant="article" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-baseline gap-3 py-10">
        <p className="text-body-md text-text-4">기사를 불러오지 못했어요</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-label-lg text-accent hover:text-accent-hover focus-visible:outline-accent font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return <Empty label="아직 올라온 기사가 없어요" />;
  }

  return (
    <div className="pt-2">
      <ul>
        {data.map((article) => (
          <li key={article.id}>
            <PostListItem post={article} variant="article" />
          </li>
        ))}
      </ul>
      {/* 더 보는 건 기사 목록의 팀 탭이 원본이다. 피드와 같은 규약 */}
      <div className="flex flex-wrap gap-4 pt-4">
        {teams.map((code) => (
          <Link
            key={code}
            href={articlesTeamPath(code)}
            className="text-label text-accent hover:text-accent-hover font-bold"
          >
            {TEAMS[code].name} 기사 더 보기
          </Link>
        ))}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-body-md text-text-4 py-10">{label}</p>;
}
