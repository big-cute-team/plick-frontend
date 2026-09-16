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

/** 트랙 좌우 여백. 호출부가 `[--hot-edge:…]`로 덮는다 ({@link HotCarousel}). */
const EDGE = "var(--hot-edge,7%)";

/** 한 화면에 카드 한 장만 들어가는 상태 — 점 인디케이터와 자동 넘김의 조건 */
const SOLO = 1;

/** 트랙 기하 실측값. CSS가 정하고 JS는 읽기만 한다 ({@link HotCarousel}). */
interface Metrics {
  /** 스냅 한 칸의 폭(px) = 카드 폭 + 간격 */
  step: number;
  /** 0번 슬라이드가 제자리에 앉는 scrollLeft */
  origin: number;
  /** 한 화면에 들어가는 카드 수 */
  perView: number;
}

/**
 * 핫이슈 스냅 캐러셀 + 좌우 핸들, 한 장짜리일 때만 점 인디케이터와 자동 넘김
 * (KAN-282, KAN-382, KAN-480).
 *
 * 모바일 홈 전용이던 것을 웹 홈이 두 번째 소비자가 되면서 `@plick/ui`로
 * 승격했다(KAN-338). 카드 렌더는 앱마다 달라(모바일 `HotHeroCard`, 웹 `HotCard`)
 * children으로 주입받는다 — render prop이 아니라 children인 이유는 서버 컴포넌트
 * 페이지가 함수를 클라이언트 경계 너머로 넘길 수 없어서다. 카드를 서버에서
 * 그려 엘리먼트로 넘기면 경계를 그대로 통과한다.
 *
 * ## 기하는 CSS가 정하고 JS는 잰다 (KAN-480)
 *
 * 처음엔 카드 폭이 트랙의 86%라는 걸 JS가 상수로 알고 있었다. 그런데 데스크톱
 * 홈이 한 화면에 네 장을 깔게 되면서(KAN-480) 카드 폭이 뷰포트에 따라 달라졌고,
 * 상수는 더 못 쓰게 됐다. 그렇다고 JS가 `lg` 브레이크포인트를 알면 공용 컴포넌트가
 * 앱의 레이아웃을 아는 꼴이라(ADR 0011 게이트 A) 그것도 아니다.
 *
 * 그래서 JS가 DOM에서 직접 잰다({@link Metrics}). 카드 폭은 실측하고, 한 화면에
 * 몇 장 들어가는지는 트랙 폭을 한 칸 폭으로 나눠 구하고, 정렬은 슬라이드의
 * `scroll-snap-align` 계산값을 읽는다. CSS를 어떻게 바꾸든 JS가 따라오므로 둘이
 * 어긋날 자리가 없다.
 *
 * `origin`이 필요한 이유가 정렬이다. 카드를 가운데 스냅(`snap-center`)하면 0번
 * 슬라이드가 제자리인 scrollLeft가 정확히 0이지만, 왼쪽 스냅(`snap-start`)이면
 * 트랙 앞 여백(스페이서 + 간격)만큼 밀린 자리가 0번이다. 아래 계산은 전부
 * `origin + i * step`을 i번 슬라이드의 좌표로 쓴다.
 *
 * 점 인디케이터와 자동 넘김은 한 장씩 보일 때만 붙는다. 네 장이 한꺼번에 보이는
 * 데스크톱에서는 점이 무엇을 가리키는지 알 수 없고, 읽는 중에 네 장이 통째로
 * 바뀌면 방해만 된다(KAN-480). 핸들은 화면에 보이는 수만큼 밀어 한 번에 한
 * 페이지씩 넘긴다.
 *
 * ## 무한 루프
 *
 * 카드 목록을 세 벌 이어 붙이고 가운데 벌만 '진짜'로 다룬다 (KAN-382).
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
 * @param children - 카드 목록. 각 카드는 슬라이드 래퍼를 `h-full`로 채운다.
 * @param slideClassName - 슬라이드 래퍼 클래스. 카드 폭·스냅 정렬·비율을 여기서
 *   한꺼번에 정한다. 기본은 모바일 기하(트랙의 86%를 가운데 스냅).
 *   데스크톱 홈은 `lg:` 변형을 덧붙여 한 화면에 네 장을 깐다.
 * @param className - 바깥 래퍼에 덧붙일 클래스. 좌우 여백을 바꾸려면 여기에
 *   `[--hot-edge:0px]` 꼴로 CSS 변수를 덮는다 — 스페이서 폭과 핸들 위치가 함께
 *   따라간다. 기본값 7%는 카드 폭 86%의 나머지 절반이라 첫·마지막 카드까지
 *   정확히 화면 중앙에 선다 (좌우 패딩 방식은 카드 %가 '패딩 뺀 영역' 기준이라
 *   끝단이 중앙까지 못 간다 — ADR 0002 §6-2).
 */
export function HotCarousel({
  children,
  slideClassName = "w-[86%] snap-center aspect-[181/131]",
  className = "",
}: {
  children: ReactNode;
  slideClassName?: string;
  className?: string;
}) {
  const cards = Children.toArray(children);
  const count = cards.length;

  const trackRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<Metrics>({ step: 0, origin: 0, perView: SOLO });
  /**
   * 실측한 노출 장수. 슬라이드 벌수와 점 인디케이터 유무를 바꾸므로 ref가 아니라
   * state다 — 첫 렌더는 한 장 기준으로 그리고 마운트 직후 실측으로 고쳐 잡는다.
   */
  const [perView, setPerView] = useState(SOLO);

  /** 한 화면에 다 들어오면 넘길 것이 없어 복제와 핸들을 모두 끈다 */
  const looping = count > perView;
  /** 가운데(원본) 벌이 시작하는 슬라이드 인덱스 */
  const base = looping ? count : 0;
  const slides = looping
    ? Array.from({ length: COPIES }, () => cards).flat()
    : cards;
  const slideCount = slides.length;

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

  /**
   * 트랙 기하를 다시 잰다. 폭이 달라질 때만 부르면 되므로(카드 높이는 좌표에
   * 영향이 없다) 스크롤·클릭 경로에서는 캐시된 값을 읽는다.
   *
   * 슬라이드의 콘텐츠 좌표는 화면 좌표 차이에 현재 스크롤을 더해 구한다 —
   * `offsetLeft`는 기준 조상이 무엇이냐에 따라 달라지지만 이 계산은 트랙 자신을
   * 기준으로 하므로 래퍼 구조가 바뀌어도 안전하다.
   */
  const measure = useCallback(() => {
    const el = trackRef.current;
    const first = el?.querySelector<HTMLElement>("[data-slide]");
    if (!el || !first) return metricsRef.current;

    const slideWidth = first.getBoundingClientRect().width;
    const step = slideWidth + GAP;
    if (step <= 0) return metricsRef.current;

    const left =
      first.getBoundingClientRect().left -
      el.getBoundingClientRect().left +
      el.scrollLeft;
    // 가운데 정렬이면 0번이 앉는 자리는 슬라이드가 트랙 중앙에 올 만큼 당겨진 곳,
    // 왼쪽 정렬이면 슬라이드가 서 있는 그 자리 그대로다
    const inset = getComputedStyle(first).scrollSnapAlign.includes("center")
      ? (el.clientWidth - slideWidth) / 2
      : 0;

    metricsRef.current = {
      step,
      origin: left - inset,
      perView: Math.max(SOLO, Math.round(el.clientWidth / step)),
    };
    return metricsRef.current;
  }, []);

  /** i번 슬라이드가 제자리에 앉는 scrollLeft */
  const leftOf = useCallback((i: number) => {
    const { origin, step } = metricsRef.current;
    return origin + i * step;
  }, []);

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
   *
   * 경계 비교에는 1px 여유를 둔다. step이 소수점 폭이라 span도 소수점인데,
   * 브라우저는 scrollLeft 대입을 디바이스 픽셀로 양자화해서(예: span 4453.2를
   * 대입하면 4453.0으로 읽힌다) 가운데 벌 첫 칸이 span보다 반 픽셀쯤 아래에
   * 앉는다. 엄격 비교면 그 자리를 '벌 밖'으로 오판해 pointerdown(hold)마다 한
   * 벌을 접고, 화면은 그대로지만 포인터 밑의 DOM은 복제본으로 바뀌어 down과
   * up의 target이 달라진다 — click이 공통 조상(트랙)에서 발화해 카드 링크의
   * 첫 클릭이 먹히던 원인이다. 정당한 접기는 한 벌(수천 px) 단위라 1px 여유로
   * 잃는 것은 없다.
   */
  const fold = useCallback(
    (el: HTMLDivElement) => {
      if (!looping) return;
      const { step, origin } = metricsRef.current;
      const span = count * step;
      if (span <= 0) return;
      let pos = el.scrollLeft - origin;
      let shift = 0;
      while (pos < span - 1) {
        pos += span;
        shift += count;
      }
      while (pos >= span * 2 - 1) {
        pos -= span;
        shift -= count;
      }
      if (shift === 0) return;
      el.scrollLeft = pos + origin;
      targetRef.current += shift;
    },
    [count, looping],
  );

  /**
   * 한 페이지 이동. 좌우 핸들과 자동 넘김이 함께 쓴다. 한 장씩 보이면 한 칸,
   * 네 장이 보이면 네 칸이라 화면에 보이던 카드가 통째로 교체된다 (KAN-480).
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
    (pages: number) => {
      const el = trackRef.current;
      if (!el) return;
      const { step, origin, perView: visible } = metricsRef.current;
      if (step <= 0) return;
      const delta = pages * visible;
      // 애니메이션 중이 아닌데 목표와 위치가 어긋나 있으면(스와이프 직후 등)
      // 현 위치 기준으로 목표를 다시 잡는다. 애니메이션 중엔 목표가 진실이다
      if (
        animRef.current === null &&
        Math.abs(leftOf(targetRef.current) - el.scrollLeft) > 1
      ) {
        targetRef.current = Math.round((el.scrollLeft - origin) / step);
      }
      if (!looping) {
        const target = Math.max(
          0,
          Math.min(slideCount - 1, targetRef.current + delta),
        );
        targetRef.current = target;
        animateTo(el, leftOf(target));
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
      animateTo(el, leftOf(target));
    },
    [animateTo, count, fold, leftOf, looping, slideCount],
  );

  function onScroll() {
    const el = trackRef.current;
    if (!el || count === 0) return;
    const { step, origin } = metricsRef.current;
    if (step <= 0) return;
    const i = Math.round((el.scrollLeft - origin) / step);
    setActive(Math.max(0, Math.min(slideCount - 1, i)) % count);
  }

  /**
   * 첫 페인트 전에 기하를 재고 가운데 벌로 자리를 옮긴다. `useEffect`로 하면
   * 0번 슬라이드가 한 프레임 보였다가 튀어 들어간다.
   */
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setPerView(measure().perView);
    if (!looping) return;
    targetRef.current = base;
    el.scrollLeft = leftOf(base);
  }, [base, leftOf, looping, measure]);

  /**
   * 트랙 '폭'이 바뀌면 카드 폭도 노출 장수도 달라져 스크롤 좌표가 어긋난다.
   * 다시 재고 보고 있던 슬라이드 좌표로 즉시 앵커링한다.
   *
   * 높이 변화는 무시해야 한다 — 웹 카드의 트윗 임베드가 로드되며 트랙 높이가
   * 연달아 변하는데, 그때마다 앵커링하면 진행 중인 애니메이션이 즉시 점프로
   * 끊긴다. 새로고침 직후 첫 클릭들이 턱턱 걸리던 원인 중 하나다.
   */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      setPerView(measure().perView);
      el.scrollLeft = leftOf(targetRef.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [leftOf, measure]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !looping) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let wrapTimer: ReturnType<typeof setTimeout> | null = null;

    /** 자동 넘김은 카드가 한 장씩 보일 때만 — 네 장이 통째로 바뀌면 방해다 */
    const autoplay = metricsRef.current.perView === SOLO;

    function schedule() {
      if (!autoplay) return;
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
      // 항상 오른쪽으로 한 페이지. 끝단은 복제본이 받아 주고 wrap이 뒤에서 정리한다
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
      const { step, origin } = metricsRef.current;
      if (step <= 0) return;
      const raw = Math.round((el!.scrollLeft - origin) / step);
      // 스냅이 아직 자리를 잡는 중이면 순간이동이 튄다. 다음 기회를 본다
      if (Math.abs(el!.scrollLeft - leftOf(raw)) > 1) {
        armWrap();
        return;
      }
      // 스와이프로 멈춘 자리도 목표로 삼아야 다음 핸들 클릭이 여기서 이어진다
      targetRef.current = raw;
      if (raw >= count && raw < count * 2) return;
      const normalized = count + (((raw % count) + count) % count);
      targetRef.current = normalized;
      el!.scrollLeft = leftOf(normalized);
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
  }, [cancelAnim, count, fold, goBy, leftOf, looping, perView]);

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="snap-x-carousel no-scrollbar flex gap-2.5 overflow-x-auto pb-2"
        >
          {/* 스페이서는 여백에서 간격만큼을 뺀 폭이다 — 뒤따르는 gap과 합쳐
              정확히 `--hot-edge`가 된다. 여백을 0으로 덮으면 폭이 음수라 0으로
              눌리고, 남은 gap 10px만큼 밀린 자리를 `measure`가 origin으로 잡는다 */}
          <div
            aria-hidden
            className="shrink-0"
            style={{ width: `calc(${EDGE} - ${GAP}px)` }}
          />
          {slides.map((card, i) => (
            /* 목록이 재정렬되지 않는 정적 렌더라 인덱스 키로 충분하다 */
            <div
              key={i}
              data-slide
              /* 가운데 벌만 진짜다. 앞뒤 복제본은 보조 기술에서 숨긴다 */
              aria-hidden={looping && (i < base || i >= base + count)}
              className={`shrink-0 ${slideClassName}`}
            >
              {card}
            </div>
          ))}
          <div
            aria-hidden
            className="shrink-0"
            style={{ width: `calc(${EDGE} - ${GAP}px)` }}
          />
        </div>
        {looping && (
          /* 카드 박스(트랙에서 pb-2를 뺀 영역)에 맞춰 핸들을 세로 중앙에 건다.
             좌우 여백 위에 앉아 가장자리 카드 모서리에 물린다 */
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-2">
            <CarouselHandle side="prev" onClick={() => goBy(-1)} />
            <CarouselHandle side="next" onClick={() => goBy(1)} />
          </div>
        )}
      </div>
      {/* 점은 한 장씩 보일 때만 뜻이 있다 — 네 장이 보이는 화면에서는 어느 점이
          어느 카드인지 읽히지 않아 아예 걷는다 (KAN-480) */}
      {perView === SOLO && (
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
      )}
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
 * @param onClick - 한 페이지 이동 핸들러.
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
      style={side === "prev" ? { left: EDGE } : { right: EDGE }}
      className={`bg-media-on/65 text-media rounded-pill pointer-events-auto absolute top-1/2 flex size-7 -translate-y-1/2 items-center justify-center transition-opacity hover:opacity-100 active:opacity-70 ${
        side === "prev" ? "-translate-x-1/2" : "translate-x-1/2"
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
