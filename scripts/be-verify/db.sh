#!/usr/bin/env bash
#
# 공유 Supabase Postgres에 psql을 붙인다 (BE .env의 DB_URL·DB_USERNAME·DB_PASSWORD를 런타임에 읽음).
# 로컬 psql이 있으면 그걸 쓰고, 없으면 docker의 postgres:16-alpine으로 대신 붙는다.
#
#   ./scripts/be-verify/db.sh -c "select user_id, nickname from users where provider_id like 'KAN999%'"
#   ./scripts/be-verify/db.sh -tA -c "select count(*) from favorite_teams where user_id=16"
#   PLICK_BE_DIR=~/dev/plick-backend ./scripts/be-verify/db.sh -c "\d users"
#
# ⚠️ 공유 DB다. 읽기는 자유롭게, 쓰기는 자기가 만든 일회용 테스트 행에만.

set -euo pipefail

BE_DIR="${PLICK_BE_DIR:-$HOME/Documents/plick-backend}"
BE_DIR="${BE_DIR/#\~/$HOME}"
ENV_FILE="$BE_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "BE .env를 못 찾았다: $ENV_FILE (PLICK_BE_DIR로 위치를 알려준다)" >&2
  exit 1
fi

read_env() {
  sed -nE "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$ENV_FILE" | head -1 | tr -d '"'"'"'\r'
}

DB_URL="$(read_env DB_URL)"
PGUSER="$(read_env DB_USERNAME)"
PGPASSWORD="$(read_env DB_PASSWORD)"

if [[ -z "$DB_URL" || -z "$PGUSER" || -z "$PGPASSWORD" ]]; then
  echo "BE .env에 DB_URL·DB_USERNAME·DB_PASSWORD가 다 있어야 한다." >&2
  exit 1
fi

# jdbc:postgresql://host:port/db?params → host / port / db
HOSTPORTDB="${DB_URL#jdbc:postgresql://}"
HOSTPORTDB="${HOSTPORTDB%%\?*}"
PGHOST="${HOSTPORTDB%%:*}"
REST="${HOSTPORTDB#*:}"
PGPORT="${REST%%/*}"
PGDATABASE="${REST#*/}"

# Supabase pooler는 DB_URL에 적힌 5432가 '세션 모드'(pool_size 15)라 BE·팀원이 물고 있으면
# 곧바로 EMAXCONNSESSION으로 막힌다. 우리 용도는 단발 쿼리뿐이므로 트랜잭션 모드(6543)로 붙는다.
if [[ "$PGHOST" == *pooler.supabase.com && -z "${PLICK_DB_PORT:-}" ]]; then
  PGPORT=6543
fi
PGPORT="${PLICK_DB_PORT:-$PGPORT}"

export PGPASSWORD

if command -v psql >/dev/null 2>&1; then
  exec psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" "$@"
fi

exec docker run --rm -i \
  -e PGPASSWORD \
  postgres:16-alpine \
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" "$@"
