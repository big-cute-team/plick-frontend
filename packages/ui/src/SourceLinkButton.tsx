import { LinkOutIcon } from "./icons";

/**
 * 원문 링크 (KAN-365, 시안 KAN-567). 기사 세부 "원문 보기"·릴 세부 "출처 원문 보기"
 * 자리 공용. 강조색 12/700 글자 뒤에 12px 바깥 링크 아이콘이 붙는 텍스트 링크다.
 *
 * KAN-365의 기자 여럿 팝오버(기자별 원문 목록)는 시안이 기자를 대표 한 명만
 * 표기하는 규칙이라 걷어 냈다. 대표 원문으로 바로 나가고, 대표 링크가 비어 있으면
 * 기자 배열에서 원문을 든 첫 기자의 링크로 대신한다. 둘 다 없으면 아무것도
 * 그리지 않는다.
 *
 * 원문으로 나가는 클릭은 `onOpen`으로 알린다 (KAN-543). 이동을 막지 않고 알리기만
 * 하므로 새 탭 열기도 그대로다. 무엇을 기록할지는 호출부 몫이라 이 컴포넌트는
 * 분석 모듈을 모른다.
 *
 * @param label - 링크 글자 ("원문 보기", "출처 원문 보기")
 * @param sourceUrl - 대표 원문 링크
 * @param reporters - 기사에 실린 기자 전원. 대표 링크가 없을 때의 폴백 출처
 * @param className - 래퍼에 덧붙일 클래스(정렬용 `ml-auto` 등)
 * @param onOpen - 원문 링크를 눌렀을 때. 이동할 주소를 받는다
 */
export function SourceLinkButton({
  label,
  sourceUrl,
  reporters,
  className = "",
  onOpen,
}: {
  label: string;
  sourceUrl: string | null;
  reporters?: { name: string; sourceUrl: string | null }[];
  className?: string;
  onOpen?: (href: string) => void;
}) {
  const href =
    sourceUrl ?? reporters?.find((rep) => rep.sourceUrl)?.sourceUrl ?? null;
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onOpen?.(href)}
      className={`text-label text-accent hover:text-accent-hover flex items-center gap-1 font-bold active:opacity-60 ${className}`}
    >
      {label}
      <LinkOutIcon size={12} />
    </a>
  );
}
