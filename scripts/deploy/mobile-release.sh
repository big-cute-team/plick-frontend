#!/usr/bin/env bash
#
# EC2에서 도는 릴리스 교체 스크립트. 배포 워크플로가 ssh 표준입력으로 흘려보내
# 실행하므로, 이 파일이 서버에 존재할 필요는 없다.
#
# 환경변수 SHA를 받아 releases/<SHA>를 만들고 current 심볼릭 링크를 그쪽으로
# 돌린 뒤 pm2를 재기동한다. 헬스체크가 실패하면 직전 릴리스로 되돌린다.

set -euo pipefail

APP=/srv/plick-mobile
PM2_NAME=plick-mobile

: "${SHA:?SHA 환경변수가 필요하다}"

NEW="$APP/releases/$SHA"
TARBALL="/tmp/mobile-$SHA.tar.gz"

# 되돌릴 대상. readlink는 심볼릭 링크가 가리키는 경로를 그대로 준다.
# 첫 배포라 current가 없으면 빈 문자열이고, 그때는 롤백할 곳도 없다.
PREV="$(readlink "$APP/current" || true)"

rm -rf "$NEW"
mkdir -p "$NEW"
tar -xzf "$TARBALL" -C "$NEW"
rm -f "$TARBALL"

ln -sfn "$NEW" "$APP/current"

# 런타임 env는 릴리스 밖(shared)에 있어 배포와 무관하게 유지된다.
# set -a 구간에서 읽어야 이후 pm2가 자식 프로세스에 물려준다.
set -a
# shellcheck disable=SC1091
. "$APP/shared/.env"
set +a

cd "$APP/current/apps/mobile"

if pm2 describe "$PM2_NAME" > /dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start server.js --name "$PM2_NAME" --cwd "$APP/current/apps/mobile" --update-env
fi

pm2 save

# 기동에 몇 초 걸리므로 바로 판정하지 않고 최대 40초까지 기다린다.
healthy=0
for _ in $(seq 1 20); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT:-3001}/api/health" || true)"
  if [ "$code" = "200" ]; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" != "1" ]; then
  echo "헬스체크 실패 — 새 릴리스가 뜨지 않았다"
  if [ -n "$PREV" ]; then
    echo "직전 릴리스로 되돌린다: $PREV"
    ln -sfn "$PREV" "$APP/current"
    cd "$APP/current/apps/mobile"
    pm2 restart "$PM2_NAME" --update-env || true
  else
    echo "직전 릴리스가 없어 되돌리지 못한다 (첫 배포)"
  fi
  exit 1
fi

# 디스크가 차지 않게 최근 5개만 남긴다. 롤백은 이 범위 안에서만 가능하다.
ls -1dt "$APP"/releases/*/ | tail -n +6 | xargs -r rm -rf

echo "배포 완료: $SHA"
