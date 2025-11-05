#!/usr/bin/env bash

set -o errexit -o pipefail -o nounset

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=colors.sh
source "${SCRIPT_DIR}/colors.sh"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_error "Missing required command: $1"
    exit 1
  fi
}

check_status() {
  local status=$1 msg_success=$2 msg_error=${3:-"Command failed"}
  if [[ $status -eq 0 ]]; then
    log_success "$msg_success"
  else
    log_error "$msg_error"
    exit 1
  fi
}

json_pp() {
  if command -v jq >/dev/null 2>&1; then
    jq '.'
  else
    cat
  fi
}
