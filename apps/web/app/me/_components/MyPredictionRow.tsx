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
 * 내 예측 기록 한 행 (KAN-702, 시안 가이드 §5.8, 홈 v2 시안 669-676행). 그리드 한 줄에 홈 엠블럼 20,
 * 제목 `맨유 1 - 2 맨시티`(정산 전은 `vs`), `내 예측 맨시티 승`, 오른쪽 정렬 결과(`킥오프 전`, `경기 중`,
 * `적중`, `빗나감`, `기록 제외`)다. 적중만 강조색이고 빗나감은 빨강이 아니라 회색이다(가이드 §6). 시안
 * 칸 폭(40, 1fr, 160, 80)은 rem으로 옮겼고, `sm` 아래에서는 내 예측 줄을 제목 아래로 내려 두 줄로 접는다.
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
      className="border-border-soft hover:bg-elevate focus-visible:outline-accent grid min-h-11 grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-center gap-y-1 border-b py-1.75 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 sm:grid-cols-[2.5rem_minmax(0,1fr)_10rem_5rem]"
    >
      <span className="row-span-2 flex justify-center sm:row-span-1">
        <LiveCrest team={entry.home} size={20} decorative />
      </span>
      <span className="text-body text-text-strong min-w-0 truncate font-medium tabular-nums">
        {myPredictionTitle(entry)}
      </span>
      <span className="text-label text-text-3 col-start-2 min-w-0 truncate sm:col-start-auto">
        {myPredictionPickLine(entry)}
      </span>
      <span
        className={`text-label-lg col-start-3 row-start-1 text-right font-bold sm:col-start-auto sm:row-start-auto ${
          result.tone === "accent" ? "text-accent" : "text-text-4"
        }`}
      >
        {result.text}
      </span>
    </Link>
  );
}
