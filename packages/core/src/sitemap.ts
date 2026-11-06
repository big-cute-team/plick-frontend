/**
 * @file 사이트맵에 싣는 동적 URL의 재료 수집 (KAN-738) - web·mobile 공용.
 *
 * 기사와 경기는 계속 늘어서 사이트맵이 요청 시점에 BE를 걸어와야 새 글이 자동으로 실린다.
 * KAN-346 때는 두 앱 `sitemap.ts`가 같은 루프를 따로 들고 있었는데, KAN-652에서 지웠다가
 * 되살리면서 여기로 모았다(ADR 0011 게이트 C). 앱은 받은 id로 자기 도메인 URL만 조립한다.
 *
 * 두 함수 모두 던지지 않는다. 사이트맵이 500이면 크롤러가 사이트 전체를 의심하므로 BE가
 * 죽어 있어도 모은 데까지만 돌려주고 로그를 남긴다.
 */

import { TEAM_IDS, TEAM_ORDER } from "@plick/domain/constants";
import { ARTICLES_MAX_PAGE_SIZE, getArticles } from "./articles";
import { getTeamFixtures } from "./team-profile";

/**
 * 기사 URL 상한. 사이트맵 규격 한도(파일당 50,000 URL)에서 정적 라우트와 경기 몫을 빼고
 * 여유를 둔 값이다 (KAN-380).
 *
 * 여기 걸리면 오래된 기사가 사이트맵에서 소리 없이 빠진다. 조용히 잘리는 게 제일 위험한
 * 실패 방식이라 {@link collectSitemapArticles}가 로그를 남긴다.
 */
export const SITEMAP_MAX_ARTICLES = 45000;

/**
 * 인덱스 분할을 검토해야 하는 선. 상한과 별개로 먼저 경고하는 이유는 목록 API가 커서
 * 페이징이라 한 페이지씩(최대 30건) 걸어와야 해서다. 기사 수에 비례해 왕복이 늘어서
 * 상한에 닿기 한참 전에 응답 시간이 먼저 문제가 된다.
 *
 * 값의 근거는 실측이다 (KAN-380). 기사 1,700건이 배포 환경에서 1.8초였다. 5,000건이면
 * 5초를 넘길 것으로 보는데, 사이트맵이 느리면 크롤러가 가져오기를 포기한다. 분할은 BE
 * 선행 작업이 필요하다. 목록 응답에 총 건수가 없어 커서를 처음부터 다시 걷지 않고는
 * "N번째 조각"을 열 수 없다.
 */
export const SITEMAP_SPLIT_REVIEW_THRESHOLD = 5000;

/**
 * 사이트맵 기사 한 줄. `publishedAt`이 lastModified가 된다. 날짜로 못 읽는 값이면 null이고
 * 앱은 그 기사의 lastModified만 뺀다. Invalid Date가 사이트맵 직렬화(`toISOString`)까지
 * 가면 RangeError로 사이트맵 전체가 500이 되기 때문이다.
 */
export interface SitemapArticle {
  id: string;
  publishedAt: Date | null;
}

/**
 * BE 기사 전건을 커서 페이징으로 걸어와 id와 발행 시각만 모은다. 최신순이다.
 *
 * 목록 fetch는 `apiFetch`가 익명 GET에 revalidate를 명시해 데이터 캐시(60초)를 탄다.
 * 그래서 사이트맵 라우트가 `force-dynamic`이어도 크롤러가 연달아 받을 때 BE 왕복이
 * 반복되지 않는다 (KAN-380).
 *
 * @param max 모을 기사 수 상한. 테스트가 작은 값으로 잘림 동작을 본다
 */
export async function collectSitemapArticles(
  max: number = SITEMAP_MAX_ARTICLES,
): Promise<SitemapArticle[]> {
  const articles: SitemapArticle[] = [];
  try {
    let cursor: string | null = null;
    do {
      const page = await getArticles({ size: ARTICLES_MAX_PAGE_SIZE, cursor });
      for (const article of page.items) {
        const publishedAt = new Date(article.publishedAt);
        articles.push({
          id: article.id,
          publishedAt: Number.isNaN(publishedAt.getTime()) ? null : publishedAt,
        });
      }
      cursor = page.nextCursor;
    } while (cursor && articles.length < max);

    if (cursor) {
      console.error(
        `[sitemap] 기사 상한(${max})에서 잘렸다. 이 뒤 기사는 사이트맵에 없다. 인덱스 분할이 필요하다.`,
      );
    } else if (articles.length >= SITEMAP_SPLIT_REVIEW_THRESHOLD) {
      console.warn(
        `[sitemap] 기사 ${articles.length}건. 인덱스 분할 검토선(${SITEMAP_SPLIT_REVIEW_THRESHOLD}) 초과. BE 총 건수 또는 사이트맵 전용 엔드포인트가 선행 과제다.`,
      );
    }
  } catch (error) {
    console.error(
      `[sitemap] 기사 목록 로드 실패. 모은 ${articles.length}건까지만 응답:`,
      error,
    );
  }
  return articles.slice(0, max);
}

/**
 * 빅6 여섯 팀의 시즌 경기 id를 모은다. 예정과 종료 둘 다이고 중복은 접는다.
 *
 * 경기 목록 API는 날짜 하나씩만 받아 시즌 전체를 훑으려면 수백 번을 불러야 한다. 팀
 * 시즌 경기(`GET /teams/{id}/fixtures`)는 여섯 번이면 BE가 상세를 내주는 경기(빅6가
 * 낀 경기) 전부가 온다. 팀 프로필 화면이 이미 쓰는 호출이라 캐시도 같이 쓴다. 한 팀이
 * 실패하면 그 팀 몫만 빠진다. 빅6끼리 붙는 경기는 양쪽 목록에 다 있어 대부분 살아남는다.
 */
export async function collectSitemapMatchIds(): Promise<number[]> {
  const results = await Promise.allSettled(
    TEAM_ORDER.map((code) => getTeamFixtures(TEAM_IDS[code])),
  );
  const ids = new Set<number>();
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      console.error(
        `[sitemap] ${TEAM_ORDER[index]} 시즌 경기 로드 실패. 그 팀 경기는 빠진다:`,
        result.reason,
      );
      continue;
    }
    for (const fixture of [...result.value.upcoming, ...result.value.results]) {
      ids.add(fixture.matchId);
    }
  }
  return [...ids];
}
