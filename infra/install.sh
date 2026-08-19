#!/usr/bin/env bash
#
# Nutty Panel - one-command installer
#
# Usage:
#   bash <(curl -s https://nutty-panel.com/install.sh)
#   bash infra/install.sh [--domain panel.example.com] [--email admin@example.com]
#
# Options:
#   --domain <host>   public domain for automatic HTTPS (Let's Encrypt via Caddy)
#   --email <email>   initial admin email (default: admin@nutty.panel)
#   --dry-run         print the commands instead of running them (also generates .env)
#   --help            show this help
#
set -euo pipefail

DRY_RUN=0
DOMAIN=""
ADMIN_EMAIL="admin@nutty.panel"
ADMIN_PASSWORD=""

log()  { printf '\033[1;36m[nutty]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[nutty]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[nutty]\033[0m %s\n' "$*" >&2; exit 1; }

cmd() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '  + %s\n' "$*"
  else
    "$@"
  fi
}

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run) DRY_RUN=1 ;;
      --domain) shift; DOMAIN="${1:-}" ;;
      --email) shift; ADMIN_EMAIL="${1:-admin@nutty.panel}" ;;
      --help) usage ;;
      *) fail "unknown option: $1" ;;
    esac
    shift
  done
}

detect_pkg_manager() {
  if command -v apt-get >/dev/null 2>&1; then
    PKG_MANAGER="apt"
  elif command -v dnf >/dev/null 2>&1; then
    PKG_MANAGER="dnf"
  elif command -v yum >/dev/null 2>&1; then
    PKG_MANAGER="yum"
  else
    fail "unsupported OS: expected Ubuntu/Debian (apt) or CentOS/RHEL (dnf/yum)"
  fi
  if [ -r /etc/os-release ]; then
    DISTRO="$(sed -n 's/^ID=//p' /etc/os-release | tr -d '"')"
  else
    DISTRO="unknown"
  fi
  log "detected OS: ${DISTRO:-unknown} (package manager: $PKG_MANAGER)"
}

ensure_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "docker already installed"
    return 0
  fi
  log "installing docker via get.docker.com"
  cmd bash -c 'curl -fsSL https://get.docker.com | sh'
  if [ "$DRY_RUN" -eq 1 ]; then
    log "skipping docker availability check in dry-run mode"
  else
    command -v docker >/dev/null 2>&1 || fail "docker installation failed"
  fi
  log "docker installed"
}

ensure_project_dir() {
  if [ -f docker-compose.yml ]; then
    log "using current directory as project dir"
    return 0
  fi
  local target="${NUTTY_PANEL_DIR:-$HOME/nutty-panel}"
  if [ ! -d "$target" ]; then
    log "cloning Nutty Panel into $target"
    cmd git clone --depth 1 https://github.com/Cacahouetes/nutty-panel.git "$target"
  fi
  cd "$target"
  log "using project dir: $target"
}

generate_env() {
  if [ -f .env ]; then
    log ".env already present, keeping existing secrets"
    return 0
  fi
  JWT_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
  ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 18)"
  log "generating .env with fresh secrets"
  cat > .env <<EOF
JWT_SECRET=${JWT_SECRET}
PANEL_ADMIN_EMAIL=${ADMIN_EMAIL}
PANEL_ADMIN_PASSWORD=${ADMIN_PASSWORD}
PANEL_DOMAIN=${DOMAIN:-:80}
EOF
}

deploy() {
  log "building and starting Nutty Panel containers"
  cmd docker compose up -d --build
}

print_credentials() {
  if [ -n "$ADMIN_PASSWORD" ]; then
    log "initial admin: ${ADMIN_EMAIL}"
    warn "initial password: ${ADMIN_PASSWORD}"
    warn "save it now, it will not be shown again"
  else
    log "admin credentials are managed in .env (PANEL_ADMIN_EMAIL / PANEL_ADMIN_PASSWORD)"
  fi
}

main() {
  parse_args "$@"
  detect_pkg_manager
  ensure_docker
  ensure_project_dir
  generate_env
  deploy
  print_credentials
  if [ -n "$DOMAIN" ]; then
    log "done. visit https://${DOMAIN}"
  else
    log "done. visit http://localhost (or your server IP)"
  fi
}

main "$@"