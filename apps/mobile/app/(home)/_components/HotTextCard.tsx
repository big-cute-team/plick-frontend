import Link from "next/link";
import { STAGE_META } from "@plick/domain/constants";
import { formatCount } from "@plick/domain/format";
import type { HotArticle } from "@plick/domain/types";
import { HotBadge } from "@plick/ui/HotBadge";

/**
 * 사진 없는 핫이슈 카드 — 캐러셀 아래에서 한 장씩 가로로 넘긴다 (KAN-480, KAN-515).
 *
 * BE가 핫이슈를 원문 사진 유무로 갈라 주면서(KAN-487) 생긴 자리다. 원래는 사진이
 * 없으면 원문 트윗을 통째로 임베드해 캐러셀 카드를 채웠는데({@link HotHeroCard}),
 * 임베드는 로드가 느리고 높이가 제멋대로라 캐러셀에서 가장 말썽이었다. 사진이
 * 없는 기사는 애초에 미디어 카드로 만들 이유가 없어서 텍스트 카드로 뺐다.
 *
 * 그래서 이 카드에는 미디어가 없다. 어두운 스크림도 흰 텍스트도 쓰지 않고 본문
 * 톤의 면(`bg-elevate-2` + `border-border`)을 써서 테마 토큰을 그대로 탄다.
 *
 * KAN-515에서 게시판 글 목록처럼 줄였다. 팀 태그 자리에는 깜빡이는 핫이슈 태그를
 * 달고, 기자·시각·조회 줄은 걷고 조회수만 제목 옆 `[X]`로 남겼다. 제목이 두 줄로
 * 잘려도 조회수는 잘리지 않게 제목과 형제로 둔다.
 *
 * 한 줄 요약(`summaryShort`)은 BE가 못 만든 기사도 있어(null) 있을 때만 깐다.
 * 좁은 폭이라 데스크톱(두 줄)보다 짧게 한 줄만 보여준다.
 *
 * @param article - 표시할 핫이슈 기사 (사진 없는 그룹)
 */
export function HotTextCard({ article }: { article: HotArticle }) {
  const stage = article.stage ? STAGE_META[article.stage] : null;

  return (
    <Link
      href={`/articles/${article.id}`}
      aria-label={article.title}
      className="bg-elevate-2 border-border rounded-card flex h-full flex-col gap-1.5 border p-3.5 active:opacity-70"
    >
      <div className="flex items-center gap-2">
        <HotBadge />
        {stage && (
          <span className="text-text-4 text-micro tracking-label font-bold">
            {stage.label}
          </span>
        )}
      </div>
      <div className="flex items-start gap-1.5">
        <h3 className="text-body-lg text-text tracking-heading line-clamp-2 min-w-0 font-extrabold">
          {article.title}
        </h3>
        <span className="text-body-lg text-accent shrink-0 font-extrabold tabular-nums">
          [{formatCount(article.views)}]
        </span>
      </div>
      {article.summaryShort && (
        <p className="text-body text-text-3 line-clamp-1">
          {article.summaryShort}
        </p>
      )}
    </Link>
  );
}
