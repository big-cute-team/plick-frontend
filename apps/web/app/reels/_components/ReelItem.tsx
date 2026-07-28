"use client";

import { useEffect, useRef, useState } from "react";
import { TEAMS } from "@plick/domain/constants";
import { formatRelativeTime } from "@plick/domain/format";
import type { ReelCard } from "@plick/domain/types";
import { PostBadges } from "@plick/ui/PostBadges";
import { ReporterTierBadge } from "@plick/ui/ReporterTierBadge";
import { TweetEmbed } from "@/_components/TweetEmbed";
import { ReelActionRail } from "./ReelActionRail";

/**
 * 릴 한 장 — 9:16 카드(미디어 + 배지·제목·기자 오버레이) + 액션 레일.
 *
 * 카드는 가용 높이를 채운다(`h-full`). 레일 배치는 뷰포트에 따라 다르다:
 * - 데스크톱(lg↑): 카드 밖 오른쪽에 flex 형제로 나란히.
 * - 모바일 뷰: 사진이 좁아지지 않도록 카드 안 우측에 오버레이하고(우측 스크림으로
 *   가독성 확보), 카드는 `max-w-full`로 가용 폭을 꽉 채운다.
 *
 * 실계약(KAN-323)으로 갈아타면서 배경과 미디어가 바뀌었다. 카드 배경은 팀 컬러
 * 그라데이션에서 릴 공용 단색(`bg-reel-bg`)으로 통일했다 — 모바일이 KAN-296에서
 * 같은 판단을 했고, 아래 트윗 임베드가 그 색에 맞춰 경계 없이 이어져야 한다.
 * 사진(`imageUrl`)이 있으면 카드를 가득 덮고, 없으면(현재 발행 릴 전건이 그렇다)
 * 원문 트윗 임베드가 미디어 자리를 대신한다.
 *
 * 임베드 영역은 카드 맨 위부터 제목(헤드라인) 윗선까지다. 카드가 그 영역보다
 * 작으면 세로 가운데에 서고(`justify-content: safe center`), 크면 위에 붙고 자기
 * 높이만큼 그대로 서서 제목 뒤로 겹친다 — 자르지 않는다(X Display Requirements가
 * 본문 수정·말줄임을 금지한다). 배지 줄까지는 영역에 포함돼 임베드가 그 뒤로
 * 겹치고, 아래선은 제목 윗선을 재서 잡으므로 제목이 1~3줄로 자라면 영역이 그만큼
 * 줄어든다. 세부 패널이 열려 카드 폭이 줄 때도 ResizeObserver가 다시 잰다.
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 로고를
 * 뺀다. 기자도 없을 수 있어 그때는 발행 시각만 남는다.
 *
 * @param reel - 표시할 릴
 * @param onOpenDetail - 제목 영역·댓글 버튼 클릭 시 세부 패널을 여는 콜백(KAN-219)
 */
export function ReelItem({
  reel,
  onOpenDetail,
}: {
  reel: ReelCard;
  onOpenDetail: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLButtonElement>(null);
  const team = reel.teams[0] ? TEAMS[reel.teams[0]] : null;

  /** 임베드 영역의 아래선(제목 윗선까지)까지의 거리(px, 카드 바닥 기준) */
  const [embedBottom, setEmbedBottom] = useState(0);

  useEffect(() => {
    const card = cardRef.current;
    const title = titleRef.current;
    if (!card || !title) return;
    const measure = () =>
      setEmbedBottom(
        card.getBoundingClientRect().bottom - title.getBoundingClientRect().top,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    observer.observe(title);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-full w-full items-end justify-center gap-4 lg:gap-6.5">
      <div
        ref={cardRef}
        className="bg-reel-bg rounded-hero relative aspect-[9/16] h-full w-auto max-w-full min-w-0 overflow-hidden"
      >
        {/* 사진이 있으면 카드를 가득 덮는다. 없으면 원문 트윗 임베드가 자리를
            대신하고, 트윗도 로드 전이거나 실패하면 릴 배경색이 그대로 남는다 */}
        {reel.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 릴 배경 이미지 호스트가 유동이라 next/image 대신 일반 img (MediaThumb과 같은 이유)
          <img
            src={reel.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          reel.sourceUrl && (
            <div
              className="reel-embed absolute inset-x-0 top-0 flex flex-col [justify-content:safe_center]"
              style={{ bottom: embedBottom }}
            >
              <TweetEmbed url={reel.sourceUrl} />
            </div>
          )
        )}

        {/* 모바일 전용 우측 스크림 — 카드 안 오버레이 레일 가독성용(테마 무관 고정) */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-24 lg:hidden"
          style={{
            backgroundImage:
              "linear-gradient(to left, color-mix(in srgb, var(--plk-scrim) 45%, transparent), transparent)",
          }}
        />

        {/* 하단 정보 블록 — 스크림 위 배지·제목·기자.
            모바일에선 우측에 레일이 겹치므로 pr-16으로 자리를 비운다. */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-2.75 pt-30 pr-16 pb-8 pl-5.5 lg:pr-5.5"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--plk-scrim) 55%, transparent) 35%, color-mix(in srgb, var(--plk-scrim) 92%, transparent) 100%)",
          }}
        >
          <PostBadges team={team} stage={reel.stage} />
          <button
            ref={titleRef}
            type="button"
            onClick={onOpenDetail}
            className="focus-visible:outline-accent w-fit rounded text-left hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {/* 파싱이 어긋나 원문 트윗이 통째로 제목에 들어온 기사가 있어 줄수를 묶는다 */}
            <span className="text-headline text-media-on line-clamp-3 font-extrabold">
              {reel.title}
            </span>
          </button>
          <span className="flex items-center gap-2.25">
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
          </span>
        </div>

        {/* 모바일 전용: 레일을 카드 안 우측 하단에 오버레이 */}
        <ReelActionRail
          reel={reel}
          onOpenComments={onOpenDetail}
          className="absolute right-3 bottom-4 lg:hidden"
        />
      </div>

      {/* 데스크톱 전용: 카드 밖 오른쪽 레일 — 페이지 배경 위라 surface 톤(테마색) */}
      <ReelActionRail
        reel={reel}
        tone="surface"
        onOpenComments={onOpenDetail}
        className="max-lg:hidden"
      />
    </div>
  );
}
