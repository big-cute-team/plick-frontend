# 0244. 광고 단위 번호 없는 prod 릴스에서 빈 전면광고 슬라이드를 걷었다 (KAN-730)

## 증상

prod는 아직 애드센스 승인 전이라 광고를 켠 적이 없다. 그런데 m.plick.co.kr에서 릴스를 넘기다 보면 8장마다 "광고"라는
작은 글자와 "위로 밀면 계속 볼 수 있어요" 안내만 있고 가운데가 텅 빈 슬라이드가 한 장 나온다. 데스크톱 plick.co.kr의
릴스도 같은 자리에 "아래로 넘기면 계속 볼 수 있어요"만 있는 빈 카드가 선다. 광고가 없는데 광고 자리가 있으니 사용자
입장에서는 로딩이 깨진 것처럼 보인다. 이 세션은 그 원인을 찾아 티켓(KAN-730)을 만들고 고친 기록이다.

## 왜 생겼나

광고는 KAN-652(ADR 0220)에서 붙였다. 구조를 짧게 되짚으면 이렇다. `@plick/core/ads`의 `AdsMode`가 `live`, `placeholder`,
`off` 셋이고, 각 앱 `_constants/ads.ts`의 `ADS_BASE_MODE`가 빌드 시점에 기본 모드를 정한다. `IS_PRODUCTION_SITE`가
참인 prod 빌드만 `live`고 dev와 로컬은 `placeholder`다. 앱 셸(RN WebView) 안이면 `AdsProvider`가 브라우저에서 UA를
보고 `off`로 내린다. 자리마다 `AdSlot` 하나가 서고, 같은 파일의 `AD_UNITS`에 자리별 애드센스 광고 단위 번호(`slot`)와
크기가 있다. 번호는 애드센스 승인 뒤 대시보드에서 만들어 채우기로 하고 전부 빈 문자열로 뒀다.

`AdSlot`은 이 빈 번호를 이미 알고 있었다. `live` 모드인데 `slot`이 비면 빈 칸을 남기지 않으려고 `null`을 돌려 아무것도
안 그린다. 홈 배너 둘과 기사 사각형은 `AdSlot` 하나가 자리의 전부라 이 한 줄로 prod에서 완전히 사라졌고, 그래서
"광고를 안 켰다"는 감각과 맞았다.

릴스 전면광고만 구조가 다르다. 광고는 캐러셀의 슬라이드 한 장이라 `AdSlot` 바깥에 껍데기가 있다. `interleaveReelAds`가
릴 배열에 8장마다 `{ kind: "ad" }` 슬라이드를 끼우고, 모바일 `ReelsFeed`와 웹 `ReelsWorkspace`가 그 슬라이드를
`ReelAdSlide`로 그린다. `ReelAdSlide`는 섹션 안에 "광고" 라벨, `AdSlot placement="reel"`, 넘기는 안내문 세 가지를 둔다.
끼울지 말지는 `adsMode === "off" ? null : REELS_AD_INTERVAL`로 정했다. 즉 모드가 `off`만 아니면 끼웠다.

prod는 `live`다. 그래서 슬라이드는 끼워지고, 그 안의 `AdSlot`만 번호가 비어 `null`을 돌린다. 라벨과 안내문은 `AdSlot`
밖에 있으니 그대로 남는다. 그게 사용자가 본 빈 슬라이드다. 요약하면 "이 자리에 상자를 그리나"라는 판정이 `AdSlot` 안에
갇혀 있었고, 릴스 쪽은 그 판정을 모른 채 모드 하나만 보고 껍데기를 세웠다. dev와 로컬은 `placeholder`라 점선 상자가
채워져 있어서 빈 슬라이드가 보일 일이 없었고, E2E도 dev를 타니 잡히지 않았다. prod에서만, 그것도 승인 전이라는 기간
한정으로만 드러나는 틈이었다.

## 어떻게 고쳤나

판정을 한 곳으로 모았다. `@plick/core/ads`에 `isAdUnitDrawn(mode, slot)`을 두고 `off`면 거짓, `live`면 번호가 있을
때만 참, `placeholder`면 참을 돌린다. `AdSlot`의 두 줄짜리 이른 반환(`off`면 null, `live`에 번호 없으면 null)을 이
함수 호출 한 줄로 바꿨다. 동작은 전과 같고 판정 주인이 바뀐 것뿐이다.

릴스는 그 위에 `reelAdInterval(mode, slot)`을 하나 더 뒀다. `isAdUnitDrawn`이 참이면 `REELS_AD_INTERVAL`(8), 아니면
`null`을 돌리고, `null`이면 `interleaveReelAds`가 릴만 감싼다. 두 피드의 `adsMode === "off" ? null : REELS_AD_INTERVAL`를
`reelAdInterval(adsMode, AD_UNITS.reel.slot)`로 바꿨다. 릴스 자리의 단위 번호를 피드가 직접 넘기는 모양이라, 나중에
승인이 나서 `AD_UNITS.reel.slot`을 채우면 코드를 더 건드리지 않아도 전면광고가 다시 선다. 반대로 번호가 비어 있는 한
어떤 빌드에서도 빈 슬라이드가 끼지 않는다.

`REELS_AD_INTERVAL` 위에 있어야 할 JSDoc이 그 사이에 끼어든 `adsPauseScript` 블록 위로 밀려 있던 것도 같이 바로잡았다.
전 세션에서 함수를 끼워 넣으며 주석이 상수와 떨어진 것인데, 이번에 그 자리에 함수 둘을 더하면서 눈에 띄었다.

한 가지 생각해 본 대안은 `ReelAdSlide` 안에서 `useAdsMode`를 읽어 그릴 게 없으면 섹션을 비우는 것이었다. 그러면
슬라이드는 여전히 끼워지고 빈 섹션 한 장을 넘겨야 하니, 안 보이는 광고 때문에 스와이프 한 번을 더 하게 된다. 조회
기록의 `rank`와 프리페치 남은 장수도 슬라이드 순번과 릴 순번을 환산하는 `reelIndexAt`를 거치는데 빈 슬라이드가 그
환산에 계속 끼는 것도 어색했다. 슬라이드를 아예 안 끼우는 쪽이 맞다.

## 검증

`tests/unit/ads.test.mjs`에 둘을 더했다. `isAdUnitDrawn`의 다섯 조합(off, placeholder 번호 유무, live 번호 유무)과,
`reelAdInterval`이 `live`에 빈 번호면 `null`이고 그 값을 `interleaveReelAds`에 넣으면 릴 20장이 전부 릴로 나오는 것.
`pnpm test:unit` 335개 통과. `pnpm lint`, `pnpm check-types`, `pnpm format:check`, `pnpm build` 통과.

브라우저로는 prod와 같은 조건을 로컬에 만들어 봤다. 모바일 dev 서버는 전날 띄운 3031 서버가 Next 16의 dev 잠금을 쥐고
있어 못 띄우고(이전 세션들과 같다), `NEXT_PUBLIC_ADS_MODE=live API_BASE_URL=https://plick.co.kr/be`로 빌드해 `next start`로
3072에 올렸다. 홈에서 `data-ad-placement`가 0개고 `adsbygoogle` 로더 스크립트는 있어 `live`에 번호 없는 상태가
맞음을 먼저 확인했다(`placeholder`면 홈 배너 자리에 점선 상자가 선다). `/reels`에서 `main section`을 세니 20장이고
"광고"와 "계속 볼 수 있어요"를 함께 가진 섹션은 0장이었다. 고치기 전 로직이면 8번째와 17번째 릴 뒤에 광고 섹션
2장이 끼어 22장이었을 자리다. 확인 뒤 서버를 내리고 `.claude/launch.json`에 임시로 넣었던 항목은 지웠다.

`placeholder` 경로(dev, 로컬)에서 점선 전면광고가 여전히 끼는 것은 단위 테스트(`reelAdInterval("placeholder", "")`가 8)로
확인했고 브라우저로는 못 봤다. dev 서버 잠금 때문이고, 로직상 모드가 `placeholder`면 번호와 무관하게 참이라 전과 같다.

## 남은 것

- 애드센스 승인이 나면 두 앱 `AD_UNITS.reel.slot`에 번호를 채운다. 그때 전면광고 슬라이드가 자동으로 돌아온다.
  승인 자체는 KAN-652 재심사(ADR 0220) 몫이다
- dev에서 도는 E2E는 `placeholder`라 이 회귀를 못 잡는다. prod 조건(`live` + 번호 없음)을 E2E가 보려면 빌드 환경을
  따로 둬야 해서 이번에는 단위 테스트로만 막았다
