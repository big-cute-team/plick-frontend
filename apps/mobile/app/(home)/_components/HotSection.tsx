import { getHotArticles } from "@plick/core/articles";
import { withTweetPhotos } from "@plick/core/tweet-media";
import type { HotArticle } from "@plick/domain/types";
import { HotHeroCard } from "./HotHeroCard";
import { HotHeroTrack } from "./HotHeroTrack";

/**
 * 핫이슈 상자. 채운 면 하나에 제목과 사진 카드 한 줄 트랙, 그 아래 위치 손잡이다.
 * 트랙은 두 장씩 보이고 두 장 단위로 스냅한다 (KAN-569, KAN-585).
 *
 * `GET /api/v1/articles/hot`을 단발로 받는다 (KAN-282). 응답이 원문 사진 유무로 갈린
 * 두 목록인데(KAN-480) 사진 있는 기사만 깐다. 사진 없는 기사의 텍스트 카드 페이저는
 * KAN-569에서 뺐다.
 *
 * `HomeScreen`이 Suspense로 감싸 스트리밍한다 (KAN-602). 받는 동안은
 * `HotSectionSkeleton`이 서고, 실패해도 페이지를 떨어뜨리지 않고 상자 안에 문구만 둔다.
 */
export async function HotSection() {
  let heroes: HotArticle[] | null = null;
  try {
    const hot = await getHotArticles();
    /* 사진 카드는 사진이 주인공이라, 대표 이미지가 빈 카드는 원문 게시물의
       제일 큰 사진으로 메운다 (KAN-484). 그래도 사진이 없는 카드는 뺀다 (KAN-569) */
    heroes = (await withTweetPhotos(hot.withImage)).filter((a) => a.imageUrl);
  } catch (error) {
    console.error("[home] 핫이슈 로드 실패:", error);
  }

  return (
    <section className="px-edge pt-3">
      <div className="bg-elevate-2 rounded-card py-3.25">
        <h2 className="text-body-lg text-text-strong tracking-section px-3 pb-2.5 font-black">
          핫이슈
        </h2>
        {heroes === null ? (
          <p className="text-body text-text-4 px-3 py-8 text-center">
            핫이슈를 불러오지 못했어요
          </p>
        ) : heroes.length === 0 ? (
          <p className="text-body text-text-4 px-3 py-8 text-center">
            아직 핫이슈가 없어요
          </p>
        ) : (
          <HotHeroTrack count={heroes.length}>
            {heroes.map((article, i) => (
              <HotHeroCard
                key={article.id}
                article={article}
                rank={i}
                fetchPriority={i < 2 ? "high" : "low"}
              />
            ))}
          </HotHeroTrack>
        )}
      </div>
    </section>
  );
}
