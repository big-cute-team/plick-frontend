import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TEAMS, TEAM_BY_SLUG, TEAM_FULL_NAMES } from "@plick/domain/constants";
import { WEB_SITE_URL } from "@/_constants/site";
import { HomeScreen } from "@/(home)/_components/HomeScreen";

/**
 * 팀별 고유 메타데이터 (KAN-350) — 팀 허브는 "토트넘 이적 루머" 같은 팀 검색어의
 * 랜딩이라 title·description이 팀마다 달라야 한다. title은 정식 명칭(풀네임),
 * description에는 축약명도 함께 넣어 두 표기 검색을 다 받는다. canonical은 같은
 * 콘텐츠의 데스크톱 팀 허브다(별도 모바일 URL 패턴, KAN-346과 같은 규약).
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
  const title = `${fullName} 이적 루머`;
  const description = `${fullName} 이적 루머와 최신 소식 모아보기. ${TEAMS[code].name}의 프리미어리그 이적시장 소식을 릴스로 넘겨보세요.`;
  return {
    title,
    description,
    alternates: { canonical: `${WEB_SITE_URL}/teams/${slug}` },
    openGraph: { title, description },
  };
}

/**
 * 팀 허브 (KAN-350) — 팀 검색어를 받아줄 서버 렌더 URL. 홈 팀 필터는 클라 상태라
 * 구글이 도달할 수 없어서(SEO 전략 Step 2-2) 팀마다 고유 URL을 만들었다.
 *
 * 화면은 홈과 완전히 같다 — {@link HomeScreen}을 해당 팀이 선택된 상태로 그릴
 * 뿐이다. 홈에서 팀 탭을 고르면 history.replaceState로 이 URL이 되고, 이 URL을
 * 직접 열거나 새로고침하면 여기가 같은 화면을 서버 렌더한다. 두 경로가 같은
 * 컴포넌트를 그리므로 어느 쪽으로 진입해도 화면이 어긋나지 않는다.
 */
export default async function TeamHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const code = TEAM_BY_SLUG[slug];
  if (!code) notFound();

  return <HomeScreen team={code} />;
}
