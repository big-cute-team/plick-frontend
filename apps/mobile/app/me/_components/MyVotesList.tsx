import { ActivityEmpty } from "./ActivityEmpty";

/**
 * 투표 탭 (KAN-567, 시안 MY 투표 탭). 시안은 내가 투표한 이슈를 투표 카드 sm으로
 * 나열하지만 내 투표 목록 API가 아직 없다. 목데이터를 넣지 않고 빈 상태만 둔다.
 * API가 생기면 이 자리에 `VoteCard` 리스트를 붙인다.
 */
export function MyVotesList() {
  return <ActivityEmpty tab="votes" />;
}
