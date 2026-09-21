import { notFound, permanentRedirect } from "next/navigation";
import { TEAM_CODES } from "@plick/domain/constants";
import { teamProfilePath } from "@plick/domain/format";

/**
 * 옛 라이브 팀 스쿼드 URL — 팀 프로필로 보낸다 (KAN-507).
 *
 * 선수단은 팀 프로필 한 장으로 합쳤다. 라우트를 지우지 않고 리다이렉트로 남기는
 * 이유는 모바일과 같다 — 순위표 레일이 걸어 둔 링크를 한 번에 다 고치지 않아도
 * 되고, 색인되거나 공유된 주소가 404로 죽지 않는다. `permanentRedirect`의 308은
 * 크롤러에게 색인을 새 URL로 옮기라는 뜻이다.
 *
 * 빅6 밖 id는 옮길 곳이 없어 그대로 not-found다.
 */
export default async function LiveTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const code = /^\d+$/.test(teamId) ? TEAM_CODES[Number(teamId)] : undefined;
  if (!code) notFound();

  permanentRedirect(teamProfilePath(code));
}
