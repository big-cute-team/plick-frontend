# fonts

Noto Sans KR 셀프호스팅 서브셋 생성 도구다(KAN-567). 산출물은 두 앱 `app/fonts/NotoSansKR-Variable.woff2`와
웹 OG 렌더용 `apps/web/assets/og/NotoSansKR-{Bold,Black}.ttf`로 커밋되어 있어 평소에는 돌릴 일이 없다.
글자 범위나 굵기가 바뀔 때만 다시 돌린다.

원본은 google/fonts 저장소의 가변 TTF(`NotoSansKR[wght].ttf`, 10MB)다. 그대로 실으면 한글 전 글리프라
너무 커서 KS X 1001 완성형 2,350자와 라틴, 문장부호, 자모(`ㅋㅋ` 같은 초성)만 남긴다(`unicodes.txt`).
서브셋 밖 희귀 음절은 브라우저가 시스템 폰트로 대체한다. 라이선스는 `OFL.txt`다.

```bash
cd scripts/fonts
curl -sSL -o NotoSansKR.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf"
python3 -m pip install --target pylib fonttools brotli
PYTHONPATH=pylib ./subset-noto.sh
```

`subset-noto.sh`가 웹 폰트(가변 woff2, 약 330KB)와 OG용 정적 인스턴스(700·900 TTF)를 만들어 두 앱과
`apps/web/assets/og`에 복사한다. satori(next/og)가 woff2와 가변 폰트를 못 읽어 OG용은 정적 TTF다.

pip는 `--target`으로 이 폴더 안에만 설치한다. 시스템 파이썬 환경을 건드리지 않기 위해서다. `pylib`과
`NotoSansKR.ttf`는 커밋하지 않는다.
