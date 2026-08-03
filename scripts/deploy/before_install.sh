#!/usr/bin/env bash
#
# CodeDeploy BeforeInstall 훅. 앱 디렉터리를 비우고 다시 만든다.
# Green은 새 인스턴스라 보통 비어 있지만, 재배포·in-place 상황에서도 같은 결과가
# 나오게 멱등하게 짠다. /srv/plick은 user data가 만들어 두고 ubuntu 소유로 맞춰 놨다.

set -euo pipefail

rm -rf /srv/plick/web /srv/plick/mobile
mkdir -p /srv/plick/web /srv/plick/mobile
