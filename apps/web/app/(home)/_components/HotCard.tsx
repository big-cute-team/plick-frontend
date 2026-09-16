import Link from "next/link";
import { STAGE_META, TEAMS } from "@plick/domain/constants";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import type { HotArticle } from "@plick/domain/types";
import { TweetEmbed } from "@/_components/TweetEmbed";

/**
 * 핫이슈 카드 — 미디어 위 어두운 스크림 + 흰 텍스트.
 *
 * 원래 히어로(lg)/서브(sm) 그리드용 사이즈 변형이 있었지만, 핫이슈 섹션이
 * 모바일과 같은 캐러셀로 바뀌면서(KAN-338) 단일 스타일로 접었다. 카드 비율은
 * 캐러셀 래퍼(`HotCarousel`의 `slideClassName`)가 정하고 카드는 `h-full`로
 * 채운다.
 *
 * 밀도는 모바일 히어로 카드와 같다(p-4·`text-title`). KAN-480 전에는 lg 이상에서
 * px-6·`text-hero`로 키웠는데, 데스크톱 캐러셀이 네 장을 한 줄에 깔면서 카드가
 * 1200px에서 300px 아래로 줄어 그 스케일이 카드를 넘쳤다.
 *
 * 실계약(KAN-324)으로 갈아타면서 배경이 팀 컬러 placeholder(`MediaThumb`)에서
 * 릴 공용 단색(`bg-reel-bg`)으로 바뀌었다. 모바일이 KAN-297에서 히어로 카드를
 * 그렇게 통일했고 web 릴스도 KAN-323에서 같은 색을 따랐다.
 *
 * 사진(`imageUrl`)이 있으면 카드를 가득 덮고, 없으면 원문 트윗을 사진째
 * 임베드한다 — 모바일 히어로 카드와 같은 폴백이다. 임베드도 사진도 없으면
 * 통일 배경색이 그대로 남는다.
 *
 * KAN-480에서 핫이슈가 사진 유무로 갈렸는데도 이 폴백을 남기는 이유가 있다.
 * BE가 나눈 기준은 원문 X 게시물에 사진이 붙어 있었는지(`raw_articles.media_url`)
 * 이고, 카드가 그리는 `imageUrl`은 기사 대표 이미지(`article_summaries.image_url`)
 * 라 서로 다른 컬럼이다. 그래서 사진 있는 그룹으로 온 기사도 `imageUrl`이 null일
 * 수 있다. 사진이 아예 없는 기사는 이제 캐러셀에 오지 않고 아래 세 칸의
 * `HotTextCard`가 받는다.
 *
 * 임베드는 모바일 히어로와 같은 규칙으로 앉힌다. 카드 가로를 꽉 채우고
 * (기본 max-width 550px는 globals.css에서 푼다), 세로는 카드 전체 높이 기준으로
 * 작으면 가운데에 서고 크면 위에 붙어 넘친 아래쪽이 잘린다
 * (`justify-content: safe center` + `overflow-hidden`) — 본문 자체를 줄이거나
 * 말줄임하지는 않는다(X Display Requirements).
 *
 * 스크림은 이미지 가독성용 고정 값(테마 무관)이고 모바일 히어로와 같은 농도다 —
 * 팀·단계 줄 위까지 확실히 덮어서 임베드 아래쪽이 그 뒤로 자연스럽게 잠긴다
 * (KAN-300). 긴 트윗의 밑부분이 가려지는 모습도 모바일 카드와 같다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 팀
 * 이름 자리를 비운다. 단계·기자도 null이면 그 조각만 빠진다.
 *
 * 카드 전체가 기사 세부(`/articles/[postId]`)로 가는 링크지만, 카드를 `<Link>`로
 * 감싸지는 않는다 — 임베드 안에 `<a>`가 있어서 앵커가 중첩되면 잘못된 HTML이라
 * 하이드레이션이 깨진다. 모바일 히어로처럼 링크를 형제로 깔아 카드를 덮는다.
 * 임베드 내부 상호작용은 전역 CSS에서 꺼뒀으므로(globals.css) 어디를 눌러도
 * 이 링크가 받는다.
 *
 * @param article - 표시할 핫이슈 기사
 */
export function HotCard({
  article,
  fetchPriority = "auto",
}: {
  article: HotArticle;
  /** 첫 화면에 실제로 보이는 카드만 high, 나머지는 low로 대역폭 경합을 줄인다
   *  (KAN-421). 데스크톱은 네 장이 한꺼번에 보이므로 호출부가 앞 네 장을 high로 준다 */
  fetchPriority?: "high" | "low" | "auto";
}) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  const stage = article.stage ? STAGE_META[article.stage] : null;

  return (
    <div className="rounded-hero bg-reel-bg relative h-full overflow-hidden transition-opacity hover:opacity-90">
      {article.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 이미지 호스트가 유동이라 next/image 대신 일반 img (릴·MediaThumb과 같은 이유)
        <img
          src={article.imageUrl}
          alt=""
          /* 캐러셀이 무한 루프용으로 카드를 복제해 두는데, lazy면 옆 칸 복제본이
             화면에 들어오는 순간에야 받기 시작해 빈 카드가 잠깐 스친다.
             홈 최상단이라 어차피 첫 화면 이미지다 (KAN-382) */
          loading="eager"
          fetchPriority={fetchPriority}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        article.sourceUrl && (
          <div className="reel-embed hot-embed absolute inset-0 flex flex-col [justify-content:safe_center]">
            <TweetEmbed url={article.sourceUrl} />
          </div>
        )
      )}

      {/* pt가 스크림 윗선 — 팀·단계 줄보다 조금 위까지만 어둡다 (KAN-300) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 pt-6"
        style={{
          backgroundImage:
            "linear-gradient(to top, var(--plk-scrim) 0%, color-mix(in srgb, var(--plk-scrim) 97%, transparent) 60%, color-mix(in srgb, var(--plk-scrim) 78%, transparent) 85%, transparent 100%)",
        }}
      >
        {(team || stage) && (
          <div className="flex items-center gap-2">
            {team && (
              <span className="text-caption text-media-on font-extrabold">
                {team.name}
              </span>
            )}
            {/* 퍼블리싱 시안(피그마 W1)은 RUMOUR일 때만 단계를 노출했지만, 실계약에선
                단계가 있으면 다 보여준다 — 모바일 히어로 카드와 같게 맞춘 것이다 */}
            {stage && (
              <span className="text-media-on-dim text-micro tracking-label font-bold">
                {stage.label}
              </span>
            )}
          </div>
        )}
        <h3 className="text-media-on tracking-heading text-title line-clamp-2 font-extrabold">
          {article.title}
        </h3>
        <p className="text-caption">
          {article.reporter && (
            <span className="text-media-on/85 font-semibold">
              {article.reporter.name}
            </span>
          )}
          <span className="text-media-on-dim">
            {article.reporter && " · "}
            <span suppressHydrationWarning>
              {formatRelativeTime(article.publishedAt)}
            </span>
            {" · 조회 "}
            {formatCount(article.views)}
          </span>
        </p>
      </div>

      <Link
        href={`/articles/${article.id}`}
        aria-label={article.title}
        className="focus-visible:outline-accent rounded-hero absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
      />
    </div>
  );
}
