# 0241. prod 릴스에 광고 없는 빈 광고 슬라이드가 서던 문제 (KAN-713)

## 무엇이 보였나

티켓은 한 줄이었다. "현재 프로덕션 릴스에서 광고를 끈 상태라 광고 칸이 안 나오는데, 릴스에서는 넘기다 보면
빈 광고 패널이 나옴. 없애야 함." 홈과 기사 상세에는 광고 자리가 하나도 안 보이는데 릴스만 8장 넘길 때마다
"광고"라는 작은 글자와 "위로 밀면 계속 볼 수 있어요"라는 안내 사이에 아무것도 없는 검은 칸이 한 장 서는
상태였다.

"광고를 끈 상태"가 코드에서 무엇을 뜻하는지부터 맞춰 봐야 했다. 광고 모드(`AdsMode`)는 `live`,
`placeholder`, `off` 셋이고(ADR 0194) prod 빌드는 `IS_PRODUCTION_SITE`가 참이라 `live`다. 끈 게 모드가
아니다. 끈 건 광고 단위 번호다. 애드센스가 아직 심사 중이라(ADR 0220) 양 앱 `_constants/ads.ts`의
`AD_UNITS`는 전부 `slot: ""`이고, 릴스 전면 자리도 `reel: { slot: "" }`이다. 즉 prod는 "모드는 live인데
단위 번호가 하나도 없는" 상태다.

## 왜 릴스만 그랬나

`AdSlot`은 이 상태를 알고 있었다. KAN-652 때부터 `mode === "live" && !unit.slot`이면 `null`을 돌려줘서
승인 전 prod에 빈 회색 칸을 남기지 않았다. ADR 0194에 "지금 prod에 배포되면 광고 자리는 하나도 안 보인다"고
적은 근거가 이 분기다. 홈 배너 둘과 기사 사각형은 wrapper까지 통째로 `AdSlot` 안에 있어서 이 분기 하나로
깨끗이 사라진다.

릴스는 구조가 다르다. 광고가 자리 하나가 아니라 캐러셀의 슬라이드 한 장이다. `ReelsFeed`(모바일)와
`ReelsWorkspace`(웹)가 `interleaveReelAds(reels, interval)`로 릴 배열 사이에 `{kind:"ad"}` 슬라이드를
끼우고, 그 슬라이드가 `ReelAdSlide`를 그리고, 그 안에서야 `AdSlot`이 나온다. 끼울지 말지를 정하는 코드는
이랬다.

```ts
const slides = interleaveReelAds(
  reels,
  adsMode === "off" ? null : REELS_AD_INTERVAL,
);
```

`off`만 봤다. `live`이면서 번호가 없는 경우를 몰랐다. 그래서 슬라이드는 8장마다 들어가고, 그 안의 `AdSlot`은
`null`을 돌려주고, 남는 건 "광고" 라벨과 안내 문구와 검은 배경뿐인 껍데기 슬라이드였다. dev와 로컬은
`placeholder`라 점선 상자가 채워져서 눈에 띄지 않았고, prod는 애드센스 승인 전이라 live인데 번호가 없는
조합이 prod에서만 성립했다. 두 판정이 한 함수에 있었으면 생기지 않았을 어긋남이다.

## 어떻게 고쳤나

판정을 `@plick/core/ads`의 함수 하나로 모았다.

```ts
export function isAdUnitShown(mode: AdsMode, unit: { slot: string }): boolean {
  if (mode === "off") return false;
  if (mode === "live" && !unit.slot) return false;
  return true;
}
```

`AdSlot`(양 앱)은 두 줄짜리 자체 분기를 이 함수 호출로 바꿨고, `ReelsFeed`와 `ReelsWorkspace`는
`isAdUnitShown(adsMode, AD_UNITS.reel) ? REELS_AD_INTERVAL : null`로 끼울지를 정한다. 광고 상자를 그릴
조건과 광고 슬라이드를 끼울 조건이 같은 함수라 앞으로 한쪽만 바뀌는 일이 없다. 핵심 로직은 `packages/core`에
있고 `AD_UNITS`는 앱마다 다르니, 함수는 `{ slot: string }` 구조 타입만 받아 앱 상수를 모른다.

다른 길도 생각했다. `ReelAdSlide`가 `AdSlot`이 비었는지 보고 스스로 안 그리게 하는 것이다. 하지만 슬라이드가
렌더에서 `null`이 되면 Embla 캐러셀의 슬라이드 수(`slides.length + trailing`)와 실제 DOM 슬라이드 수가
어긋난다. 활성 인덱스, 주소 동기화, 조회 기록 rank가 전부 슬라이드 순번을 쓰고 있어(ADR 0194) 슬라이드
배열을 만드는 단계에서 빼는 게 맞다.

`REELS_AD_INTERVAL`의 JSDoc이 새 함수 위로 밀려 붙어 있던 것도 제자리로 옮겼다. 전부터 주석 두 개가
연달아 서 있어 첫 줄 설명이 다른 심볼에 붙어 있었다.

## 승인 뒤에는

애드센스가 승인되고 `AD_UNITS.reel.slot`에 번호를 채우면 같은 함수가 참을 돌려줘서 릴스 전면광고가 8장마다
다시 선다. 코드를 또 고칠 일은 없다. 번호를 채우되 광고를 잠시 내리고 싶으면 번호를 비우면 되고, 그러면 이번처럼
슬라이드까지 같이 빠진다.

## 검증

`tests/unit/ads.test.mjs`에 둘을 더했다. 모드와 번호 유무 여섯 조합의 판정값, 그리고 피드가 쓰는 조합
(`live` + 빈 번호면 interval이 `null`)으로 20장을 끼웠을 때 광고 슬라이드가 0장, 번호가 있으면 2장이라는
것이다. 단위 테스트 310개가 통과했고 `pnpm lint`, `pnpm check-types`, Prettier도 통과했다.

화면으로도 봤다. 사용자의 dev 서버가 떠 있어 Next 16 dev 잠금에 걸리길래(ADR 0171 검증 환경과 같다)
`NEXT_PUBLIC_ADS_MODE=live`와 prod BE로 모바일을 빌드해 `next start`(3061)로 띄웠다. 이 빌드는 prod와
같은 "live인데 번호 없음" 조합이다. 홈에서 `data-ad-placement`가 0개라 placeholder가 아니라 live임을 먼저
확인했고(placeholder면 점선 AD 상자 둘이 보인다), 릴스는 첫 페이지 릴 10장에 `main section`이 10개, "광고"
라벨 슬라이드 0개, "위로 밀면 계속 볼 수 있어요" 문구 없음이었다. 고치기 전 로직은 같은 10장에서 9번째가 광고라
슬라이드가 11장(`rrrrrrrrArr`)이었고, 지금은 10장(`rrrrrrrrrr`)이다. 콘솔의 401·403은 prod BE를 로컬에서
붙일 때 늘 나오는 게스트 인증·조회 기록 거절이라 이번 변경과 무관하다.
