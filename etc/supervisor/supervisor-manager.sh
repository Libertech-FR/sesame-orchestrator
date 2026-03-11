#!/bin/sh
set -eu

SOCKET="unix:///var/run/supervisor.sock"
USERNAME="dummy"
PASSWORD="dummy"

ACTION="${1:-}"
TARGET="${2:-}"

if [ -z "$ACTION" ]; then
  echo "Usage: supervisor-manager {start|stop|restart|status|reread|update} [web|api|<program>]" >&2
  exit 1
fi

map_target() {
  case "${1:-}" in
    web)
      echo "web"
      ;;
    api)
      echo "api"
      ;;
    "")
      echo ""
      ;;
    *)
      echo "$1"
      ;;
  esac
}

MAPPED_TARGET="$(map_target "$TARGET")"

case "$ACTION" in
  start|stop|restart|status)
    if [ -z "$MAPPED_TARGET" ]; then
      echo "Missing target. Example: supervisor-manager $ACTION web" >&2
      exit 1
    fi
    exec supervisorctl -s "$SOCKET" -u "$USERNAME" -p "$PASSWORD" "$ACTION" "$MAPPED_TARGET"
    ;;
  reread|update)
    exec supervisorctl -s "$SOCKET" -u "$USERNAME" -p "$PASSWORD" "$ACTION"
    ;;
  *)
    echo "Unsupported action: $ACTION" >&2
    echo "Usage: supervisor-manager {start|stop|restart|status|reread|update} [web|api|<program>]" >&2
    exit 1
    ;;
esac
