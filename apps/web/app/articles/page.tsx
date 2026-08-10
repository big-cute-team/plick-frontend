import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { ArticlesScreen } from "./_components/ArticlesScreen";

/** 기사 목록은 web 전용 라우트라(모바일 대응 페이지 없음) alternate 없이 canonical만 단다 (KAN-346). */
export const metadata: Metadata = {
  title: "기사",
  description: PAGE_DESCRIPTIONS.articles,
  alternates: { canonical: "/articles" },
};

/**
 * 기사 목록 라우트 — 화면 본체는 팀별 기사(`/articles/teams/[slug]`)와 공용인
 * {@link ArticlesScreen}이 그린다 (KAN-350).
 */
export default function ArticlesPage() {
  return <ArticlesScreen />;
}
