#!/usr/bin/env sh
set -eu
node "$(dirname "$0")/verify-platform-common.mjs" --platform=macos "$@"
