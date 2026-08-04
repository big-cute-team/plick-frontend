/**
 * 기사별 동적 OG 이미지 (KAN-351) — `GET /articles/{id}/og`.
 *
 * 파일 컨벤션(`opengraph-image.tsx`)이 아니라 라우트 핸들러인 이유: 동적
 * 세그먼트의 파일 컨벤션은 서빙 URL에 빌드마다 달라질 수 있는 해시 접미사가
 * 붙는다(`opengraph-image-1r0o8c`). 모바일 앱이 이 이미지를 og:image로
 * 가리켜야 하는데(자산을 canonical 도메인 한쪽에만 두는 결정) 다른 앱의 빌드
 * 해시는 알 수 없으므로, 예측 가능한 고정 URL이 필요하다. 그래서 og:image
 * 태그는 자동 배선 대신 양 앱 `generateMetadata`가 이 URL을 명시한다.
 *
 * 발행 기사의 `imageUrl`이 전건 null이라(전략 문서 Step 2-4) 기사 이미지 대신
 * 대표 팀 컬러·로고 + 제목 + 루머 단계 배지로 카드를 그린다. 데이터 공백을
 * 디자인으로 메꾸는 접근이다.
 *
 * 기사를 못 받으면(삭제된 딥링크 등) 500 대신 브랜드 폴백 카드를 내려보낸다 —
 * 크롤러에게 OG 이미지 없음보다 기본 카드가 낫다. 폴백이 오래 캐시되지 않게
 * 캐시 수명은 짧게 잡는다.
 */
import { ImageResponse } from "next/og";
import { getArticle } from "@plick/core/articles";
import { STAGE_META } from "@plick/domain/constants";
import { truncateText } from "@plick/domain/format";
import type { ArticleDetail } from "@plick/domain/types";
import {
  OG_HEIGHT,
  OG_WIDTH,
  OgCard,
  TEAM_OG_COLORS,
} from "@/_components/OgCard";
import { loadOgFont, loadTeamLogo } from "@/_utils/og-assets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;

  // 메타데이터와 같은 이유로 토큰 없이 부른다 — OG는 유저 무관이다 (KAN-346)
  let article: ArticleDetail | null = null;
  try {
    article = await getArticle(postId);
  } catch {
    // 없는 기사·BE 장애 — 아래에서 브랜드 폴백 카드로 떨어진다
  }

  const team = article?.teams[0] ?? null;
  const [font, logo] = await Promise.all([
    loadOgFont(),
    team ? loadTeamLogo(team) : Promise.resolve(null),
  ]);

  return new ImageResponse(
    article ? (
      <OgCard
        title={truncateText(article.title, 80)}
        badge={article.stage ? STAGE_META[article.stage].label : null}
        teamColor={team ? TEAM_OG_COLORS[team] : null}
        logoSrc={logo}
      />
    ) : (
      <OgCard title="프리미어리그 소식을 릴스로" showTagline={false} />
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [{ name: "Pretendard", data: font, weight: 600, style: "normal" }],
      // ImageResponse 기본값(1년 immutable)은 폴백 카드까지 오래 박제한다 — 짧게 줄인다
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
