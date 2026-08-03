#!/usr/bin/env bash
#
# CodeDeploy ValidateService 훅. 두 포트의 /api/health가 200을 줄 때까지 기다린다.
# 여기서 실패하면 CodeDeploy가 배포를 Failed 처리하고 트래픽은 Blue에 남는다.
# v1처럼 스크립트가 직접 롤백할 필요가 없다.

set -euo pipefail

check() {
  local port="$1"
  local code

  # 기동에 몇 초 걸리므로 바로 판정하지 않고 최대 60초까지 기다린다.
  for _ in $(seq 1 30); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api/health" || true)"
    if [ "$code" = "200" ]; then
      echo "port $port healthy"
      return 0
    fi
    sleep 2
  done

  echo "port $port 헬스체크 실패 — 마지막 응답 코드: $code"
  return 1
}

check 3000
check 3001
