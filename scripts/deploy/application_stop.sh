#!/usr/bin/env bash
#
# CodeDeploy ApplicationStop 훅. 기존 pm2 프로세스가 있으면 멈춘다.
# Blue/Green의 Green은 매번 새 인스턴스라 보통 할 일이 없지만(이전 리비전이 없으면
# 이 훅 자체가 건너뛰어진다), in-place로 돌릴 일이 생겨도 안전하게 stop을 넣어 둔다.

set -euo pipefail

for name in plick-web plick-mobile; do
  if pm2 describe "$name" > /dev/null 2>&1; then
    pm2 stop "$name"
  fi
done
