#!/usr/bin/env bash
#
# CodeDeploy ApplicationStart 훅. 앱별로 .env를 소싱하고 pm2로 기동한다.
#
# .env는 set -a 구간에서 읽어야 pm2가 자식 프로세스에 물려준다. 소싱 없이 restart하면
# 옛 값으로 뜨는 v1 함정이 그대로 적용된다. 앱마다 서브셸로 감싸 web의 값이 mobile에
# 새어 들어가지 않게 한다.
#
# 시작 경로는 standalone 산출물 구조(v1과 동일) 기준 /srv/plick/<app>/apps/<app>/server.js.

set -euo pipefail

start_app() {
  local app="$1"
  local root="/srv/plick/$app"
  local name="plick-$app"

  (
    set -a
    # shellcheck disable=SC1091
    . "$root/.env"
    set +a

    if pm2 describe "$name" > /dev/null 2>&1; then
      pm2 restart "$name" --update-env
    else
      pm2 start "$root/apps/$app/server.js" --name "$name" --cwd "$root/apps/$app" --update-env
    fi
  )
}

start_app web
start_app mobile

# 재부팅 시 pm2 startup 유닛이 이 목록을 복원한다.
pm2 save
