import type { Page } from "@playwright/test";

/**
 * 모바일 제스처. 릴스 피드는 휠로는 안 넘어가고 실제 터치 드래그에만 반응해서
 * CDP Input.dispatchTouchEvent로 손가락 하나를 끌어 준다. Playwright 공개 API에는 스와이프가 없다.
 */
export async function swipeUp(
  page: Page,
  { x = 180, from = 600, to = 150, step = 50 } = {},
) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: from }],
    });
    for (let y = from - step; y > to; y -= step) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y }],
      });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await cdp.detach();
  }
}
