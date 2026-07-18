import Link from "next/link";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { STAGE_META, TEAMS } from "@plick/domain/constants";
import type { FeedPost } from "@plick/domain/types";

/**
 * "함께 보면 좋은 기사" 카드 — 사진(placeholder) 위 스크림 + 팀·제목·기자.
 *
 * 홈 핫이슈 카드(HotCard)와 같은 미디어 스크림 패턴이지만, 기사 세부 하단
 * 3열 추천 행 전용이라 제목 스케일(text-body-lg)·비율(16:10)이 달라 따로 둔다.
 * 클릭하면 해당 기사 세부(`/articles/[postId]`)로 이동한다.
 */
export function SuggestedArticleCard({ post }: { post: FeedPost }) {
  const team = TEAMS[post.team];
  return (
    <Link
      href={`/articles/${post.id}`}
      className="rounded-hero focus-visible:outline-accent group block aspect-[16/10] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <MediaThumb colorVar={team.colorVar} className="rounded-hero h-full">
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-4 pt-12 pb-4"
          style={{
            backgroundImage:
              "linear-gradient(to top, color-mix(in srgb, var(--plk-scrim) 92%, transparent) 0%, color-mix(in srgb, var(--plk-scrim) 50%, transparent) 55%, transparent 100%)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-caption text-media-on font-extrabold">
              {team.name}
            </span>
            {post.stage === "RUMOUR" && (
              <span className="text-media-on-dim text-micro tracking-label font-bold">
                {STAGE_META[post.stage].label}
              </span>
            )}
          </div>
          <h3 className="text-body-lg text-media-on tracking-heading line-clamp-1 font-extrabold">
            {post.title}
          </h3>
          <p className="text-caption">
            <span className="text-media-on/85 font-semibold">
              {post.reporter.name}
            </span>
            <span className="text-media-on-dim">{` · ${post.timeLabel}`}</span>
          </p>
        </div>
      </MediaThumb>
    </Link>
  );
}
