#!/usr/bin/env bash

# Color definitions for consistent script output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log_color() {
  local color="$1"; shift
  printf "%b%s%b\n" "${!color}" "$*" "$RESET"
}

log_info()    { log_color BLUE   "$*"; }
log_success() { log_color GREEN  "$*"; }
log_warn()    { log_color YELLOW "$*"; }
log_error()   { log_color RED    "$*"; }
