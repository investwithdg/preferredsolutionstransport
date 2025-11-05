#!/usr/bin/env bash

set -o errexit -o pipefail -o nounset

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

BASE_URL="${BASE_URL:-http://localhost:3000}"

api_get() {
  local path="$1"
  curl -sSf -H 'Content-Type: application/json' "${BASE_URL}${path}"
}

api_post() {
  local path="$1" data="$2"
  curl -sSf -X POST -H 'Content-Type: application/json' -d "$data" "${BASE_URL}${path}"
}
