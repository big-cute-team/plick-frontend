import { getHotArticles } from "@plick/core/articles";
import { withTweetPhotos } from "@plick/core/tweet-media";
import type { HotArticle } from "@plick/domain/types";
import { HotCard } from "./HotCard";
import { HotCarousel } from "./HotCarousel";

/**
 * 핫이슈 섹션. `GET /api/v1/articles/hot`을 단발로 받는다 (KAN-324, KAN-338). 팀 탭을
 * 골라도 핫이슈는 전체 기준 그대로라 팀 허브에서도 같은 데이터를 그린다. 응답이 원문
 * 사진 유무로 갈린 두 목록인데(KAN-480) 사진 있는 기사만 세 장씩 보이는 한 줄
 * 캐러셀에 깐다({@link HotCarousel}, KAN-569).
 *
 * `HomeScreen`이 Suspense로 감싸 스트리밍한다 (KAN-602). 받는 동안은
 * `HotSectionSkeleton`이 서고, 실패해도 페이지를 떨어뜨리지 않고 문구만 둔다.
 */
export async function HotSection() {
  let cards: HotArticle[] | null = null;
  try {
    const hot = await getHotArticles();
    /* 사진 카드는 사진이 주인공이라, 대표 이미지가 빈 카드는 원문 게시물의
       제일 큰 사진으로 메운다 (KAN-484). 그래도 사진이 없는 카드는 뺀다 (KAN-569) */
    cards = (await withTweetPhotos(hot.withImage)).filter((a) => a.imageUrl);
  } catch (error) {
    console.error("[home] 핫이슈 로드 실패:", error);
  }

  return (
    <section>
      {cards === null || cards.length === 0 ? (
        <>
          <h2 className="text-body-lg text-text-strong pb-2.75 font-black tracking-tight">
            핫이슈
          </h2>
          <p className="text-body text-text-4 py-8 text-center">
            {cards === null
              ? "핫이슈를 불러오지 못했어요"
              : "아직 핫이슈가 없어요"}
          </p>
        </>
      ) : (
        <HotCarousel
          title={
            <h2 className="text-body-lg text-text-strong font-black tracking-tight">
              핫이슈
            </h2>
          }
        >
          {cards.map((article, i) => (
            <HotCard
              key={article.id}
              article={article}
              rank={i}
              fetchPriority={i < 3 ? "high" : "low"}
            />
          ))}
        </HotCarousel>
      )}
    </section>
  );
}
