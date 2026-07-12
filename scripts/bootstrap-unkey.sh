#!/usr/bin/env bash
set -euo pipefail

OUTPUT_FILE="${1:-.unkey.env}"
CONTAINER_OUTPUT="/tmp/quiz-generator-unkey.env"
DATABASE_DSN="root:unkey@tcp(mysql:3306)/unkey?parseTime=true"

if [ ! -d "unkey/mysql-init" ]; then
  echo "Missing Unkey database assets. Run: bash scripts/setup-unkey-assets.sh" >&2
  exit 1
fi

until curl --silent --fail http://localhost:8080/v2/liveness >/dev/null; do
  sleep 1
done

docker compose exec -T unkey unkey dev seed local \
  --database-primary "$DATABASE_DSN" \
  --output "$CONTAINER_OUTPUT"
docker compose cp "unkey:${CONTAINER_OUTPUT}" "$OUTPUT_FILE"

set -a
# shellcheck disable=SC1090
source "$OUTPUT_FILE"
set +a

API_RESPONSE=$(curl --fail --silent --show-error \
  -X POST "http://localhost:8080/v2/apis.createApi" \
  -H "Authorization: Bearer $UNKEY_ROOT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"quiz-generator-local"}')
UNKEY_API_ID=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["apiId"])' \
  <<< "$API_RESPONSE")
sed -i "s/^UNKEY_API_ID=.*/UNKEY_API_ID=$UNKEY_API_ID/" "$OUTPUT_FILE"

chmod 600 "$OUTPUT_FILE"

echo "Created ${OUTPUT_FILE}. Load it before starting the app:"
echo "  set -a; source .env; source ${OUTPUT_FILE}; set +a"
