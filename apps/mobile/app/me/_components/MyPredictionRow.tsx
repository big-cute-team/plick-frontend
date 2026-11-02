import Link from "next/link";
import {
  matchPredictionPath,
  myPredictionPickLine,
  myPredictionResultLabel,
  myPredictionTitle,
  type MyPredictionEntry,
} from "@plick/domain/prediction";
import { LiveCrest } from "@plick/ui/LiveCrest";

/**
 * 내 예측 기록 한 행 (KAN-702, 시안 가이드 §5.8, 앱 v2 시안 1449-1459행). 홈 엠블럼 36, 제목
 * `맨유 1 - 2 맨시티`(정산 전은 `vs`), 둘째 줄 `내 예측 맨시티 승`, 오른쪽에 결과(`킥오프 전`, `경기 중`,
 * `적중`, `빗나감`, `기록 제외`)다. 적중만 강조색이고 빗나감은 빨강이 아니라 회색이다(가이드 §6).
 *
 * 행을 누르면 그 경기 상세의 예측 탭으로 간다(가이드 §3 "MY 기록 행에서 들어오면 예측 탭으로 바로
 * 연다"). 정산된 경기도 예측 탭이 맨 끝에 있어 같은 경로다(티켓 "항목을 누르면 경기 상세로 이동").
 *
 * @param entry 내 예측 기록 한 행
 */
export function MyPredictionRow({ entry }: { entry: MyPredictionEntry }) {
  const result = myPredictionResultLabel(entry);

  return (
    <Link
      href={matchPredictionPath(entry.matchId)}
      className="border-border-soft flex items-center gap-2.5 border-b py-3 active:opacity-60"
    >
      <LiveCrest team={entry.home} size={36} decorative />
      <span className="min-w-0 flex-1">
        <span className="text-body-md text-text-strong block truncate leading-snug font-medium tabular-nums">
          {myPredictionTitle(entry)}
        </span>
        <span className="text-label text-text-3 mt-1 block truncate">
          {myPredictionPickLine(entry)}
        </span>
      </span>
      <span
        className={`text-label-lg shrink-0 font-bold ${
          result.tone === "accent" ? "text-accent" : "text-text-4"
        }`}
      >
        {result.text}
      </span>
    </Link>
  );
}
