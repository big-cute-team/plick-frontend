#!/usr/bin/env bash
#
# 모니터링 EC2의 user data 스크립트를 만든다 (KAN-455).
#
# infra/monitoring/ 아래 파일(compose·프로메테우스 설정·그라파나 프로비저닝)을 tar+base64로
# 묶어 스크립트 안에 심는다. 인스턴스가 처음 부팅할 때 그 스크립트가 docker를 깔고 파일을
# 풀어 compose를 올린다. 리포가 프라이빗이라 인스턴스가 git clone을 못 하고, S3 경유는
# 버킷과 롤이 하나 더 필요해 파일을 통째로 실어 보내는 쪽이 제일 단순하다.
#
# 사용: scripts/monitoring/build-user-data.sh > /tmp/monitoring-user-data.sh
#      출력을 EC2 생성 화면의 "사용자 데이터" 칸에 붙여 넣는다.
#
# 설정을 바꿨을 때: 인스턴스를 새로 만들지 않고 반영하려면 docs/monitoring.md의
# "설정 갱신" 절대로 SSM 세션에서 파일을 갈아 끼우고 컨테이너를 재시작한다.

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
payload="$(COPYFILE_DISABLE=1 tar -C "$repo_root/infra/monitoring" --exclude=".DS_Store" -cf - . | gzip -9 | base64)"

cat <<USERDATA
#!/bin/bash
set -euxo pipefail

# Docker (공식 apt 저장소). NodeSource처럼 인터넷이 필요하다 — NAT 경유
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker
usermod -aG docker ubuntu

# 모니터링 스택 파일. 리포 infra/monitoring/을 그대로 푼 것이다
mkdir -p /srv/monitoring
echo '$payload' | base64 -d | tar -xzf - -C /srv/monitoring
chown -R ubuntu:ubuntu /srv/monitoring

# 슬랙 웹훅 (KAN-457). 시크릿은 user data에 박지 않고 SSM Parameter Store에서 읽는다.
# 인스턴스 롤에 ssm:GetParameter가 있어야 한다. 파라미터가 없으면 비워 두고 compose의
# 자리표시자로 뜬다 — 알림 전송만 실패하고 그라파나는 정상이다.
apt-get install -y awscli
webhook="\$(aws ssm get-parameter --region ap-northeast-2 \
  --name /plick/frontend/monitoring/prod/slack-webhook --with-decryption \
  --query Parameter.Value --output text 2>/dev/null || true)"
printf 'SLACK_WEBHOOK_URL=%s\n' "\$webhook" > /srv/monitoring/.env
chmod 600 /srv/monitoring/.env

# 그라파나 컨테이너는 uid 472로 돈다. 프로비저닝 폴더는 읽기 전용 마운트라 상관없지만
# named volume 초기화가 실패하지 않게 미리 만들어 둔다
cd /srv/monitoring
docker compose up -d
USERDATA
