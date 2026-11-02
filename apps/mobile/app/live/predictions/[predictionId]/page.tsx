import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PredictionOpinionScreen } from "@/live/_components/PredictionOpinionScreen";

/** 사람마다 잠금이 다른 유저별 지면이라 색인 가치가 없다. */
export const metadata: Metadata = {
  title: "의견",
  robots: { index: false, follow: false },
};

/**
 * 예측 의견 상세 라우트 (KAN-698). 경기 상세 예측 탭의 의견 행에서 들어온다. 원 의견과 답글은
 * 잠금 여부와 `likedByMe`가 사람마다 달라 서버에서 받지 않고 화면이 마운트 뒤 받는다. 그래서
 * 이 페이지는 id만 넘기는 껍데기다. 쿼리를 읽어 요청마다 렌더(ƒ)되지만 BE 호출이 없어 가볍다.
 *
 * `?match=` 쿼리는 행이 넘긴 경기 id다. 상세 화면이 팀명을 받고 뒤로 갈 곳을 정하는 데 쓰며,
 * 딥링크라 없으면 원 의견 응답의 경기 id를 쓴다.
 */
export default async function PredictionOpinionPage({
  params,
  searchParams,
}: {
  params: Promise<{ predictionId: string }>;
  searchParams: Promise<{ match?: string }>;
}) {
  const id = parseId((await params).predictionId);
  if (id === null) notFound();
  const matchIdHint = parseId((await searchParams).match ?? "");

  return (
    <PredictionOpinionScreen predictionId={id} matchIdHint={matchIdHint} />
  );
}

/** 경로·쿼리 값 → id. 0으로 시작하지 않는 숫자열(양의 정수)이 아니거나 안전 정수 밖이면 null. */
function parseId(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}
