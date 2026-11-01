import {
  predictionPickLabel,
  predictionVerdictLabel,
  type MyPrediction,
} from "@plick/domain/prediction";

/**
 * 내 예측 상자 (KAN-696, 시안 가이드 §5.4, 모바일 `PredictionMineBox`의 웹 판). 연한 초록 각진
 * 면에 `내 예측` 라벨, 픽 배지, 적중 여부가 한 줄에 서고 OPEN이면 오른쪽에 수정과 취소 텍스트
 * 버튼이 붙는다. 본문은 15px이다.
 *
 * 작성자 기록(`3전 3적중`)은 요약의 `myPrediction`에 없어 의견 목록(KAN-697)의 `mine`이 붙을 때
 * 더한다.
 *
 * @param mine 내 예측
 * @param teams 홈·원정 팀명(픽 라벨용)
 * @param editable OPEN이면 true. 수정·취소 버튼을 그린다
 * @param onEdit 수정을 눌렀을 때
 * @param onCancel 취소를 눌렀을 때(확인 팝업이 뒤에 선다)
 */
export function PredictionMineBox({
  mine,
  teams,
  editable,
  onEdit,
  onCancel,
}: {
  mine: MyPrediction;
  teams: { home: string; away: string };
  editable: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const verdict = predictionVerdictLabel(mine.result);
  return (
    <div className="bg-accent-soft mt-3.5 p-4">
      <div className="flex items-center gap-2">
        <span className="text-body text-accent font-bold">내 예측</span>
        <span className="bg-bg text-label text-text-strong inline-flex h-5.5 items-center px-1.75 font-bold">
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
        <div className="flex-1" />
        {editable && (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="text-body text-text-2 hover:text-accent focus-visible:outline-accent font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              수정
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-body text-text-2 hover:text-text-strong focus-visible:outline-accent ml-3 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              취소
            </button>
          </>
        )}
      </div>
      <p className="text-body-lg text-text mt-2.5 leading-[1.65] break-words whitespace-pre-wrap">
        {mine.opinion}
      </p>
    </div>
  );
}
