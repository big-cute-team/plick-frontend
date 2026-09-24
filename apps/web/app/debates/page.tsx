import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { DebatesScreen } from "./_components/DebatesScreen";

/**
 * 이 URL이 canonical이고 대응 모바일 투표 탭을 alternate로 선언한다.
 * 기사 목록(KAN-346, KAN-386)과 같은 상호 참조 규약이다. `?tab=closed`도 canonical은
 * `/debates`다.
 */
export const metadata: Metadata = {
  title: "투표",
  description: PAGE_DESCRIPTIONS.debates,
  alternates: {
    canonical: "/debates",
    media: { [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/debates` },
  },
};

/**
 * 투표 라우트 — 화면 본체는 {@link DebatesScreen}이 그린다 (KAN-418).
 *
 * @param searchParams `tab` 쿼리. `closed`면 마감 탭, 그 밖에는 진행 중 (KAN-567)
 */
export default async function DebatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <DebatesScreen tab={tab === "closed" ? "closed" : "open"} />;
}
