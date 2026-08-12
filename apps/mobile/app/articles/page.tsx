import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { WEB_SITE_URL } from "@/_constants/site";
import { ArticlesScreen } from "./_components/ArticlesScreen";

/**
 * 기사 목록 메타데이터 (KAN-386). canonical은 대응 데스크톱 기사 목록이다 —
 * 별도 모바일 URL 패턴(KAN-346)에서 모바일 페이지는 데스크톱 URL을 가리켜
 * 시그널을 한 도메인에 모은다. 데스크톱 쪽 alternate 선언과 상호 참조다.
 */
export const metadata: Metadata = {
  title: "기사",
  description: PAGE_DESCRIPTIONS.articles,
  alternates: { canonical: `${WEB_SITE_URL}/articles` },
};

/**
 * 기사 목록 라우트 — 화면 본체는 팀별 기사(`/articles/teams/[slug]`)와 공용인
 * {@link ArticlesScreen}이 그린다 (KAN-386).
 */
export default function ArticlesPage() {
  return <ArticlesScreen />;
}
