#!/usr/bin/env bash
# Noto Sans KR 가변 TTF를 KS X 1001 서브셋 woff2와 OG용 정적 TTF로 만든다 (KAN-567).
# 사용법은 README.md. fonttools와 brotli가 PYTHONPATH에 있어야 한다.
set -euo pipefail
cd "$(dirname "$0")"

SRC=NotoSansKR.ttf
[ -f "$SRC" ] || { echo "원본 $SRC 이 없다. README의 curl로 받는다." >&2; exit 1; }

python3 -m fontTools.subset "$SRC" \
  --unicodes-file=unicodes.txt --flavor=woff2 --layout-features='*' --name-IDs='*' \
  --no-hinting --desubroutinize --output-file=NotoSansKR-Variable.woff2

for W in 700 900; do
  python3 - "$SRC" "$W" <<'EOF'
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
src, w = sys.argv[1], int(sys.argv[2])
instancer.instantiateVariableFont(TTFont(src), {"wght": w}).save(f"NotoSansKR-{w}.ttf")
EOF
  python3 -m fontTools.subset "NotoSansKR-$W.ttf" \
    --unicodes-file=unicodes.txt --layout-features='*' --name-IDs='*' --no-hinting \
    --output-file="NotoSansKR-$W-subset.ttf"
done

cp NotoSansKR-Variable.woff2 ../../apps/mobile/app/fonts/NotoSansKR-Variable.woff2
cp NotoSansKR-Variable.woff2 ../../apps/web/app/fonts/NotoSansKR-Variable.woff2
cp NotoSansKR-700-subset.ttf ../../apps/web/assets/og/NotoSansKR-Bold.ttf
cp NotoSansKR-900-subset.ttf ../../apps/web/assets/og/NotoSansKR-Black.ttf
rm -f NotoSansKR-700.ttf NotoSansKR-900.ttf NotoSansKR-700-subset.ttf NotoSansKR-900-subset.ttf NotoSansKR-Variable.woff2
ls -la ../../apps/mobile/app/fonts ../../apps/web/assets/og
