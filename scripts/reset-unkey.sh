#!/usr/bin/env bash
set -euo pipefail

echo "Removing all local Unkey containers and volumes..."
docker compose down -v
rm -f .unkey.env

bash scripts/setup-unkey-assets.sh
docker compose up -d

until [ "$(docker compose ps -q mysql)" ] \
  && [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q mysql)")" = "healthy" ]; do
  sleep 2
done

bash scripts/bootstrap-unkey.sh
