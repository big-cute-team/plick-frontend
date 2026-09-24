"use client";

import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import { articlesTeamPath } from "@plick/domain/format";
import type { MatchSummary } from "@plick/domain/live";
import { ChevronRightIcon } from "@plick/ui/icons";
import { NewsItem } from "@/_components/NewsItem";
import { NewsItemSkeleton } from "@/_components/NewsItemSkeleton";
import { MATCH_NEWS_SKELETON_COUNT } from "@/_constants/live";
import { useMatchNews } from "@/_hooks/useMatchNews";
import { matchTeamCodes } from "@/_utils/live";

/**
 * 경기 상세 뉴스 탭 (KAN-484, 시안 KAN-567). 양 팀 기사를 최신순으로 합쳐 깐다.
 * 행은 홈 이슈 목록과 같은 `NewsItem`(엠블럼 36, 제목 14/700, 댓글 수 빨강,
 * 오른쪽 시각과 기자)이라 시안의 뉴스 탭 행과 같은 모양이고 눌렀을 때 가는 곳도
 * 같다.
 *
 * 경기를 보다가 "이 팀 요즘 무슨 얘기가 도나"가 궁금해지는 자리인데, 그때까지는
 * 기사 탭으로 나갔다 팀을 다시 고르고 돌아와야 했다.
 *
 * 빅6 밖 팀은 기사에 태그되지 않아(`TeamCode`가 없다) 목록에서 빠진다. 양 팀이
 * 다 빅6 밖이면 부를 것이 없어 안내 한 줄만 남는다. 목록 아래 "팀 기사 더 보기"는
 * 시안에 없지만 첫 페이지 밖 기사로 가는 유일한 길이라 글자 링크로 남겼다.
 *
 * @param header 경기 헤더. 양 팀을 여기서 읽는다
 */
export function MatchNewsBlock({ header }: { header: MatchSummary }) {
  const teams = matchTeamCodes(header);
  const { data, isPending, isError, refetch } = useMatchNews(teams, true);

  if (teams.length === 0) {
    return (
      <p className="text-body text-text-4 py-16 text-center">
        이 경기 팀의 기사는 아직 모으지 않아요
      </p>
    );
  }

  if (isPending) {
    return (
      <ul className="flex flex-col">
        {Array.from({ length: MATCH_NEWS_SKELETON_COUNT }, (_, i) => (
          <li key={i}>
            <NewsItemSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-14">
        <p className="text-body text-text-4">기사를 불러오지 못했어요</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="border-border-strong text-label-lg text-text-2 rounded-control border px-4 py-2 font-bold active:opacity-70"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-body text-text-4 py-16 text-center">
        아직 올라온 기사가 없어요
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col">
        {data.map((article) => (
          <li key={article.id}>
            <NewsItem article={article} />
          </li>
        ))}
      </ul>
      {/* 더 보는 건 기사 목록의 팀 탭이 원본이다. 홈 소식 리스트와 같은 규약 */}
      <div className="flex flex-col">
        {teams.map((code) => (
          <Link
            key={code}
            href={articlesTeamPath(code)}
            className="border-border-soft text-label-lg text-text-2 flex items-center justify-between border-b py-3 font-bold active:opacity-70"
          >
            {TEAMS[code].name} 기사 더 보기
            <ChevronRightIcon size={14} className="text-text-4" />
          </Link>
        ))}
      </div>
    </>
  );
}
