#!/usr/bin/env sh
#
# Start or restart the app stack on a production host (GHCR images).
# Usage: ./prod-up.sh [--app-only] [--restart]
# Run from repository root (same idea as conf-samples/misc/cicd/prod-up.sh).
#
# Prerequisites:
#   - docker login ghcr.io
#   - .env on the server with API_IMAGE, WEB_IMAGE (and DB secrets), or use compose defaults
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "${SCRIPT_DIR}/../.." && pwd)}"
cd "${PROJECT_ROOT}"

if docker compose version >/dev/null 2>&1; then
  DCOMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DCOMPOSE="docker-compose"
else
  echo "Error: docker compose or docker-compose required" >&2
  exit 1
fi

APP_ONLY=false
RESTART=false

for arg in "$@"; do
  case "$arg" in
    --app-only) APP_ONLY=true ;;
    --restart) RESTART=true ;;
    -h|--help)
      echo "Usage: $0 [--app-only] [--restart]"
      echo "  (no args)  - Pull app images and up (docker-compose.yml + docker-compose.prod.yml)"
      echo "  --app-only - Same (PoC has no ELK compose; kept for parity with conf-samples)"
      echo "  --restart  - Up without pull"
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

# Unused in PoC; accept flag for drop-in compatibility with conf-samples
if [ "${APP_ONLY}" = false ] && [ "${RESTART}" = false ]; then
  :
fi

start_app() {
  if [ "${RESTART}" = false ]; then
    echo "[prod-up] Pulling app images..."
    $DCOMPOSE -f docker-compose.yml -f docker-compose.prod.yml pull
  fi
  echo "[prod-up] Starting app..."
  $DCOMPOSE -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build
}

start_elk() {
  if [ -f "${PROJECT_ROOT}/docker-compose-elk.yml" ]; then
    echo "[prod-up] Starting ELK stack..."
    $DCOMPOSE -f docker-compose-elk.yml up -d
  else
    echo "[prod-up] No docker-compose-elk.yml — skipping ELK."
  fi
}

start_app
start_elk

echo "[prod-up] Done. Check: $DCOMPOSE -f docker-compose.yml -f docker-compose.prod.yml ps"
