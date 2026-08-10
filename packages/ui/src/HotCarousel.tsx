"use client";

import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ChevronMiniIcon } from "./icons";

/** 카드 폭 (트랙 폭 대비 비율) — 트랙의 `w-[86%]`와 일치해야 한다 */
const CARD_W = 0.86;

/** 카드 사이 간격(px) — `gap-2.5`와 일치해야 한다 */
const GAP = 10;

/** 자동 넘김 간격(ms) — 제목 두 줄을 읽을 시간 (KAN-282) */
const AUTOPLAY_MS = 4000;

/** 무한 루프용 복제 벌수 — 원본 앞뒤로 한 벌씩 둬서 양방향 여유를 만든다 (KAN-382) */
const COPIES = 3;

/** 스크롤이 멎었다고 보는 간격(ms) — 이 뒤에 되감기 위치를 바로잡는다 */
const IDLE_MS = 150;

/** 자체 스크롤 애니메이션 길이(ms) — 연타 리타겟이 자연스러운 ease-out 기준 */
const ANIM_MS = 350;

/**
 * 셰브론 지름 대비 배율 — `ChevronMiniIcon`의 viewBox(9.35) 안에서 실제 획은
 * 가로 25%, 세로 50%만 차지해서, 원판 지름과 같은 값을 줘야 인스타그램처럼
 * 원판을 꽉 채운 화살표로 보인다.
 */
const HANDLE_ICON = 26;

/**
 * 핫이슈 센터 스냅 캐러셀 + 하단 점 인디케이터 + 자동 넘김 + 좌우 핸들 (KAN-282, KAN-382).
 *
 * 모바일 홈 전용이던 것을 웹 홈이 두 번째 소비자가 되면서 `@plick/ui`로
 * 승격했다(KAN-338). 카드 렌더는 앱마다 달라(모바일 `HotHeroCard`, 웹 `HotCard`)
 * children으로 주입받는다 — render prop이 아니라 children인 이유는 서버 컴포넌트
 * 페이지가 함수를 클라이언트 경계 너머로 넘길 수 없어서다. 카드를 서버에서
 * 그려 엘리먼트로 넘기면 경계를 그대로 통과한다.
 *
 * 카드 폭 86%, 좌우 스페이서(7% − gap)로 첫/마지막 카드까지 정확히 화면 중앙에
 * 스냅시킨다. 좌우 패딩 방식은 카드 %가 '패딩 뺀 영역' 기준이라 끝단이 중앙까지
 * 못 가는 문제가 있다 (ADR 0002 §6-2).
 *
 * 무한 루프는 카드 목록을 세 벌 이어 붙이고 가운데 벌만 '진짜'로 다룬다 (KAN-382).
 * 복제본은 원본과 픽셀이 같아, 위치를 한 벌 폭만큼 통째로 옮기면 화면은 그대로인
 * 채 양옆 여유만 되돌아온다. 그래서 마지막 카드에서 오른쪽으로 한 칸 더 가면
 * 왼쪽으로 되감기지 않고 그대로 흘러가고, 왼쪽으로 밀 때도 똑같이 끝이 없다.
 *
 * 자리를 되돌리는 시점은 셋이다. 스크롤이 멎었을 때(`wrap`), 손가락이 막 닿았을
 * 때, 핸들을 눌렀을 때. 앞의 둘만 있으면 핸들 연타에서 목표가 마지막 복제본까지
 * 밀려 나가 트랙 끝에 닿고, 끝에는 옆 카드가 없어 한쪽이 잠깐 비어 보였다.
 *
 * 자동 넘김은 고정 인터벌이 아니라 리셋되는 타이머다. 손가락이 닿으면 멈추고,
 * 떼거나 스크롤이 일 때마다 처음부터 다시 센다 — 유저가 직접 보는 동안 타이머가
 * 스와이프를 뺏지 않고, 움직임이 멎은 시점부터 온전한 간격 뒤에 넘어간다.
 * 백그라운드 탭에서는 쉰다.
 *
 * `snap-x-carousel`·`no-scrollbar` 클래스는 각 앱 `globals.css`에 정의돼 있어야
 * 한다 (Tailwind 유틸이 아닌 커스텀 클래스).
 *
 * @param children - 카드 목록. 각 카드는 래퍼(`w-[86%]` + 비율 박스)를 `h-full`로 채운다.
 * @param cardClassName - 카드 래퍼의 비율 클래스. 기본은 모바일 기하(`aspect-[181/131]`).
 *   웹은 데스크톱에서 `lg:aspect-video`로 낮춰 카드가 과하게 길어지는 것을 막는다.
 */
export function HotCarousel({
  children,
  cardClassName = "aspect-[181/131]",
}: {
  children: ReactNode;
  cardClassName?: string;
}) {
  const cards = Children.toArray(children);
  const count = cards.length;
  /** 카드가 하나뿐이면 넘길 것도 없어 복제와 핸들을 모두 끈다 */
  const looping = count > 1;
  /** 가운데(원본) 벌이 시작하는 슬라이드 인덱스 */
  const base = looping ? count : 0;
  const slides = looping
    ? Array.from({ length: COPIES }, () => cards).flat()
    : cards;
  const slideCount = slides.length;

  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  /**
   * 지금 향하고 있는 슬라이드 인덱스. 스크롤 위치가 아니라 '목표'다 —
   * 애니메이션이 도착하기 전에 핸들을 또 눌러도 한 칸씩 제대로 쌓이게 한다.
   */
  const targetRef = useRef(base);
  /** 손가락이 트랙에 닿아 있는 동안 true — 타이머를 걸지 않는다 */
  const holdingRef = useRef(false);
  /** 진행 중인 자체 애니메이션의 rAF id. 없으면 null */
  const animRef = useRef<number | null>(null);

  /** 스냅 한 칸의 폭(px). 트랙 폭에 비례해 리사이즈마다 달라진다 */
  const stepOf = useCallback(
    (el: HTMLDivElement) => el.clientWidth * CARD_W + GAP,
    [],
  );

  /** 자체 애니메이션 중단 + 스냅 복원. 손가락이 닿거나 휠이 돌면 즉시 넘겨준다 */
  const cancelAnim = useCallback((el: HTMLDivElement) => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    el.style.scrollSnapType = "";
  }, []);

  /**
   * rAF 기반 자체 스크롤 애니메이션 — `scrollTo({behavior:"smooth"})`를 쓰지
   * 않는 이유가 이 컴포넌트의 핵심이다. 크롬은 smooth 스크롤 중 새 scrollTo가
   * 오면 느리게 출발하는 이징으로 애니메이션을 처음부터 다시 시작해서, 핸들을
   * 연타하면 화면이 거의 안 움직이다가 클릭이 멎은 뒤 쌓인 거리를 한 번에
   * 이동한다. 자체 애니메이션은 연타가 와도 '지금 지나가는 위치'에서 새 목표로
   * 그대로 이어 가므로(ease-out이라 출발이 빨라 이음새가 안 보인다) 아무리
   * 갈겨도 부드럽다 (KAN-382).
   *
   * 도는 동안 `scroll-snap-type`을 잠시 끈다 — mandatory 스냅이 프레임마다
   * 대입하는 중간 위치를 스냅점으로 되돌리려 해 애니메이션과 싸운다. 끝나면
   * 복원하는데, 도착점이 정확히 스냅점이라 복원 순간 움직임은 없다.
   */
  const animateTo = useCallback(
    (el: HTMLDivElement, left: number) => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      const from = el.scrollLeft;
      const dist = left - from;
      if (
        Math.abs(dist) < 1 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        el.scrollLeft = left;
        cancelAnim(el);
        return;
      }
      el.style.scrollSnapType = "none";
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ANIM_MS);
        const eased = 1 - (1 - t) ** 3;
        el.scrollLeft = from + dist * eased;
        if (t < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          cancelAnim(el);
        }
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [cancelAnim],
  );

  /**
   * 스크롤 위치와 목표를 '한 벌' 단위로 통째로 옮겨 가운데 벌 안으로 접는다.
   *
   * 한 벌의 폭(`count * step`)만큼 이동시키면 같은 카드가 같은 자리에 오므로
   * 애니메이션 도중이어도 화면은 한 픽셀도 달라지지 않는다. 그래서 반올림 없이
   * 소수점 위치 그대로 더하고 뺀다.
   */
  const fold = useCallback(
    (el: HTMLDivElement) => {
      if (!looping) return;
      const span = count * stepOf(el);
      if (span <= 0) return;
      let pos = el.scrollLeft;
      let shift = 0;
      while (pos < span) {
        pos += span;
        shift += count;
      }
      while (pos >= span * 2) {
        pos -= span;
        shift -= count;
      }
      if (shift === 0) return;
      el.scrollLeft = pos;
      targetRef.current += shift;
    },
    [count, looping, stepOf],
  );

  /**
   * 한 칸 이동. 좌우 핸들과 자동 넘김이 함께 쓴다.
   *
   * 다음 목표가 가운데 벌을 벗어나면 위치와 목표를 한 벌 폭만큼 함께 옮겨
   * 가운데 벌로 되돌린 뒤 애니메이션을 건다. 한 벌 폭 이동은 애니메이션
   * 도중이어도 화면 픽셀이 같아서 눈에는 그냥 다음 칸으로 가는 것으로 보인다.
   *
   * 상한 클램프로 막으면 안 된다 — 시작점(가운데 벌 첫 칸)에서 상한까지는 한
   * 벌 거리라, 연타하면 목표가 상한에 눌린 채 트랙 끝으로 밀리거나 같은 좌표만
   * 반복 요청하게 된다. 하한은 한 칸 거리라 비대칭 증상이 났었다 (KAN-382).
   */
  const goBy = useCallback(
    (delta: number) => {
      const el = trackRef.current;
      if (!el) return;
      const step = stepOf(el);
      // 애니메이션 중이 아닌데 목표와 위치가 어긋나 있으면(스와이프 직후 등)
      // 현 위치 기준으로 목표를 다시 잡는다. 애니메이션 중엔 목표가 진실이다
      if (
        animRef.current === null &&
        Math.abs(targetRef.current * step - el.scrollLeft) > 1
      ) {
        targetRef.current = Math.round(el.scrollLeft / step);
      }
      if (!looping) {
        const target = Math.max(
          0,
          Math.min(slideCount - 1, targetRef.current + delta),
        );
        targetRef.current = target;
        animateTo(el, target * step);
        return;
      }
      fold(el);
      const span = count * step;
      let target = targetRef.current + delta;
      while (target >= count * 2) {
        el.scrollLeft -= span;
        target -= count;
      }
      while (target < count) {
        el.scrollLeft += span;
        target += count;
      }
      targetRef.current = target;
      animateTo(el, target * step);
    },
    [animateTo, count, fold, looping, slideCount, stepOf],
  );

  function onScroll() {
    const el = trackRef.current;
    if (!el || count === 0) return;
    const i = Math.round(el.scrollLeft / stepOf(el));
    setActive(Math.max(0, Math.min(slideCount - 1, i)) % count);
  }

  /**
   * 첫 페인트 전에 가운데 벌로 자리를 옮긴다. `useEffect`로 하면 0번 슬라이드가
   * 한 프레임 보였다가 튀어 들어간다.
   */
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el || !looping) return;
    targetRef.current = base;
    el.scrollLeft = base * stepOf(el);
  }, [base, looping, stepOf]);

  /**
   * 트랙 '폭'이 바뀌면 한 칸의 폭도 바뀌어 스크롤 좌표가 어긋난다. 보고 있던
   * 슬라이드 좌표로 즉시 다시 앵커링한다.
   *
   * 높이 변화는 무시해야 한다 — 웹 카드의 트윗 임베드가 로드되며 트랙 높이가
   * 연달아 변하는데, 그때마다 앵커링하면 진행 중인 smooth 애니메이션이 즉시
   * 점프로 끊긴다. 새로고침 직후 첫 클릭들이 턱턱 걸리던 원인 중 하나다.
   */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      el.scrollLeft = targetRef.current * stepOf(el);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [stepOf]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || count < 2) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let wrapTimer: ReturnType<typeof setTimeout> | null = null;

    function schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(advance, AUTOPLAY_MS);
    }

    function advance() {
      // 잡고 있으면 넘기지 않는다 — 떼는 순간 release가 새로 건다
      if (holdingRef.current) return;
      // 백그라운드 탭에서는 자리만 지키다 다음 기회를 본다
      if (document.hidden) {
        schedule();
        return;
      }
      // 항상 오른쪽으로 한 칸. 끝단은 복제본이 받아 주고 wrap이 뒤에서 정리한다
      goBy(1);
      schedule();
    }

    function armWrap() {
      if (wrapTimer) clearTimeout(wrapTimer);
      wrapTimer = setTimeout(wrap, IDLE_MS);
    }

    /**
     * 스크롤이 멎은 뒤, 위치가 가운데 벌 밖이면 같은 카드의 가운데 벌 좌표로
     * 순간이동시킨다. 복제본과 픽셀이 같아 화면은 그대로고 양옆 여유만 복구된다.
     */
    function wrap() {
      // 손가락이 닿아 있으면 발밑에서 내용이 튄다 — 뗄 때 release가 다시 건다
      if (holdingRef.current) return;
      const step = stepOf(el!);
      if (step <= 0) return;
      const raw = Math.round(el!.scrollLeft / step);
      // 스냅이 아직 자리를 잡는 중이면 순간이동이 튄다. 다음 기회를 본다
      if (Math.abs(el!.scrollLeft - raw * step) > 1) {
        armWrap();
        return;
      }
      // 스와이프로 멈춘 자리도 목표로 삼아야 다음 핸들 클릭이 여기서 이어진다
      targetRef.current = raw;
      if (raw >= count && raw < count * 2) return;
      const normalized = count + (((raw % count) + count) % count);
      targetRef.current = normalized;
      el!.scrollLeft = normalized * step;
    }

    function hold() {
      holdingRef.current = true;
      if (timer) clearTimeout(timer);
      // 도는 애니메이션은 손가락에게 즉시 넘겨준다 — 프레임마다 대입하는
      // 애니메이션과 드래그가 scrollLeft를 놓고 싸우면 안 된다
      cancelAnim(el!);
      // 손가락이 막 닿은 지금은 아직 안 움직였다. 여기서 가운데 벌로 접어 두면
      // 이번 드래그는 양쪽으로 한 벌씩 여유를 갖고 시작한다 (KAN-382)
      fold(el!);
    }

    function release() {
      holdingRef.current = false;
      schedule();
      // 관성 없이 그냥 뗀 경우 scroll 이벤트가 더 오지 않아 여기서 직접 건다
      armWrap();
    }

    /**
     * 터치 스크롤이 시작되면 브라우저가 pointercancel을 쏴서 pointer 쌍만으로는
     * 손가락이 아직 닿아 있는데 release로 오인한다. 그래서 터치는 touch 이벤트로
     * 잡고 pointer 이벤트는 마우스 드래그에만 쓴다.
     */
    function pointerHold(e: PointerEvent) {
      if (e.pointerType === "mouse") hold();
    }
    function pointerRelease(e: PointerEvent) {
      if (e.pointerType === "mouse") release();
    }

    // 스와이프 관성이든 자동 넘김 애니메이션이든 스크롤이 이는 동안 타이머를
    // 계속 뒤로 민다 — 움직임이 멎은 시점부터 온전한 간격을 센다
    function onAnyScroll() {
      if (holdingRef.current) return;
      schedule();
      armWrap();
    }

    // 트랙패드·휠 가로 스크롤도 드래그처럼 유저에게 주도권을 넘긴다
    function onWheel() {
      cancelAnim(el!);
    }

    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("touchend", release);
    el.addEventListener("touchcancel", release);
    el.addEventListener("pointerdown", pointerHold);
    el.addEventListener("pointerup", pointerRelease);
    el.addEventListener("scroll", onAnyScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });

    schedule();

    return () => {
      if (timer) clearTimeout(timer);
      if (wrapTimer) clearTimeout(wrapTimer);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchend", release);
      el.removeEventListener("touchcancel", release);
      el.removeEventListener("pointerdown", pointerHold);
      el.removeEventListener("pointerup", pointerRelease);
      el.removeEventListener("scroll", onAnyScroll);
      el.removeEventListener("wheel", onWheel);
      cancelAnim(el);
    };
  }, [cancelAnim, count, fold, goBy, stepOf]);

  return (
    <div>
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="snap-x-carousel no-scrollbar flex gap-2.5 overflow-x-auto pb-2"
        >
          <div aria-hidden className="w-[calc(7%-10px)] shrink-0" />
          {slides.map((card, i) => (
            /* 목록이 재정렬되지 않는 정적 렌더라 인덱스 키로 충분하다 */
            <div
              key={i}
              /* 가운데 벌만 진짜다. 앞뒤 복제본은 보조 기술에서 숨긴다 */
              aria-hidden={looping && (i < base || i >= base + count)}
              className={`w-[86%] shrink-0 snap-center ${cardClassName}`}
            >
              {card}
            </div>
          ))}
          <div aria-hidden className="w-[calc(7%-10px)] shrink-0" />
        </div>
        {looping && (
          /* 카드 박스(트랙에서 pb-2를 뺀 영역)에 맞춰 핸들을 세로 중앙에 건다.
             좌우 7%는 스페이서 폭이라 핸들이 가운데 카드 모서리에 물린다 */
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-2">
            <CarouselHandle side="prev" onClick={() => goBy(-1)} />
            <CarouselHandle side="next" onClick={() => goBy(1)} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-1 pt-1">
        {cards.map((_, i) => (
          <span
            key={i}
            className={
              i === active
                ? "bg-accent rounded-pill h-1 w-3"
                : "bg-text-4/40 rounded-pill size-1"
            }
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 캐러셀 좌우 이동 핸들 — 인스타그램 캐러셀과 같은 꼴이다. 반투명 흰 원판에
 * 짙은 셰브론을 얹고 테두리와 블러는 두지 않는다.
 *
 * 사진 위에 얹히는 컨트롤이라 색은 테마를 타지 않는 미디어 토큰을 쓴다 —
 * 원판은 `media-on`(사진 위 고정 흰색), 셰브론은 `media`(사진 자리 짙은 배경색).
 *
 * @param side - 이동 방향. 왼쪽 핸들은 셰브론을 180도 돌려 쓴다.
 * @param onClick - 한 칸 이동 핸들러.
 */
function CarouselHandle({
  side,
  onClick,
}: {
  side: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "prev" ? "이전 핫이슈" : "다음 핫이슈"}
      onClick={onClick}
      className={`bg-media-on/65 text-media rounded-pill pointer-events-auto absolute top-1/2 flex size-7 -translate-y-1/2 items-center justify-center transition-opacity hover:opacity-100 active:opacity-70 ${
        side === "prev"
          ? "left-[7%] -translate-x-1/2"
          : "right-[7%] translate-x-1/2"
      }`}
    >
      {/* 셰브론은 획이 열린 쪽(꺾인 안쪽)에 여백이 더 넓어 보여서, 기하학적
          정중앙에 두면 안쪽으로 쏠려 보인다. 진행 방향으로 1px 밀어 시각 중심을
          맞춘다 */}
      <ChevronMiniIcon
        size={HANDLE_ICON}
        className={
          side === "prev" ? "-translate-x-px rotate-180" : "translate-x-px"
        }
      />
    </button>
  );
}
