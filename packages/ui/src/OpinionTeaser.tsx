"use client";

import { useEffect, useRef, useState } from "react";
import {
  OPINION_TEASER_INTERVAL_MS,
  PARTICIPATION_NOTICE,
  shuffledTeaserOrder,
  teaserFirstDelayMs,
} from "@plick/domain/vs";

/** 카드 한 줄에 보일 의견 한 토막. 홈 예측 카드와 VS 카드가 같은 모양을 준다. */
interface TeaserOpinion {
  nickname: string;
  opinion: string;
}

/**
 * 카드 아래 대표 의견 한 줄. 닉네임 굵게에 본문 말줄임이고, 의견이 여럿이면 3초마다 다음 의견으로
 * 넘긴다(KAN-714). 새 줄은 아래에서 올라오며 나타난다(`animate-line-up`). 화면 밖·탭 숨김·움직임
 * 줄이기 설정에서는 자동 전환을 멈춘다(`RotatingLine`과 같은 조건).
 *
 * 순서와 박자는 카드마다 다르다(KAN-724 PR). 첫 줄은 서버가 준 첫 의견이고(서버 HTML과 같게) 마운트 뒤
 * 나머지를 섞으며(`shuffledTeaserOrder`), 첫 전환까지의 시간도 카드마다 다르게 뽑는다
 * (`teaserFirstDelayMs`). 전에는 나란한 카드 셋이 같은 순서로 같은 순간에 넘어가 한 몸처럼 보였다.
 *
 * 잠금(`locked`, 참여 전)은 닉네임은 그대로 보이고 본문만 흐리게 가린다. 전에는 줄 전체를 실루엣으로
 * 덮고 안내만 띄웠는데, 누가 쓰고 있는지는 보여야 궁금해진다는 피드백으로 바꿨다. 흐린 본문은
 * BE가 앞 40자만 준 미끼 문구고 `aria-hidden`이라 스크린리더는 대신 참여 안내를 읽는다. 의견이
 * 하나도 없으면 잠금은 실루엣과 안내, 공개는 빈 문구다.
 *
 * `tone`이 `accent`면 강조색 면(홈 예측 카드) 위에 놓인 흰 글자다.
 *
 * @param locked 참여 전이라 본문을 가릴지
 * @param opinion 의견 하나. `opinions`가 없을 때의 호환 자리(VS 카드)
 * @param opinions 돌려 보일 의견들. 첫 항목부터 순서대로 넘긴다
 * @param emptyLabel 의견이 없을 때의 문구
 * @param tone 글자 색. 기본은 중립 면, `accent`는 강조색 면 위
 */
export function OpinionTeaser({
  locked,
  opinion,
  opinions,
  emptyLabel = "아직 의견이 없어요",
  tone = "neutral",
}: {
  locked: boolean;
  opinion?: TeaserOpinion | null;
  opinions?: readonly TeaserOpinion[];
  emptyLabel?: string;
  tone?: "neutral" | "accent";
}) {
  const list = opinions ?? (opinion ? [opinion] : []);
  const count = list.length;
  const ref = useRef<HTMLParagraphElement>(null);
  const [index, setIndex] = useState(0);
  /* 넘기는 순서. 서버와 첫 그림은 원래 순서고 마운트 뒤 나머지를 섞는다 */
  const [order, setOrder] = useState<number[] | null>(null);
  useEffect(() => {
    if (count < 2) return;
    setOrder(shuffledTeaserOrder(count));
    let inView = false;
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
    });
    if (ref.current) observer.observe(ref.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (inView && !document.hidden && !reduced.matches)
        setIndex((value) => (value + 1) % count);
      timer = setTimeout(tick, OPINION_TEASER_INTERVAL_MS);
    };
    timer = setTimeout(tick, teaserFirstDelayMs());
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [count]);

  const accent = tone === "accent";
  const position = count ? index % count : 0;
  const current = count ? list[order?.[position] ?? position] : undefined;

  if (!current) {
    if (locked) {
      return (
        <div className="relative flex min-h-12 items-center justify-center overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-1 flex gap-2 blur-sm"
          >
            <span
              className={`rounded-pill h-3 w-16 ${accent ? "bg-on-accent/40" : "bg-border-strong"}`}
            />
            <span
              className={`rounded-pill h-3 flex-1 ${accent ? "bg-on-accent/40" : "bg-border-strong"}`}
            />
          </div>
          <p
            className={`text-label relative text-center font-bold ${accent ? "text-on-accent" : "text-text-strong"}`}
          >
            {PARTICIPATION_NOTICE}
          </p>
        </div>
      );
    }
    return (
      <p
        className={`text-label flex min-h-12 items-center ${accent ? "text-on-accent/80" : "text-text-3"}`}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <p
      ref={ref}
      className={`text-label flex min-h-12 min-w-0 items-center overflow-hidden ${accent ? "text-on-accent" : "text-text-3"}`}
    >
      {locked && <span className="sr-only">{PARTICIPATION_NOTICE}</span>}
      <span
        key={`${position}-${current.nickname}`}
        className="animate-line-up flex min-w-0 flex-1 items-center gap-1.5 motion-reduce:animate-none"
      >
        <span
          className={`max-w-[40%] truncate font-bold ${accent ? "" : "text-text-strong"}`}
        >
          {current.nickname}
        </span>
        <span
          aria-hidden={locked || undefined}
          className={`min-w-0 flex-1 truncate ${accent ? "opacity-90" : "text-text-2"} ${
            locked ? "blur-xs select-none" : ""
          }`}
        >
          {current.opinion}
        </span>
      </span>
    </p>
  );
}
