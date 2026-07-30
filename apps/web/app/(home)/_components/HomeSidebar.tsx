import Link from "next/link";
import type { HotArticle } from "@plick/domain/types";

/**
 * 홈 우측 사이드바 — 실시간 인기 랭킹. 스크롤 시 상단에 고정된다.
 *
 * 실시간 인기는 전용 BE 엔드포인트가 없어 핫이슈와 같은
 * `GET /api/v1/articles/hot`(최근 48시간 조회수 상위) 데이터를 그대로 쓴다
 * (KAN-338). 홈 페이지가 핫이슈 섹션용으로 받아 둔 것을 prop으로 내려받아
 * 추가 fetch가 없다. 마이팀 카드는 대응 기능이 없어 걷어냈다.
 *
 * @param articles - 핫이슈 목록. 로드 실패면 null — 실패 문구를 보여준다.
 * @param className - 래퍼에 덧붙일 클래스(모바일에서 `hidden`으로 감추는 등)
 */
export function HomeSidebar({
  articles,
  className = "",
}: {
  articles: HotArticle[] | null;
  className?: string;
}) {
  return (
    <aside className={`sticky top-22 flex-col gap-4 self-start ${className}`}>
      <section className="bg-elevate-2 border-border rounded-card p-edge border">
        <h3 className="text-gnb text-text pb-1.5 font-extrabold">
          실시간 인기
        </h3>
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
    </aside>
  );
}
