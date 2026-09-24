/**
 * 급상승 상자의 빈 순위 줄 (KAN-555) — 순위 번호와 `-`만 있다.
 *
 * 이슈 랭킹이 상자 줄 수보다 짧을 때 남는 자리를 채운다. KAN-523에서는 이슈가
 * 3건 미만이면 상자를 통째로 구단 랭킹으로 바꿨는데, 그러면 이슈가 있어도 화면에
 * 안 보이고 "구단 순위"가 왜 뜨는지 문의만 생겼다. 이제 이슈는 있는 만큼 그리고
 * 나머지 순위는 비워 둔다 — 상자의 높이는 그대로고, 집계가 아직 덜 찼다는
 * 것도 보인다.
 *
 * 번호는 상위권 자리라도 accent로 세우지 않는다({@link TrendingRow}와 다른
 * 점). 비어 있는 자리에 강조할 것이 없어서 번호와 `-` 모두 흐린 톤이다.
 *
 * @param rank 이 줄의 순위. 1부터 시작한다
 */
export function TrendingEmptyRow({ rank }: { rank: number }) {
  return (
    <li className="border-border-soft border-b">
      <div className="flex h-8.25 items-center gap-2.5" aria-label="순위 없음">
        <span className="text-body text-text-4 w-3.5 shrink-0 font-black">
          {rank}
        </span>
        <span className="text-label-lg text-text-4 min-w-0 flex-1">-</span>
      </div>
    </li>
  );
}
