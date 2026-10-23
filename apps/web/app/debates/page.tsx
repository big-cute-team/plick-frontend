import type { Metadata } from "next";
import { PAGE_DESCRIPTIONS } from "@plick/domain/brand";
import { MOBILE_ALTERNATE_MEDIA, MOBILE_SITE_URL } from "@/_constants/site";
import { DebatesScreen } from "./_components/DebatesScreen";

/**
 * 익명 ISR (KAN-667, 모바일 KAN-664·ADR 0200). 내 좋아요·투표는 화면이 뜬 뒤 내 상태 캐시가
 * 얹고, 이 페이지는 누구에게나 같은 것만 서버에서 받는다. 피드의 데이터 fetch가 익명 60초
 * 캐시라 같은 주기다. `?tab=`은 전에 여기서 `searchParams`로 읽었는데 그러면 요청마다
 * 렌더가 돼서 탭 줄과 목록이 브라우저에서 읽게 옮겼다.
 */
export const revalidate = 60;

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

/** 투표 라우트 — 화면 본체는 {@link DebatesScreen}이 그린다 (KAN-418). */
export default function DebatesPage() {
  return <DebatesScreen />;
}
