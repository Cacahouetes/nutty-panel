#!/usr/bin/env bash
#
# Functional test for infra/install.sh in dry-run mode.
# Asserts that .env is generated with fresh secrets and that the deploy
# step is printed. Run from anywhere; resolves the repo root itself.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

[ -f docker-compose.yml ] || { echo "FAIL: repo root not found"; exit 1; }

BACKUP=""
if [ -f .env ]; then
  BACKUP=".env.bak.$$"
  mv .env "$BACKUP"
fi
trap 'rm -f .env; if [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then mv "$BACKUP" .env; fi' EXIT

OUT="$(mktemp)"
bash infra/install.sh --dry-run --email test@example.com >"$OUT" 2>&1

check() { # check <label> <command...>
  local label="$1"
  shift
  if "$@"; then
    echo "  ok: $label"
  else
    echo "FAIL: $label" >&2
    exit 1
  fi
}

check ".env was generated" test -f .env
check "JWT_SECRET is set" grep -q '^JWT_SECRET=.\+' .env
check "JWT_SECRET is not the placeholder" bash -c "! grep -q 'JWT_SECRET=changeme' .env"
check "admin password is set" grep -q '^PANEL_ADMIN_PASSWORD=.\+' .env
check "admin email is configured" grep -q '^PANEL_ADMIN_EMAIL=test@example.com$' .env
check "PANEL_DOMAIN defaults to :80" grep -q '^PANEL_DOMAIN=:80$' .env
check "deploy step is printed" grep -q 'docker compose up -d --build' "$OUT"
if ! command -v docker >/dev/null 2>&1; then
  check "docker install step is shown when missing" grep -q 'get.docker.com' "$OUT"
fi

rm -f "$OUT"
echo "install.test: OK"