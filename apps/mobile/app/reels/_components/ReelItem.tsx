"use client";

import { useEffect, useRef, useState } from "react";
import { TEAMS } from "@plick/domain/constants";
import { MediaThumb } from "@plick/ui/MediaThumb";
import { TweetEmbed } from "@/_components/TweetEmbed";
import { NO_TEAM_COLOR_VAR } from "@/_constants/app";
import {
  SHEET_HEIGHT_RATIO,
  SHEET_MEDIA_TRANSITION,
  SHEET_TRANSITION,
} from "@/_constants/reels";
import type { ReelCard, TitleMotion } from "@/_types/reels";
import { titleLiftDistance } from "@/_utils/reels";
import { formatRelativeTime } from "@/_utils/time";
import { PostChips } from "@plick/ui/PostChips";
import { ReporterTierBadge } from "@plick/ui/ReporterTierBadge";
import { ReelActionRail } from "./ReelActionRail";

/**
 * 릴 한 장 — 풀스크린 미디어 + 스크림 + 정보 블록 + 우측 액션 레일.
 *
 * 미디어는 사진(imageUrl) → 원문 트윗 임베드 → 팀 컬러 그라데이션 순으로
 * 폴백한다 (KAN-284).
 *
 * Embla 캐러셀의 슬라이드 하나다(`shrink-0 basis-full`). 컨테이너 높이의 100%를
 * 차지하되 줄어들지 않아야 릴 개수만큼 세로로 쌓인다.
 *
 * 칩·제목은 릴에 있는 이 요소 하나뿐이다. 세부 시트가 열리면 새로 그리지 않고
 * 이 요소가 transform으로 시트 상단 라인 위 도킹 지점까지 올라가 한 몸으로 움직인다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 팀 칩과
 * 팀 컬러를 뺀다. 기자도 없을 수 있다 (KAN-276).
 *
 * @param active - 지금 보고 있는 릴인가. 아니면 `inert`로 묶어 화면 밖 릴의 버튼이
 *   탭 포커스를 받거나 스크린리더에 읽히지 않게 한다.
 * @param onOpenDetail - 정보 블록(제목·기자)이나 댓글 아이콘 탭 시 호출.
 *   인자는 칩·제목이 도킹 지점까지 이동할 거리(px, 음수) — 탭 시점에 측정한다.
 * @param titleMotion - 이 릴의 시트가 떠 있는 동안의 칩·제목 이동 상태 (아니면 null)
 */
export function ReelItem({
  reel,
  active,
  onOpenDetail,
  titleMotion,
}: {
  reel: ReelCard;
  active: boolean;
  onOpenDetail: (lift: number) => void;
  titleMotion: TitleMotion | null;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const team = reel.teams[0] ? TEAMS[reel.teams[0]] : null;
  const hasEmbed = !reel.imageUrl && !!reel.sourceUrl;

  /** 임베드 정렬 영역 높이 — 릴 상단부터 칩 줄 윗부분까지 (KAN-291) */
  const [embedRegion, setEmbedRegion] = useState<number>();
  /* 측정 가드는 ref로 본다 — 시트 모션 중엔 title에 transform이 끼어 있어
     rect가 도킹 위치로 재지기 때문에 resting 값만 유지한다 */
  const titleMotionRef = useRef(titleMotion);
  titleMotionRef.current = titleMotion;

  useEffect(() => {
    if (!hasEmbed) return;
    const section = sectionRef.current;
    const title = titleRef.current;
    if (!section || !title) return;

    const measure = () => {
      if (titleMotionRef.current) return;
      setEmbedRegion(
        title.getBoundingClientRect().top - section.getBoundingClientRect().top,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    return () => observer.disconnect();
  }, [hasEmbed]);

  const handleOpen = () => {
    const section = sectionRef.current;
    const title = titleRef.current;
    if (!section || !title) return;
    onOpenDetail(
      titleLiftDistance(
        section.getBoundingClientRect(),
        title.getBoundingClientRect(),
      ),
    );
  };

  return (
    <section
      ref={sectionRef}
      inert={!active}
      className="relative h-full w-full shrink-0 basis-full"
    >
      <MediaThumb
        colorVar={team ? team.colorVar : NO_TEAM_COLOR_VAR}
        imageUrl={reel.imageUrl}
        className="h-full"
        /* 임베드 릴은 팀 그라데이션 대신 임베드 카드와 같은 배경으로 한 몸처럼
           보이게 한다 (KAN-291) */
        style={
          hasEmbed
            ? {
                backgroundImage: "none",
                backgroundColor: "var(--tweet-embed-bg)",
              }
            : undefined
        }
      >
        {/* 사진이 null이면 원문 트윗 임베드가 미디어 자리를 대신한다 (KAN-284).
            사진처럼 릴 화면을 꽉 채우고(KAN-291), 세부 시트가 떠 있는 동안은
            시트 위 남은 영역으로 줄어든다. 임베드는 카드 전체를 축소하는
            방식(useTweetFit)으로 층 높이를 따라가고, 칩 줄 위 영역보다 짧은
            카드는 그 영역 가운데에 선다 */}
        {hasEmbed && reel.sourceUrl && (
          <div
            className="absolute inset-x-0 top-0"
            style={{
              height: titleMotion
                ? `${(1 - SHEET_HEIGHT_RATIO) * 100}%`
                : "100%",
              transition: SHEET_MEDIA_TRANSITION,
            }}
          >
            <TweetEmbed url={reel.sourceUrl} centerRegionHeight={embedRegion} />
          </div>
        )}

        {/* 하단 정보 블록 (스크림 위 텍스트). 블록 자체는 눌리지 않고 제목·기자
            줄만 시트를 여는 탭 타깃이다 — 그라데이션·칩 영역 탭은 아래 릴
            (스와이프·탭)로 통과한다 (KAN-284) */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2.75 pt-30 pr-21 pb-27 pl-4.5 text-left"
          style={{
            /* 트윗 임베드가 이 아래까지 오므로(KAN-291) 텍스트 구간은 완전
               불투명하게 덮는다 — 리드인(pt-30) 구간에서만 투명→불투명 전환 */
            backgroundImage:
              "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--plk-scrim) 88%, transparent) 25%, var(--plk-scrim) 55%)",
          }}
        >
          {/* 칩+제목 — 시트가 열리면 이 요소가 시트 라인 위까지 올라간다.
              z-30: 시트 오버레이(z-20)보다 위에 그려져 스크림을 덮는다 */}
          <div
            ref={titleRef}
            className="relative z-30 flex flex-col gap-2.75"
            style={{
              transform: `translateY(${titleMotion?.offset ?? 0}px)`,
              transition: titleMotion?.dragging ? "none" : SHEET_TRANSITION,
            }}
          >
            <PostChips teamName={team?.name} stage={reel.stage} />
            <button
              type="button"
              onClick={handleOpen}
              className="text-left"
              style={{ pointerEvents: titleMotion ? "none" : "auto" }}
            >
              {/* 파싱이 어긋나 원문 트윗이 통째로 제목에 들어온 기사가 있어 줄수를 묶는다 */}
              <span className="text-headline text-media-on line-clamp-3 font-extrabold">
                {reel.title}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpen}
            className="pointer-events-auto flex items-center gap-2.25 text-left"
          >
            {reel.reporter && (
              <>
                <ReporterTierBadge reporter={reel.reporter} />
                <span className="text-body text-media-on font-bold">
                  {reel.reporter.name}
                </span>
              </>
            )}
            <span className="text-label text-media-on-dim">
              {reel.reporter && "· "}
              <span suppressHydrationWarning>
                {formatRelativeTime(reel.publishedAt)}
              </span>
            </span>
          </button>
        </div>

        <ReelActionRail reel={reel} onComment={handleOpen} />
      </MediaThumb>
    </section>
  );
}
