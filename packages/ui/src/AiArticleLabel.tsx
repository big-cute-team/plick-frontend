import { useId } from "react";
import { SparkleIcon } from "./icons";

/**
 * 기사 세부의 고정 부제목 "실시간 AI 기사" (KAN-742). 기자와 시각 줄 밑에 두 앱이 같은 모양으로 쓴다.
 * 아이콘과 글자 모두 보라색에서 핑크로 넘어가는 고정 그라데이션이다.
 *
 * 글자는 `background-clip: text`로 칠한다. SVG에는 이 방식이 듣지 않아 아이콘은 자체 그라데이션을
 * 쓴다. 그라데이션 id는 `useId`로 만든다. 같은 id가 숨겨진 사본에 먼저 있으면 그 정의를 참조해
 * 아이콘이 칠해지지 않는다.
 *
 * @param className - 여백 등 호출부가 덧붙일 클래스
 */
export function AiArticleLabel({ className = "" }: { className?: string }) {
  const gradientId = useId();

  return (
    <p
      className={`text-label-lg flex items-center gap-1 font-black ${className}`}
    >
      <SparkleIcon size={15} gradientId={gradientId} className="shrink-0" />
      <span className="from-ai to-ai-pink bg-linear-to-r bg-clip-text text-transparent">
        실시간 AI 기사
      </span>
    </p>
  );
}
