"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { STAGE_META, TEAMS } from "@plick/domain/constants";
import { formatCount, formatRelativeTime } from "@plick/domain/format";
import type { HotArticle } from "@plick/domain/types";
import { TweetEmbed } from "@/_components/TweetEmbed";

/** 사이즈별 치수 — 카드 높이, 스크림 박스 패딩(= 어두운 영역 윗선), 제목 스케일. */
const SIZE = {
  /** 좌측 히어로 — 우측 서브 스택 높이에 맞춰 늘어난다(그리드 stretch, 피그마 W1) */
  lg: {
    box: "aspect-video lg:aspect-auto lg:h-full",
    pad: "px-6 pt-8 pb-5.5",
    title: "text-hero",
  },
  /** 우측 서브 카드 */
  sm: { box: "aspect-[9/5]", pad: "px-4 pt-6 pb-4", title: "text-hero-sm" },
} as const;

/**
 * 핫이슈 카드 — 미디어 위 어두운 스크림 + 흰 텍스트.
 *
 * 실계약(KAN-324)으로 갈아타면서 배경이 팀 컬러 placeholder(`MediaThumb`)에서
 * 릴 공용 단색(`bg-reel-bg`)으로 바뀌었다. 모바일이 KAN-297에서 히어로 카드를
 * 그렇게 통일했고 web 릴스도 KAN-323에서 같은 색을 따랐다.
 *
 * 사진(`imageUrl`)이 있으면 카드를 가득 덮고, 없으면(현재 발행 기사 전건이
 * 그렇다) 원문 트윗을 사진째 임베드한다 — 모바일 히어로 카드와 같은 폴백이다.
 * 임베드도 사진도 없으면 통일 배경색이 그대로 남는다.
 *
 * 임베드는 카드 가로를 꽉 채운다(기본 max-width 550px는 globals.css에서 푼다).
 * 세로 기준 영역은 카드 전체가 아니라 카드 맨 위부터 텍스트 블록(팀·단계 줄)
 * 윗선까지다 — 전체 높이 기준으로 가운데를 잡으면 트윗이 스크림·텍스트 뒤로
 * 반쯤 내려앉아 시작부터 가려진다. web 릴(KAN-323, `ReelItem`)과 같은 방식으로
 * 텍스트 블록 윗선을 ResizeObserver로 재서 영역을 잡고, 트윗이 영역보다 작으면
 * 그 안에서 가운데에 서고 크면 위에 붙어 넘친 아래쪽이 스크림 뒤로 잠긴다
 * (`justify-content: safe center` + `overflow-hidden`) — 본문 자체를 줄이거나
 * 말줄임하지는 않는다(X Display Requirements). 제목이 1~2줄로 자라거나 뷰포트가
 * 바뀌면 다시 잰다.
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
 * @param size - `lg`는 좌측 히어로, `sm`은 우측 서브 카드
 */
export function HotCard({
  article,
  size,
}: {
  article: HotArticle;
  size: "lg" | "sm";
}) {
  const v = SIZE[size];
  const team = article.teams[0] ? TEAMS[article.teams[0]] : null;
  const stage = article.stage ? STAGE_META[article.stage] : null;

  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  /** 임베드 영역의 아래선(텍스트 블록 윗선)까지의 거리(px, 카드 바닥 기준) */
  const [embedBottom, setEmbedBottom] = useState(0);

  useEffect(() => {
    const card = cardRef.current;
    const text = textRef.current;
    if (!card || !text) return;
    const measure = () =>
      setEmbedBottom(
        card.getBoundingClientRect().bottom - text.getBoundingClientRect().top,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    observer.observe(text);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`rounded-hero bg-reel-bg relative overflow-hidden transition-opacity hover:opacity-90 ${v.box}`}
    >
      {article.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 이미지 호스트가 유동이라 next/image 대신 일반 img (릴·MediaThumb과 같은 이유)
        <img
          src={article.imageUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        article.sourceUrl && (
          <div
            className="reel-embed hot-embed absolute inset-x-0 top-0 flex flex-col [justify-content:safe_center]"
            style={{ bottom: embedBottom }}
          >
            <TweetEmbed url={article.sourceUrl} />
          </div>
        )
      )}

      {/* pt가 스크림 윗선 — 팀·단계 줄보다 조금 위까지만 어둡다 (KAN-300) */}
      <div
        ref={textRef}
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 ${v.pad}`}
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
        <h3
          className={`text-media-on tracking-heading line-clamp-2 font-extrabold ${v.title}`}
        >
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
