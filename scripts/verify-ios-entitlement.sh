#!/usr/bin/env bash
set -euo pipefail

app_path="${1:?Usage: verify-ios-entitlement.sh /path/to/GenSticker.app}"
temporary_file="$(mktemp)"
trap 'rm -f "$temporary_file"' EXIT

codesign -d --entitlements :- "$app_path" >"$temporary_file" 2>&1
if ! plutil -extract com.apple.developer.kernel.increased-memory-limit raw "$temporary_file" |
  grep -qx 'true'; then
  echo "Signed app is missing com.apple.developer.kernel.increased-memory-limit=true" >&2
  exit 1
fi

echo "Signed app includes the increased-memory-limit entitlement."
