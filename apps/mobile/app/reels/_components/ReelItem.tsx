"use client";

import { useEffect, useRef, useState } from "react";
import { TEAMS } from "@plick/domain/constants";
import { LoginPromptDialog } from "@/_components/LoginPromptDialog";
import { ShareDialog } from "@/_components/ShareDialog";
import { TweetEmbed } from "@/_components/TweetEmbed";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import { SHEET_TRANSITION } from "@/_constants/reels";
import { useArticleView } from "@/_hooks/useArticleView";
import { useReelLike } from "@/_hooks/useReelLike";
import type { Tweet } from "react-tweet/api";
import type { ReelCard } from "@plick/domain/types";
import type { TitleMotion } from "@/_types/reels";
import { titleLiftDistance } from "@/_utils/reels";
import { reelSharePath } from "@/_utils/share";
import { formatRelativeTime } from "@plick/domain/format";
import { DebateLiveChip } from "@plick/ui/DebateLiveChip";
import { PostBadges } from "@plick/ui/PostBadges";
import { ReporterTierBadge } from "@plick/ui/ReporterTierBadge";
import { ReelActionRail } from "./ReelActionRail";

/**
 * 릴 한 장 — 통일된 배경(bg-reel-bg) 위에 사진 또는 원문 트윗 임베드 +
 * 정보 블록 + 우측 액션 레일 (KAN-296).
 *
 * 배경은 팀 컬러 그라데이션을 걷어내고 릴마다 같은 단색으로 통일했다
 * (다크 #151E26, 라이트 #FFFFFF). 사진(imageUrl)이 있으면 그 위를 사진이
 * 가득 덮고, 없으면 원문 트윗 임베드가 미디어 자리를 대신한다.
 *
 * 임베드는 릴 맨 위(safe-area)부터 제목(헤드라인) 윗선까지를 영역으로 삼아, 카드가
 * 그 영역보다 작으면 세로 가운데에 선다(`justify-content: safe center`). 크면
 * 위에 붙고 자기 높이만큼 그대로 서서 제목 뒤로 겹친다 — 자르지 않는다. 가로는
 * 영역을 꽉 채운다. 태그(칩)까지는 영역에 포함돼 임베드가 그 뒤로 겹치고, 아래선은
 * 제목 윗선을 재서 잡으므로 제목이 1~3줄로 자라면 영역이 그만큼 줄어든다.
 *
 * 임베드는 맨 뒤 고정 레이어라 세부 시트가 열려도 아무 반응이 없다 — 높이가
 * 줄거나 자리를 옮기지 않고 제자리에 그대로 있고, 슬라이드업하는 시트와 위로
 * 도킹되는 제목이 그 위를 덮는다. 트윗과 제목이 서로 다른 층으로 읽힌다.
 *
 * 제목·배지 뒤에는 고정 다크 스크림을 깐다 — 배경이 흰색(라이트)이어도 흰
 * 글자가 읽히게 하는 가독성 음영으로, 팀 로고·루머 단계 줄까지만 어둡다 (KAN-299).
 *
 * Embla 캐러셀의 슬라이드 하나다(`shrink-0 basis-full`).
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 팀 칩을
 * 뺀다. 기자도 없을 수 있다 (KAN-276).
 *
 * 좋아요 상태는 여기서 들고 있다 (KAN-308). 비로그인 팝업이 레일이 아니라 이 층에
 * 붙는 이유는 {@link ReelActionRail} 주석에 있다. 공유 팝업(KAN-312)도 같은 자리에 둔다.
 *
 * 활성 슬라이드가 되면 조회로 기록한다 (KAN-310, {@link useArticleView}).
 *
 * @param active - 지금 보고 있는 릴인가. 아니면 `inert`로 묶어 화면 밖 릴의 버튼이
 *   탭 포커스를 받거나 스크린리더에 읽히지 않게 한다.
 * @param onOpenDetail - 정보 블록(제목·기자)이나 댓글 아이콘 탭 시 호출.
 *   인자는 칩·제목이 도킹 지점까지 이동할 거리(px, 음수) — 탭 시점에 측정한다.
 * @param titleMotion - 이 릴의 시트가 떠 있는 동안의 칩·제목 이동 상태 (아니면 null)
 * @param seedTweet - 서버가 미리 받아 둔 이 릴의 트윗 데이터 (KAN-422, 첫 릴만).
 *   임베드가 SSR로 그려져 클라 fetch를 건너뛴다.
 */
export function ReelItem({
  reel,
  active,
  onOpenDetail,
  titleMotion,
  seedTweet,
}: {
  reel: ReelCard;
  active: boolean;
  onOpenDetail: (lift: number) => void;
  titleMotion: TitleMotion | null;
  seedTweet?: Tweet;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLButtonElement>(null);
  const team = reel.teams[0] ? TEAMS[reel.teams[0]] : null;
  const like = useReelLike(reel);
  const [shareOpen, setShareOpen] = useState(false);

  /* 활성 슬라이드가 되는 즉시 조회로 기록한다 (KAN-310). 릴스 전용 엔드포인트가
     없어 기사와 같은 걸 쓴다 — 릴과 기사가 같은 articleSummaryId 체계다 */
  useArticleView(reel.id, active);

  /** 임베드 영역의 아래선(제목 윗선까지)까지의 거리(px, 릴 바닥 기준) */
  const [regionBottom, setRegionBottom] = useState(0);

  /* 제목(헤드라인) 윗선을 재서 임베드 영역이 거기서 끝나게 한다 — 태그(칩)까지는
     영역에 포함돼 임베드가 그 뒤로 겹치고, 제목부터는 안 겹친다. 시트가 떠 제목이
     translateY로 올라가 있는 동안은 재지 않는다(임베드는 고정 뒤 레이어라 영향
     안 받아야 함). getBoundingClientRect는 transform이 잡히므로 쉬는 상태에서만 잰다. */
  useEffect(() => {
    if (titleMotion) return;
    const section = sectionRef.current;
    const titleText = titleTextRef.current;
    if (!section || !titleText) return;
    const measure = () =>
      setRegionBottom(
        section.getBoundingClientRect().bottom -
          titleText.getBoundingClientRect().top,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    observer.observe(titleText);
    return () => observer.disconnect();
  }, [titleMotion]);

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
      className="bg-reel-bg relative h-full w-full shrink-0 basis-full overflow-hidden"
    >
      {/* 사진이 있으면 릴을 가득 덮는다. 없으면 원문 트윗 임베드가 자리를 대신하고,
          로드 전에는 통일 배경색이 그대로 남고 실패가 확정되면 배경 가운데
          안내 문구가 선다 (KAN-296).
          이 미디어 층은 맨 뒤 고정 레이어다 — 세부 시트가 열려도 아무 반응 없이
          제자리에 그대로 있고, 시트와 도킹된 제목이 그 위를 덮는다. */}
      {reel.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 릴 배경 이미지 호스트가 유동이라 next/image 대신 일반 img (MediaThumb과 같은 이유)
        <img
          src={reel.imageUrl}
          alt=""
          /* 보고 있는 릴(첫 진입 시 index 0)은 LCP 후보라 lazy 큐잉 대신 최우선으로
             내려받는다 (KAN-421) */
          loading={active ? "eager" : "lazy"}
          fetchPriority={active ? "high" : "auto"}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        reel.sourceUrl && (
          <div
            className="reel-embed absolute inset-x-0 flex flex-col [justify-content:safe_center]"
            style={{ top: "var(--safe-top)", bottom: regionBottom }}
          >
            <TweetEmbed
              url={reel.sourceUrl}
              layout="reel"
              seedTweet={seedTweet}
            />
          </div>
        )
      )}

      {/* 제목·배지 뒤 음영 — 배경이 흰색(라이트)이어도 흰 글자가 읽히게 고정 다크
          스크림을 깐다. 어두운 범위는 팀 로고·루머 단계 줄까지만 닿고 그 위로는
          빠르게 사라진다 (KAN-299). 시트가 열리면 제목과 같은 translateY로 함께
          올라가 도킹된 제목 뒤를 그대로 받쳐 준다 (같은 offset·타이밍 공유) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%]"
        style={{
          backgroundImage:
            "linear-gradient(to top, color-mix(in srgb, var(--plk-scrim) 98%, transparent) 0%, color-mix(in srgb, var(--plk-scrim) 88%, transparent) 55%, color-mix(in srgb, var(--plk-scrim) 55%, transparent) 80%, transparent 100%)",
          transform: `translateY(${titleMotion?.offset ?? 0}px)`,
          transition: titleMotion?.dragging ? "none" : SHEET_TRANSITION,
        }}
      />

      {/* 하단 정보 블록 (스크림 위 텍스트). 블록 자체는 눌리지 않고 제목·기자
          줄만 시트를 여는 탭 타깃이다. */}
      {/* pb는 우측 레일(bottom-27)보다 낮다 — 좌측 요소만 살짝 아래로 내린다 (KAN-299) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2.75 pr-21 pb-22 pl-4.5 text-left">
        {/* 배지+제목 — 시트가 열리면 이 요소가 시트 라인 위까지 올라간다.
            z-30: 시트 오버레이(z-20)보다 위에 그려져 스크림을 덮는다 */}
        <div
          ref={titleRef}
          className="relative z-30 flex flex-col gap-2.75"
          style={{
            transform: `translateY(${titleMotion?.offset ?? 0}px)`,
            transition: titleMotion?.dragging ? "none" : SHEET_TRANSITION,
          }}
        >
          <PostBadges
            team={team}
            stage={reel.stage}
            crestSize={34}
            stageTextClass="text-label"
            /* 열린 토론이 붙은 릴만 "토론 중" 칩을 단다 (KAN-418, 시안 T2).
               마감(FINISH) 릴도 debate가 인라인으로 오므로(KAN-420) contentType으로 거른다 */
            extra={
              reel.debate && reel.contentType !== "FINISH" ? (
                <DebateLiveChip />
              ) : null
            }
          />
          <button
            ref={titleTextRef}
            type="button"
            onClick={handleOpen}
            className="text-left"
            style={{ pointerEvents: titleMotion ? "none" : "auto" }}
          >
            {/* 파싱이 어긋나 원문 트윗이 통째로 제목에 들어온 기사가 있어 줄수를 묶는다 */}
            <span className="text-hero tracking-heading text-media-on line-clamp-3 font-extrabold">
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
              <ReporterTierBadge
                reporter={reel.reporter}
                sizeClassName="size-6 text-caption"
              />
              <span className="text-body-lg text-media-on font-bold">
                {reel.reporter.name}
              </span>
            </>
          )}
          <span className="text-body text-media-on-dim">
            {reel.reporter && "· "}
            <span suppressHydrationWarning>
              {formatRelativeTime(reel.publishedAt)}
            </span>
          </span>
        </button>
      </div>

      <ReelActionRail
        reel={reel}
        onLike={like.toggle}
        onComment={handleOpen}
        onShare={() => setShareOpen(true)}
      />

      {like.needsLogin && (
        <LoginPromptDialog
          onClose={like.dismissLogin}
          description={LIKE_LOGIN_PROMPT}
        />
      )}

      {/* 릴은 릴 딥링크로 공유한다 (KAN-349) — 받은 사람이 같은 릴에서 이어 본다 */}
      {shareOpen && (
        <ShareDialog
          path={reelSharePath(reel.id)}
          onClose={() => setShareOpen(false)}
        />
      )}
    </section>
  );
}
