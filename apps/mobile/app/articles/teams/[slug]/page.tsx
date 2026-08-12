import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TEAM_BY_SLUG, TEAM_FULL_NAMES } from "@plick/domain/constants";
import { WEB_SITE_URL } from "@/_constants/site";
import { ArticlesScreen } from "@/articles/_components/ArticlesScreen";

/**
 * 팀별 기사 목록 메타데이터 (KAN-386, 웹 KAN-350과 같은 판단). canonical은
 * 자기 자신이 아니라 데스크톱 팀 허브(`/teams/[slug]`)다 — 같은 팀의 기사
 * 목록이라 중복 콘텐츠로 시그널이 갈리는 걸 막고, 팀 검색어의 랜딩은 canonical
 * 도메인의 팀 허브 하나로 모은다. 이 URL은 새로고침·공유가 기사 surface에
 * 남게 하는 UX 몫이다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const code = TEAM_BY_SLUG[slug];
  // 모르는 slug는 빈 메타데이터로 두면 페이지 본문이 notFound()로 떨어진다
  if (!code) return {};

  const fullName = TEAM_FULL_NAMES[code];
  return {
    title: `${fullName} 기사`,
    description: `${fullName} 이적 기사 모아보기`,
    alternates: { canonical: `${WEB_SITE_URL}/teams/${slug}` },
    // canonical과 같은 팀 허브의 동적 OG를 그대로 쓴다 (KAN-351) — 이 라우트에
    // 이미지 파일을 따로 두지 않고 카드도 팀 허브 하나로 모은다
    openGraph: {
      images: [
        {
          url: `${WEB_SITE_URL}/teams/${slug}/og`,
          width: 1200,
          height: 630,
          alt: `${fullName} 이적 루머`,
        },
      ],
    },
  };
}

/**
 * 팀별 기사 목록 (KAN-386) — 기사 페이지에서 고른 팀 탭이 URL로 남는 라우트.
 * 화면은 기사 목록과 완전히 같다 — {@link ArticlesScreen}을 해당 팀이 선택된
 * 상태로 그릴 뿐이다. 탭 선택은 history.replaceState로 이 URL이 되고, 직접
 * 열거나 새로고침하면 여기가 같은 화면을 서버 렌더한다.
 */
export default async function ArticlesTeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const code = TEAM_BY_SLUG[slug];
  if (!code) notFound();

  return <ArticlesScreen team={code} />;
}
