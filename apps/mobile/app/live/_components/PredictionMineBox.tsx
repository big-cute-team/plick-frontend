import {
  predictionPickLabel,
  predictionVerdictLabel,
  type MyPrediction,
} from "@plick/domain/prediction";

/**
 * 내 예측 상자 (KAN-696, 시안 가이드 §5.4). 연한 초록 면(radius 16)에 `내 예측` 초록 라벨, 픽
 * 배지, 적중 여부, 본문이다. OPEN에서만 오른쪽에 수정과 취소 텍스트 버튼이 선다. 작은 글자 버튼은
 * 세로 패딩으로 터치 목표를 44px까지 넓힌다.
 *
 * 작성자 기록(`3전 3적중`)은 요약의 `myPrediction`에 없고 의견 목록 첫 페이지의 `mine`에 실려
 * 온다(KAN-697). 그래서 문자열로 따로 받고 아직 없으면 비워 둔다. 앱은 `내 예측` 라벨 옆에 선다.
 *
 * @param mine 내 예측
 * @param record 기록 표기(`formatPredictionRecord`). 목록을 아직 못 받았으면 null
 * @param teams 홈·원정 팀명(픽 라벨용)
 * @param editable OPEN이면 true. 수정·취소 버튼을 그린다
 * @param onEdit 수정을 눌렀을 때
 * @param onCancel 취소를 눌렀을 때(확인 시트가 뒤에 선다)
 */
export function PredictionMineBox({
  mine,
  record = null,
  teams,
  editable,
  onEdit,
  onCancel,
}: {
  mine: MyPrediction;
  record?: string | null;
  teams: { home: string; away: string };
  editable: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const verdict = predictionVerdictLabel(mine.result);
  return (
    <div className="bg-accent-soft rounded-card mt-3 p-3.5">
      <div className="flex items-center gap-1.5">
        <span className="text-label text-accent shrink-0 font-bold whitespace-nowrap">
          내 예측
        </span>
        {record && (
          <span className="text-label text-text-3 truncate tabular-nums">
            {record}
          </span>
        )}
        <div className="flex-1" />
        {editable && (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="text-label text-text-2 -my-3 px-1.5 py-3 font-medium active:opacity-60"
            >
              수정
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-label text-text-2 -my-3 py-3 pl-1.5 font-medium active:opacity-60"
            >
              취소
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <span className="bg-bg rounded-badge text-label text-text-strong inline-flex h-5.5 items-center px-1.75 font-bold">
          {predictionPickLabel(mine.pick, teams)}
        </span>
        {verdict && (
          <span
            className={`text-label font-bold ${
              verdict === "적중" ? "text-accent" : "text-text-4"
            }`}
          >
            {verdict}
          </span>
        )}
      </div>
      <p className="text-body-md text-text mt-2 leading-relaxed break-words whitespace-pre-wrap">
        {mine.opinion}
      </p>
    </div>
  );
}
