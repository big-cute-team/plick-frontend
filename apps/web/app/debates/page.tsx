import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { DebatesScreen } from "./_components/DebatesScreen";

/**
 * 이 URL이 canonical이고 대응 모바일 토론 리스트를 alternate로 선언한다 —
 * 기사 목록(KAN-346·KAN-386)과 같은 상호 참조 규약이다.
 */
export const metadata: Metadata = {
  title: "토론",
  description: PAGE_DESCRIPTIONS.debates,
  alternates: {
    canonical: "/debates",
    media: { [MOBILE_ALTERNATE_MEDIA]: `${MOBILE_SITE_URL}/debates` },
  },
};

/** 토론 리스트 라우트 — 화면 본체는 {@link DebatesScreen}이 그린다 (KAN-418). */
export default function DebatesPage() {
  return <DebatesScreen />;
}
