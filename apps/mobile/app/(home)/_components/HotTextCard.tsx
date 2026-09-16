import Link from "next/link";
import { STAGE_META, TEAMS } from "@plick/domain/constants";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import type { HotArticle } from "@plick/domain/types";

/**
 * 사진 없는 핫이슈 카드 — 캐러셀 아래 세 칸을 채운다 (KAN-480).
 *
 * BE가 핫이슈를 원문 사진 유무로 갈라 주면서(KAN-487) 생긴 자리다. 원래는 사진이
 * 없으면 원문 트윗을 통째로 임베드해 캐러셀 카드를 채웠는데({@link HotHeroCard}),
 * 임베드는 로드가 느리고 높이가 제멋대로라 캐러셀에서 가장 말썽이었다. 사진이
 * 없는 기사는 애초에 미디어 카드로 만들 이유가 없어서 텍스트 카드로 뺐다.
 *
 * 그래서 이 카드에는 미디어가 없다. 어두운 스크림도 흰 텍스트도 쓰지 않고 본문
 * 톤의 면(`bg-elevate-2` + `border-border`)을 써서 테마 토큰을 그대로 탄다.
 * 세로로 쌓이는 세 장이라 "지금 올라온 소식" 행과 섞여 보이면 안 되는데,
 * 테두리 있는 카드가 구분선만 있는 리스트 행과 뚜렷이 갈린다.
 *
 * 한 줄 요약(`summaryShort`)은 BE가 못 만든 기사도 있어(null) 있을 때만 깐다.
 * 좁은 폭이라 데스크톱(두 줄)보다 짧게 한 줄만 보여준다.
 *
 * 팀·단계·기자는 캐러셀 카드와 같은 규칙이다 — 팀은 다중이라 첫 팀만 대표로
 * 쓰고, 없으면 그 조각만 빠진다.
 *
 * @param article - 표시할 핫이슈 기사 (사진 없는 그룹)
 */
export function HotTextCard({ article }: { article: HotArticle }) {
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  const stage = article.stage ? STAGE_META[article.stage] : null;

  return (
    <Link
      href={`/articles/${article.id}`}
      aria-label={article.title}
      className="bg-elevate-2 border-border rounded-card flex flex-col gap-1.5 border p-3.5 active:opacity-70"
    >
      {(team || stage) && (
        <div className="flex items-center gap-2">
          {team && (
            <span className="text-caption text-accent font-extrabold">
              {team.name}
            </span>
          )}
          {stage && (
            <span className="text-text-4 text-micro tracking-label font-bold">
              {stage.label}
            </span>
          )}
        </div>
      )}
      <h3 className="text-body-lg text-text tracking-heading line-clamp-2 font-extrabold">
        {article.title}
      </h3>
      {article.summaryShort && (
        <p className="text-body text-text-3 line-clamp-1">
          {article.summaryShort}
        </p>
      )}
      <p className="text-caption text-text-4">
        {article.reporter && (
          <span className="text-text-3 font-semibold">
            {article.reporter.name}
          </span>
        )}
        {article.reporter && " · "}
        <span suppressHydrationWarning>
          {formatRelativeTime(article.publishedAt)}
        </span>
        {" · 조회 "}
        {formatCount(article.views)}
      </p>
    </Link>
  );
}
