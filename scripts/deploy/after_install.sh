#!/usr/bin/env bash
#
# CodeDeploy AfterInstall 훅. v1 release.sh의 몸통이 여기로 왔다.
# 에이전트가 번들을 /srv/plick/bundle에 복사해 둔 상태에서, tarball을 앱 디렉터리에
# 풀고 Parameter Store에서 .env를 만든다. S3 다운로드는 에이전트 몫이라 여기 없다.

set -euo pipefail

tar -xzf /srv/plick/bundle/web.tar.gz -C /srv/plick/web
tar -xzf /srv/plick/bundle/mobile.tar.gz -C /srv/plick/mobile

# 런타임 환경변수는 SSM Parameter Store가 단일 출처다. 값 변경은 파라미터 수정 후
# 재배포로 반영한다. 읽기 권한은 인스턴스 롤(plick-frontend-ec2-role)의 인라인 정책.
aws ssm get-parameter --region ap-northeast-2 \
  --name /plick/frontend/web/env --with-decryption \
  --query Parameter.Value --output text > /srv/plick/web/.env
aws ssm get-parameter --region ap-northeast-2 \
  --name /plick/frontend/mobile/env --with-decryption \
  --query Parameter.Value --output text > /srv/plick/mobile/.env

chmod 600 /srv/plick/web/.env /srv/plick/mobile/.env
