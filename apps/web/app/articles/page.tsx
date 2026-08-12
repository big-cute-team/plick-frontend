import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { ArticlesScreen } from "./_components/ArticlesScreen";

/**
 * 이 URL이 canonical이고 대응 모바일 기사 목록을 alternate로 선언한다
 * (KAN-346·KAN-386) — 모바일에 기사 페이지가 생기면서 홈과 같은 상호 참조
 * 규약을 따른다.
 */
export const metadata: Metadata = {
  title: "기사",
  description: PAGE_DESCRIPTIONS.articles,
  alternates: {
    canonical: "/articles",
    media: { [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/articles` },
  },
};

/**
 * 기사 목록 라우트 — 화면 본체는 팀별 기사(`/articles/teams/[slug]`)와 공용인
 * {@link ArticlesScreen}이 그린다 (KAN-350).
 */
export default function ArticlesPage() {
  return <ArticlesScreen />;
}
