#!/usr/bin/env bash
#
# EC2에서 도는 릴리스 교체 스크립트. 배포 워크플로가 S3에 올려 두고 SSM Run Command로
# 실행하므로, 이 파일이 서버에 미리 존재할 필요는 없다. 매 배포마다 그 커밋의 스크립트가
# S3에서 내려와 실행된다.
#
# SSM Run Command는 root로 실행되지만 pm2 데몬과 /srv는 ubuntu 소유라, 워크플로가
# sudo -u ubuntu로 내려서 이 스크립트를 돌린다. 직접 실행할 일이 있어도 ubuntu로 실행한다.
#
# web(3000)과 mobile(3001)이 같은 인스턴스에 각각 뜨므로 앱 이름을 받아 동작한다.
# 디렉터리도 pm2 프로세스도 앱마다 따로라 한쪽 배포가 다른 쪽을 건드리지 않는다.
#
# 필요한 환경변수
#   APP     web 또는 mobile
#   SHA     릴리스 식별자(커밋 해시)
#   BUCKET  배포 아티팩트 S3 버킷 이름

set -euo pipefail

: "${APP:?APP 환경변수가 필요하다 (web 또는 mobile)}"
: "${SHA:?SHA 환경변수가 필요하다}"
: "${BUCKET:?BUCKET 환경변수가 필요하다 (배포 아티팩트 S3 버킷)}"

ROOT="/srv/plick-$APP"
PM2_NAME="plick-$APP"
NEW="$ROOT/releases/$SHA"
TARBALL="/tmp/$APP-$SHA.tar.gz"

# 산출물은 러너가 S3에 올려 뒀다. 인스턴스 롤의 s3:GetObject 권한으로 내려받는다.
# 프라이빗 서브넷이지만 S3 게이트웨이 엔드포인트가 있어 NAT 없이도 닿는다.
aws s3 cp "s3://$BUCKET/deploy/$SHA/$APP.tar.gz" "$TARBALL"

# 되돌릴 대상. readlink는 심볼릭 링크가 가리키는 경로를 그대로 준다.
# 첫 배포라 current가 없으면 빈 문자열이고, 그때는 롤백할 곳도 없다.
PREV="$(readlink "$ROOT/current" || true)"

rm -rf "$NEW"
mkdir -p "$NEW"
tar -xzf "$TARBALL" -C "$NEW"
rm -f "$TARBALL"

ln -sfn "$NEW" "$ROOT/current"

# 런타임 env는 릴리스 밖(shared)에 있어 배포와 무관하게 유지된다.
# set -a 구간에서 읽어야 이후 pm2가 자식 프로세스에 물려준다.
# PORT도 여기서 온다. web은 3000, mobile은 3001.
set -a
# shellcheck disable=SC1091
. "$ROOT/shared/.env"
set +a

cd "$ROOT/current/apps/$APP"

if pm2 describe "$PM2_NAME" > /dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start server.js --name "$PM2_NAME" --cwd "$ROOT/current/apps/$APP" --update-env
fi

pm2 save

# 기동에 몇 초 걸리므로 바로 판정하지 않고 최대 40초까지 기다린다.
healthy=0
for _ in $(seq 1 20); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/api/health" || true)"
  if [ "$code" = "200" ]; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" != "1" ]; then
  echo "[$APP] 헬스체크 실패 — 새 릴리스가 뜨지 않았다"
  if [ -n "$PREV" ]; then
    echo "[$APP] 직전 릴리스로 되돌린다: $PREV"
    ln -sfn "$PREV" "$ROOT/current"
    cd "$ROOT/current/apps/$APP"
    pm2 restart "$PM2_NAME" --update-env || true
  else
    echo "[$APP] 직전 릴리스가 없어 되돌리지 못한다 (첫 배포)"
  fi
  exit 1
fi

# 디스크가 차지 않게 최근 5개만 남긴다. 롤백은 이 범위 안에서만 가능하다.
ls -1dt "$ROOT"/releases/*/ | tail -n +6 | xargs -r rm -rf

echo "[$APP] 배포 완료: $SHA"
