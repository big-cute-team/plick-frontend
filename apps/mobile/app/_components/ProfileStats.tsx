/**
 * 프로필 숫자 상자 (KAN-567, 시안 프로필). 라벨 11과 값 17/900을 네 칸으로
 * 놓는다. 팀은 순위·승점·전적·득실, 선수는 경기·골·도움·평점이다. 전적처럼
 * 긴 값이 한 줄을 지키도록 시안의 `auto auto minmax(max-content,1fr) auto`
 * 그리드를 그대로 쓰고 값은 줄바꿈하지 않는다.
 *
 * 팀 프로필과 인물 프로필이 같이 쓴다.
 *
 * @param items 라벨과 값. 네 개가 기본이지만 있는 값만 넘겨도 된다
 */
export function ProfileStats({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <dl
      className="bg-elevate-2 rounded-card grid gap-x-3.5 gap-y-2 p-3.5"
      style={{ gridTemplateColumns: "auto auto minmax(max-content, 1fr) auto" }}
    >
      {items.map(({ label, value }) => (
        <div key={label} className="flex min-w-0 flex-col gap-1.25">
          <dt className="text-caption text-text-3">{label}</dt>
          <dd className="text-title tracking-title text-text-strong leading-tight font-black whitespace-nowrap">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
