import Link from "next/link";
import { STAGE_META, TEAMS } from "@plick/domain/constants";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import type { HotArticle } from "@plick/domain/types";

/**
 * 사진 없는 핫이슈 카드 — 캐러셀 아래 세 칸을 채운다 (KAN-480).
 *
 * BE가 핫이슈를 원문 사진 유무로 갈라 주면서(KAN-487) 생긴 자리다. 원래는 사진이
 * 없으면 원문 트윗을 통째로 임베드해 캐러셀 카드를 채웠는데({@link HotCard}),
 * 임베드는 로드가 느리고 높이가 제멋대로라 캐러셀에서 가장 말썽이었다. 사진이
 * 없는 기사는 애초에 미디어 카드로 만들 이유가 없어서 텍스트 카드로 뺐다.
 *
 * 그래서 이 카드에는 미디어가 없다. 어두운 스크림도 흰 텍스트도 쓰지 않고
 * 사이드바 랭킹 카드와 같은 면(`bg-elevate-2` + `border-border`)을 쓴다 —
 * 본문 톤이라 테마 토큰을 그대로 탄다.
 *
 * 한 줄 요약(`summaryShort`)은 BE가 못 만든 기사도 있어(null) 있을 때만 깐다.
 * 요약이 빠져도 제목 줄과 메타 줄이 그대로라 카드 높이는 그리드가 맞춘다
 * (`h-full` + `mt-auto`).
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
    <article className="bg-elevate-2 border-border rounded-card hover:border-border-strong relative flex h-full flex-col gap-1.5 border p-4 transition-colors">
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
        <p className="text-body text-text-3 line-clamp-2">
          {article.summaryShort}
        </p>
      )}
      {/* 요약 유무로 카드 높이가 달라도 메타 줄은 바닥에 붙어 줄이 맞는다 */}
      <p className="text-caption text-text-4 mt-auto pt-1.5">
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
      <Link
        href={`/articles/${article.id}`}
        aria-label={article.title}
        className="focus-visible:outline-accent rounded-card absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
      />
    </article>
  );
}
