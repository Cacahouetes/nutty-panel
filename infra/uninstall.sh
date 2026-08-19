#!/usr/bin/env bash
#
# Nutty Panel - uninstaller
#
# Usage:
#   bash infra/uninstall.sh [--purge]
#
#   --purge   also remove containers, volumes, images and the project data
#   (default: containers are stopped, data kept in ./data)
#
set -euo pipefail

PURGE=0

log()  { printf '\033[1;36m[nutty]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[nutty]\033[0m %s\n' "$*" >&2; exit 1; }

for arg in "$@"; do
  case "$arg" in
    --purge) PURGE=1 ;;
    *) fail "unknown option: $arg" ;;
  esac
done

if [ ! -f docker-compose.yml ]; then
  cd "${NUTTY_PANEL_DIR:-$HOME/nutty-panel}"
fi
[ -f docker-compose.yml ] || fail "docker-compose.yml not found in $(pwd)"

log "stopping Nutty Panel containers"
docker compose down

if [ "$PURGE" -eq 1 ]; then
  log "removing containers, volumes and images"
  docker compose down -v --rmi all
  if [ -d ./data ]; then
    log "removing project data (./data, ./servers)"
    rm -rf ./data ./servers
  fi
  log "uninstall complete (purge)"
else
  log "containers stopped; data preserved in $(pwd)/data"
  log "to fully remove data, run: bash infra/uninstall.sh --purge"
fi