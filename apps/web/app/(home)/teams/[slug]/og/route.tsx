/**
 * 팀 허브 동적 OG 이미지 (KAN-351) — `GET /teams/{slug}/og`.
 *
 * 라우트 핸들러인 이유는 기사 OG(`articles/[postId]/og/route.tsx`)와 같다 —
 * 동적 세그먼트의 파일 컨벤션은 URL에 빌드 해시가 붙어 모바일 앱이 가리킬 수
 * 없다. 모바일 팀 허브와 웹 팀별 기사 목록(`/articles/teams/{slug}`)도 이
 * URL을 og:image로 명시한다.
 *
 * 팀 허브는 팀 검색어의 랜딩이라 공유 카드도 팀 아이덴티티(로고·컬러)를 입힌다.
 * 기사 카드와 같은 템플릿에서 배지 없이 로고만 더 선명하게 올린다. 모르는
 * slug는 페이지가 notFound()로 떨어지지만 이미지 URL은 따로 열릴 수 있어
 * 브랜드 폴백 카드를 내려보낸다.
 */
import { ImageResponse } from "next/og";
import { TEAM_BY_SLUG, TEAM_FULL_NAMES } from "@plick/domain/constants";
import {
  OG_HEIGHT,
  OG_WIDTH,
  OgCard,
  TEAM_OG_COLORS,
} from "@/_components/OgCard";
import { loadOgFont, loadTeamLogo } from "@/_utils/og-assets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const code = TEAM_BY_SLUG[slug];

  const [font, logo] = await Promise.all([
    loadOgFont(),
    code ? loadTeamLogo(code) : Promise.resolve(null),
  ]);

  return new ImageResponse(
    code ? (
      <OgCard
        title={`${TEAM_FULL_NAMES[code]} 이적 루머`}
        teamColor={TEAM_OG_COLORS[code]}
        logoSrc={logo}
        logoOpacity={0.5}
      />
    ) : (
      <OgCard title="프리미어리그 소식을 릴스로" showTagline={false} />
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [{ name: "Pretendard", data: font, weight: 600, style: "normal" }],
      // 팀 카드는 내용이 사실상 고정이지만 로고·문구 교체를 하루 안에 반영하도록 상한을 둔다
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
