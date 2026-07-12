#!/usr/bin/env bash
set -euo pipefail

UNKEY_VERSION="v2.0.73"
UNKEY_RAW_URL="https://raw.githubusercontent.com/unkeyed/unkey/${UNKEY_VERSION}"
ASSET_DIR="unkey/mysql-init"

mkdir -p "$ASSET_DIR"

download() {
  local source="$1" destination="$2"
  curl --fail --location --silent --show-error \
    "${UNKEY_RAW_URL}/${source}" \
    -o "${ASSET_DIR}/${destination}"
}

download "dev/init-databases.sql" "00-init-databases.sql"
download "pkg/db/schema.sql" "01-schema.sql"
download "dev/04-seed-workspace.sql" "04-seed-workspace.sql"

printf 'Downloaded Unkey %s database initialization assets to %s\n' \
  "$UNKEY_VERSION" "$ASSET_DIR"
