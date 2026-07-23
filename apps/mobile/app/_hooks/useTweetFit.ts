"use client";

import { useEffect, useRef, useState } from "react";

/** 본문을 아무리 줄여도 남기는 최소 줄수 — 그 아래로는 요약 가치가 없다 */
const MIN_BODY_LINES = 2;

/**
 * react-tweet 본문 p (react-tweet dist 구조: div.react-tweet-theme > article).
 * 직계 체인이라 인용 트윗의 본문은 잡히지 않는다.
 */
const BODY_SELECTOR = ".react-tweet-theme > article > p";

/**
 * 카드가 박스보다 크면 본문 텍스트부터 줄이는(-webkit-line-clamp) 트윗 카드
 * 크기 맞춤 (KAN-284 후속).
 *
 * 처음엔 카드 전체를 transform scale로 축소했는데, 긴 트윗은 글자가 읽기 어려울
 * 만큼 작아졌다. 그래서 순서를 바꿨다 — 카드(특히 사진) 크기는 유지하고, 넘치는
 * 만큼 본문 줄수를 계산해 말줄임하고, 최소 줄수까지 줄여도 사진 때문에 안
 * 들어갈 때만 잔여분을 scale로 축소하는 안전망을 남긴다.
 *
 * react-tweet의 components 오버라이드는 본문(TweetBody)을 열어주지 않아 DOM에
 * 직접 스타일을 건다. 자연 높이는 클램프를 풀지 않고 클램프된 p의
 * scrollHeight로 역산한다 — 풀었다 다시 걸면 ResizeObserver가 매번 발화해
 * 루프를 돈다. 같은 이유로 스타일은 값이 달라질 때만 쓴다.
 *
 * 컨테이너·콘텐츠 양쪽을 ResizeObserver로 재서, 임베드 로딩으로 콘텐츠가
 * 자라거나 릴 세부 시트로 박스가 줄어드는(트랜지션 프레임 포함) 변화를 모두
 * 따라간다.
 *
 * @returns outerRef를 박스에, innerRef를 scale을 적용할 카드 래퍼에 단다.
 */
export function useTweetFit<
  TOuter extends HTMLElement,
  TInner extends HTMLElement,
>() {
  const outerRef = useRef<TOuter>(null);
  const innerRef = useRef<TInner>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function update() {
      const boxH = outer!.clientHeight;
      const body = inner!.querySelector<HTMLParagraphElement>(BODY_SELECTOR);

      if (body && boxH) {
        /* 클램프에 잘려 숨은 높이 — 0이면 지금 전부 보이는 상태다 */
        const hiddenH = body.scrollHeight - body.clientHeight;
        const naturalCardH = inner!.offsetHeight + hiddenH;

        if (naturalCardH <= boxH) {
          clearClamp(body);
        } else {
          /* 본문을 뺀 카드 몫(헤더·사진·액션·여백)은 클램프와 무관하게 일정하다 */
          const chromeH = inner!.offsetHeight - body.clientHeight;
          const lineH = parseFloat(getComputedStyle(body).lineHeight);
          if (lineH > 0) {
            applyClamp(
              body,
              Math.max(MIN_BODY_LINES, Math.floor((boxH - chromeH) / lineH)),
            );
          }
        }
      }

      /* 스타일 변경 뒤 재측정(동기 리플로우) — 클램프로도 못 넣은 잔여분만 축소 */
      const innerW = inner!.offsetWidth;
      const innerH = inner!.offsetHeight;
      if (!innerW || !innerH) return;
      setScale(Math.min(1, outer!.clientWidth / innerW, boxH / innerH));
    }

    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return { outerRef, innerRef, scale };
}

/** 이미 같은 줄수면 건드리지 않는다 — RO 재발화 루프 방지의 핵심 */
function applyClamp(body: HTMLParagraphElement, lines: number) {
  const value = String(lines);
  if (body.style.getPropertyValue("-webkit-line-clamp") === value) return;
  body.style.setProperty("display", "-webkit-box");
  body.style.setProperty("-webkit-box-orient", "vertical");
  body.style.setProperty("-webkit-line-clamp", value);
  body.style.setProperty("overflow", "hidden");
}

function clearClamp(body: HTMLParagraphElement) {
  if (!body.style.getPropertyValue("-webkit-line-clamp")) return;
  body.style.removeProperty("display");
  body.style.removeProperty("-webkit-box-orient");
  body.style.removeProperty("-webkit-line-clamp");
  body.style.removeProperty("overflow");
}
