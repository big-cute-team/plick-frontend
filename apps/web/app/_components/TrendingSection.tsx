import Link from "next/link";
import type { HotArticle } from "@plick/domain/types";

/**
 * "실시간 인기" 랭킹 섹션 — 사이드바 카드 한 장.
 *
 * 전용 BE 엔드포인트가 없어 핫이슈와 같은 `GET /api/v1/articles/hot`
 * (최근 48시간 조회수 상위) 데이터를 그대로 쓴다(KAN-338). 홈과 기사 세부
 * 사이드바가 공용한다 — 각 페이지가 이미 받아 둔 목록을 prop으로 내려받아
 * 추가 fetch가 없다.
 *
 * @param articles - 핫이슈 목록. 로드 실패면 null — 실패 문구를 보여준다.
 */
export function TrendingSection({
  articles,
}: {
  articles: HotArticle[] | null;
}) {
  return (
    <section className="bg-elevate-2 border-border rounded-card p-edge border">
      <h3 className="text-gnb text-text pb-1.5 font-extrabold">실시간 인기</h3>
      {articles === null ? (
        <p className="text-body text-text-4 py-4 text-center">
          인기 소식을 불러오지 못했어요.
        </p>
      ) : articles.length === 0 ? (
        <p className="text-body text-text-4 py-4 text-center">
          아직 인기 소식이 없어요.
        </p>
      ) : (
        <ol>
          {articles.map((article, i) => (
            <li
              key={article.id}
              className="border-border border-b last:border-b-0"
            >
              <Link
                href={`/articles/${article.id}`}
                className="group focus-visible:outline-accent flex items-start py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <span className="text-tab text-accent w-7 shrink-0">
                  {i + 1}
                </span>
                <span className="text-body text-text group-hover:text-accent line-clamp-2 min-w-0 flex-1 transition-colors">
                  {article.title}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
