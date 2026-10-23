import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { WEB_SITE_URL } from "@/_constants/site";
import { DebatesScreen } from "./_components/DebatesScreen";

/**
 * 익명 ISR (KAN-664, ADR 0200). 내 좋아요·투표는 화면이 뜬 뒤 내 상태 캐시가 얹고, 이 페이지는
 * 누구에게나 같은 것만 서버에서 받는다. 피드의 데이터 fetch가 익명 60초 캐시라 같은 주기다.
 */
export const revalidate = 60;

/**
 * 투표 리스트 메타데이터 (KAN-418). canonical이 대응 데스크톱 URL을 가리키는
 * 이유는 기사 목록(KAN-386)과 같다. 시그널을 한 도메인에 모은다.
 */
export const metadata: Metadata = {
  title: "투표",
  description: PAGE_DESCRIPTIONS.debates,
  alternates: { canonical: `${WEB_SITE_URL}/debates` },
};

/** 투표 리스트 라우트. 화면 본체는 {@link DebatesScreen}이 그린다 (KAN-418). */
export default function DebatesPage() {
  return <DebatesScreen />;
}
