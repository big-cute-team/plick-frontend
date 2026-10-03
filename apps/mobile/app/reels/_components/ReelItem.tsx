"use client";

import type { EntryPoint } from "@plick/core/analytics";
import { memo, useEffect, useRef, useState, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { TEAMS } from "@plick/domain/constants";
import { formatRelativeTime, teamProfilePath } from "@plick/domain/format";
import type { ReelCard } from "@plick/domain/types";
import { TeamCrest } from "@plick/ui/TeamCrest";
import { VsMark } from "@plick/ui/VsMark";
import type { Tweet } from "react-tweet/api";
import { TweetEmbed } from "@/_components/TweetEmbed";
import { LIKE_LOGIN_PROMPT } from "@/_constants/likes";
import {
  REEL_BACKDROP_FADE,
  SHEET_DRAG_Y_VAR,
  SHEET_TITLE_GAP,
  SHEET_TRANSITION,
} from "@/_constants/reels";
import { useArticleView } from "@/_hooks/useArticleView";
import { useReelLike } from "@/_hooks/useReelLike";
import type { TitleMotion } from "@/_types/reels";
import { titleLiftDistance } from "@/_utils/reels";
import { reelSharePath } from "@/_utils/share";
import { ReelActionRail } from "./ReelActionRail";

/**
 * 탭해야 뜨는 시트는 초기 번들에서 뺀다 (KAN-428). 조건부 마운트라 서버
 * HTML에 없고, 첫 탭 때 청크를 받아 뜬다. TweetEmbed는 dynamic 금지 — 첫 릴이
 * 서버 렌더(KAN-422)라 ssr을 끄면 초기 HTML의 임베드가 사라진다.
 */
const LoginPromptDialog = dynamic(
  () =>
    import("@/_components/LoginPromptDialog").then((m) => m.LoginPromptDialog),
  { ssr: false },
);
const ShareDialog = dynamic(
  () => import("@/_components/ShareDialog").then((m) => m.ShareDialog),
  { ssr: false },
);

/**
 * 릴 한 장 (KAN-296, KAN-569, KAN-574). 밝은 배경(bg-reel-bg) 위에 사진이나 원문
 * 트윗 임베드가 제목 윗선까지를 채우고, 아래쪽에 본문색 글자 정보 블록, 오른쪽
 * 액션 레일이 선다.
 *
 * KAN-567 시안은 흰 바탕에 radius 22 미디어 상자와 그 밑 정보 블록으로 바꿨는데,
 * 임베드가 상자 안 카드로 작아지고 상하단 바까지 붙어 릴이 좁아 보였다. KAN-569에서
 * 레이아웃은 전 디자인으로 되돌리고 색·글꼴·팀 표기(엠블럼 + 이름 + VS)는 새 톤을
 * 그대로 쓴다. 루머 단계 배지와 기자 등급은 되살리지 않는다.
 *
 * 임베드는 릴 맨 위(safe-area)부터 제목 윗선까지를 영역으로 삼아, 카드가 그 영역보다
 * 작으면 세로 가운데에 선다(`justify-content: safe center`). 크면 위에 붙고 자기
 * 높이만큼 그대로 서서 제목 뒤로 겹친다. 가로는 영역을 꽉 채운다. 팀 줄까지는 영역에
 * 포함돼 임베드가 그 뒤로 겹치고, 아래선은 제목 윗선을 재서 잡으므로 제목이 1~3줄로
 * 자라면 영역이 그만큼 줄어든다.
 *
 * 임베드는 맨 뒤 고정 레이어라 세부 시트가 열려도 제자리에 있고, 슬라이드업하는
 * 시트와 위로 도킹되는 팀·제목이 그 위를 덮는다.
 *
 * 팀·제목은 본문색 글자다 (KAN-574). 전에는 흰 글자에 고정 다크 스크림을 깔았는데
 * (KAN-299) 배경과 임베드가 흰 면이라 그라데이션이 오히려 화면을 탁하게 했다. 글자를
 * 검게 바꾸고, 사진이나 긴 트윗이 글자 뒤로 겹치는 자리에는 배경색 받침을 깐다.
 * 받침은 팀 줄 위에서 투명에서 배경색으로 번진다. 사진도 전처럼 릴 전체가 아니라
 * 임베드와 같은 영역(제목 윗선까지)만 덮는다.
 *
 * Embla 캐러셀의 슬라이드 하나다(`shrink-0 basis-full`).
 *
 * BE는 팀을 다중으로 주고 아예 없을 수도 있어 첫 팀만 대표로 쓰고, 없으면 팀 줄을
 * 뺀다. 기자도 없을 수 있다 (KAN-276).
 *
 * 좋아요 상태는 여기서 들고 있다 (KAN-308). 비로그인 시트가 레일이 아니라 이 층에
 * 붙는 이유는 {@link ReelActionRail} 주석에 있다. 공유 시트(KAN-312)도 같은 자리에 둔다.
 *
 * 활성 슬라이드가 되면 조회로 기록한다 (KAN-310, {@link useArticleView}). 피드 안
 * 순위(`rank`)를 같이 실어 서버가 `feed_rank`로 남긴다 (KAN-543).
 *
 * memo로 감싼다 (KAN-430). 피드가 렌더될 때(개폐·activeIndex 변화) props가 그대로인
 * 릴은 건너뛴다. 시트가 붙은 릴만 titleMotion 객체가 갈리고 나머지는 null로 안정된다.
 *
 * @param rank - 피드 안 순위(0부터). 조회 기록에 실린다
 * @param entry - 조회 기록의 진입 화면. 탭 피드는 `reels`, 딥링크 진입은 `reels_deeplink` (KAN-584)
 * @param active - 지금 보고 있는 릴인가. 아니면 `inert`로 묶어 화면 밖 릴의 버튼이
 *   탭 포커스를 받거나 스크린리더에 읽히지 않게 한다.
 * @param onOpenDetail - 릴 화면 어디든(버튼·링크 제외) 또는 댓글 아이콘 탭 시 호출. 어느 릴인지와
 *   팀·제목 블록이 도킹 지점까지 이동할 거리(px, 음수)를 넘긴다. 거리는 탭 시점에 측정한다.
 *   (릴을 인자로 받는 공유 콜백이라 정체성이 고정돼 memo가 산다)
 * @param titleMotion - 이 릴의 시트가 떠 있는 동안의 팀·제목 이동 상태 (아니면 null)
 * @param seedTweet - 서버가 미리 받아 둔 이 릴의 트윗 데이터 (KAN-422, 첫 릴만).
 *   임베드가 SSR로 그려져 클라 fetch를 건너뛴다.
 * @param nearActive - 보고 있는 릴에서 {@link REELS_EMBED_FETCH_AHEAD} 안인가.
 *   밖이면 트윗 임베드 fetch를 미룬다 (KAN-429). 한 번 안으로 들어온 릴은 창 안에
 *   있는 한 계속 그린다. 받은 임베드를 비웠다 다시 그리면 뒤로 넘길 때 깜빡인다.
 * @param inWindow - 보고 있는 릴에서 DOM 유지 창({@link REELS_DOM_WINDOW}) 안인가
 *   (KAN-431). 밖이면 내용 없이 빈 섹션 골격만 그린다. Embla가 슬라이드 수와
 *   높이를 재는 구조라 섹션 자체는 남긴다. 컴포넌트는 마운트를 유지하므로 fetch
 *   래치 같은 상태는 보존되고, 창에 다시 들어오면 swr 캐시로 즉시 되그린다.
 */
export const ReelItem = memo(function ReelItem({
  reel,
  rank,
  entry,
  active,
  onOpenDetail,
  titleMotion,
  seedTweet,
  nearActive = true,
  inWindow = true,
}: {
  reel: ReelCard;
  rank: number;
  entry: EntryPoint;
  active: boolean;
  onOpenDetail: (reel: ReelCard, lift: number) => void;
  titleMotion: TitleMotion | null;
  seedTweet?: Tweet;
  nearActive?: boolean;
  inWindow?: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLButtonElement>(null);
  const team = reel.teams[0] ? TEAMS[reel.teams[0]] : null;
  const like = useReelLike(reel);
  const [shareOpen, setShareOpen] = useState(false);

  /* fetch 게이트는 한 방향으로만 잠긴다 (KAN-429). 근처였던 적이 있으면 계속
     fetch 허용. 렌더 중 setState는 React가 지원하는 상태 보정 패턴이다 */
  const [embedFetchStarted, setEmbedFetchStarted] = useState(nearActive);
  if (nearActive && !embedFetchStarted) setEmbedFetchStarted(true);

  /* 활성 슬라이드가 되는 즉시 조회로 기록한다 (KAN-310). 릴스 전용 엔드포인트가
     없어 기사와 같은 걸 쓴다. 릴과 기사가 같은 articleSummaryId 체계다. 피드 안
     순위를 같이 실어 서버가 `feed_rank`로 남긴다 (KAN-543). 진입 화면은 피드가 정한다 (KAN-584) */
  useArticleView(reel.id, active, rank, entry);

  /** 임베드 영역의 아래선(제목 윗선)까지의 거리(px, 릴 바닥 기준) */
  const [regionBottom, setRegionBottom] = useState(0);
  /** 글자 받침의 윗선(팀 줄 윗선)까지의 거리(px, 릴 바닥 기준) */
  const [backdropBottom, setBackdropBottom] = useState(0);

  /* 제목 윗선을 재서 임베드 영역이 거기서 끝나게 한다. 시트가 떠 제목이
     translateY로 올라가 있는 동안은 재지 않는다(임베드는 고정 뒤 레이어라 영향을
     안 받아야 한다). getBoundingClientRect는 transform이 잡히므로 쉬는 상태에서만 잰다 */
  useEffect(() => {
    /* 창 밖에선 제목 자체가 없어 잴 수 없다. 창에 들어올 때 다시 돈다 (KAN-431) */
    if (titleMotion || !inWindow) return;
    const section = sectionRef.current;
    const title = titleRef.current;
    const titleText = titleTextRef.current;
    if (!section || !title || !titleText) return;
    const measure = () => {
      const bottom = section.getBoundingClientRect().bottom;
      setRegionBottom(bottom - titleText.getBoundingClientRect().top);
      setBackdropBottom(bottom - title.getBoundingClientRect().top);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    observer.observe(title);
    return () => observer.disconnect();
  }, [titleMotion, inWindow]);

  const handleOpen = () => {
    const section = sectionRef.current;
    const title = titleRef.current;
    if (!section || !title) return;
    onOpenDetail(
      reel,
      titleLiftDistance(
        section.getBoundingClientRect(),
        title.getBoundingClientRect(),
      ),
    );
  };

  /**
   * 릴 화면 어디를 눌러도 세부 시트를 연다 (KAN-525).
   *
   * 제 기능이 있는 요소는 건드리지 않는다. 좋아요·공유 버튼, 팀 링크, 트윗 임베드
   * 안의 링크는 `closest`로 걸러 그대로 둔다. 공유·로그인 시트는 포털이라 DOM은
   * 섹션 밖인데 React 이벤트는 트리를 따라 여기까지 올라오므로, DOM 포함 여부로
   * 한 번 더 거른다. 시트 딤을 눌러 닫는 탭이 세부 시트를 열면 안 된다.
   *
   * 세로 스와이프 뒤의 click은 Embla가 캡처 단계에서 삼키므로 넘기다 손을 떼도
   * 시트가 열리지 않는다. 시트가 떠 있는 동안은 시트 층(z-20)이 섹션을 덮지만
   * 보험으로 한 번 더 막는다.
   *
   * @param e - 섹션 click 이벤트
   */
  const handleSurfaceClick = (e: MouseEvent<HTMLElement>) => {
    if (titleMotion) return;
    const target = e.target as HTMLElement;
    if (!e.currentTarget.contains(target)) return;
    if (target.closest("a, button, input, textarea")) return;
    handleOpen();
  };

  /**
   * 팀·제목의 transform. 드래그 오프셋은 {@link SHEET_DRAG_Y_VAR}
   * CSS 변수로 흐르므로(KAN-430) 손가락을 따라가는 동안 이 컴포넌트는 렌더되지
   * 않는다. 클램프(도킹 지점 위~원래 자리 0 사이)도 CSS `min()`이 대신한다.
   */
  const titleTransform = titleMotion?.shown
    ? `translateY(min(0px, calc(${titleMotion.lift}px + var(${SHEET_DRAG_Y_VAR}, 0px))))`
    : "translateY(0px)";

  /* DOM 유지 창 밖은 빈 골격만. 훅은 위에서 전부 돌았으므로 조건부 훅 규칙 위반이
     아니고, 상태(fetch 래치·좋아요 시트 등)도 마운트와 함께 살아 있다 (KAN-431) */
  if (!inWindow) {
    return (
      <section
        ref={sectionRef}
        inert
        className="bg-reel-bg relative h-full w-full shrink-0 basis-full overflow-hidden"
      />
    );
  }

  return (
    <section
      ref={sectionRef}
      inert={!active}
      onClick={handleSurfaceClick}
      className="bg-reel-bg relative h-full w-full shrink-0 basis-full overflow-hidden"
    >
      {/* 사진이 있으면 임베드 영역(제목 윗선까지)을 덮는다. 없으면 원문 트윗 임베드가 자리를 대신하고,
          로드 전에는 배경색이 그대로 남고 실패가 확정되면 가운데 안내 문구가
          선다 (KAN-296). 맨 뒤 고정 레이어라 시트가 열려도 제자리에 있다 */}
      {reel.imageUrl ? (
        <div
          className="absolute inset-x-0"
          style={{ top: "var(--safe-top)", bottom: regionBottom }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 릴 이미지 호스트가 유동이라 next/image 대신 일반 img (핫이슈와 같은 이유) */}
          <img
            src={reel.imageUrl}
            alt=""
            /* 보고 있는 릴(첫 진입 시 index 0)은 LCP 후보라 lazy 큐잉 대신 최우선으로
               내려받는다 (KAN-421) */
            loading={active ? "eager" : "lazy"}
            fetchPriority={active ? "high" : "auto"}
            className="size-full object-cover"
          />
        </div>
      ) : (
        reel.sourceUrl && (
          <div
            className="reel-embed absolute inset-x-0 flex flex-col [justify-content:safe_center]"
            style={{ top: "var(--safe-top)", bottom: regionBottom }}
          >
            <TweetEmbed
              url={reel.sourceUrl}
              seedTweet={seedTweet}
              defer={!embedFetchStarted}
            />
          </div>
        )
      )}

      {/* 글자 받침 (KAN-574). 사진이나 긴 트윗이 제목 뒤로 겹쳐도 글자가 읽히게 배경색
          면을 깐다. 팀 줄 위로 FADE만큼 투명에서 배경색으로 번지고 그 아래는 단색이다.
          고정 층이라 레일(뒤에 그려짐)을 덮지 않는다. 시트가 뜨면 제목은 아래 블록 안의
          받침을 달고 올라가고, 이 층은 시트 밑에 남는다 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: `calc(${backdropBottom}px + ${REEL_BACKDROP_FADE})`,
          backgroundImage: `linear-gradient(to bottom, transparent, var(--plk-reel-bg) ${REEL_BACKDROP_FADE})`,
        }}
      />

      {/* 하단 정보 블록. 블록 자체는 `pointer-events-none`이라
          탭이 섹션까지 내려가 시트를 열고(KAN-525), 팀 링크와 제목·기자 줄 버튼만
          탭 타깃으로 남긴다. pb는 레일(bottom-27)보다 낮아 왼쪽만 살짝 아래다 (KAN-299) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2.75 pr-21 pb-22 pl-4.5 text-left">
        {/* 팀+제목. 시트가 열리면 이 요소가 시트 라인 위까지 올라간다.
            z-30: 시트 오버레이(z-20)보다 위에 그려진다 */}
        <div
          /* 측정용 titleRef에 더해, 시트가 떠 있으면 드래그 변수 수신자로도 등록 (KAN-430) */
          ref={(node) => {
            titleRef.current = node;
            return titleMotion?.dragTargetRef(node);
          }}
          className="relative z-30 flex flex-col gap-2.75"
          style={{
            transform: titleTransform,
            transition: titleMotion?.dragging ? "none" : SHEET_TRANSITION,
            willChange: titleMotion?.dragging ? "transform" : undefined,
          }}
        >
          {/* 시트가 붙어 있는 동안(열림, 닫힘 애니메이션 포함) 제목을 따라 올라가는
              받침. 도킹된 제목이 사진 위에서도 읽힌다. z-30 층 안이라 쉬는 상태에
              달면 레일을 덮어 시트가 있을 때만 단다 (KAN-574) */}
          {titleMotion && (
            <div
              aria-hidden
              className="absolute -right-21 -left-4.5 -z-10"
              style={{
                top: `calc(-1 * ${REEL_BACKDROP_FADE})`,
                /* 도킹 간격(SHEET_TITLE_GAP)을 지나 시트 둥근 모서리 밑까지 내려야 제목과
                   시트 사이로 사진이 비치지 않는다. 넘친 부분은 시트가 덮는다 */
                bottom: `calc(-1 * (${SHEET_TITLE_GAP}px + 2rem))`,
                backgroundImage: `linear-gradient(to bottom, transparent, var(--plk-reel-bg) ${REEL_BACKDROP_FADE})`,
              }}
            />
          )}
          {(team || reel.debate) && (
            <div className="flex items-center gap-2">
              {team && (
                <Link
                  href={teamProfilePath(team.code)}
                  className="pointer-events-auto flex items-center gap-2 active:opacity-60"
                >
                  <TeamCrest team={team} size={28} />
                  <span className="text-body-lg text-text-strong font-bold">
                    {team.name}
                  </span>
                </Link>
              )}
              {reel.debate && <VsMark size="md" />}
            </div>
          )}
          <button
            ref={titleTextRef}
            type="button"
            onClick={handleOpen}
            className="text-left"
            style={{ pointerEvents: titleMotion ? "none" : "auto" }}
          >
            {/* 파싱이 어긋나 원문 트윗이 통째로 제목에 들어온 기사가 있어 줄수를 묶는다 */}
            <span className="text-hero tracking-heading text-text-strong line-clamp-3 font-black text-pretty">
              {reel.title}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpen}
          className="pointer-events-auto flex items-baseline gap-1.75 text-left"
        >
          {reel.reporter && (
            <span className="text-body-lg text-text-strong font-bold">
              {reel.reporter.name}
            </span>
          )}
          <span className="text-body text-text-3" suppressHydrationWarning>
            {formatRelativeTime(reel.publishedAt)}
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

      {/* 릴은 릴 딥링크로 공유한다 (KAN-349). 받은 사람이 같은 릴에서 이어 본다 */}
      {shareOpen && (
        <ShareDialog
          path={reelSharePath(reel.id)}
          articleId={reel.id}
          onClose={() => setShareOpen(false)}
        />
      )}
    </section>
  );
});
