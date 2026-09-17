#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${HOME}/.local/lib/yt-adblocker"
DATA_DIR="${HOME}/.local/share/yt-adblocker"
HOST_DIR="${HOME}/.mozilla/native-messaging-hosts"

mkdir -p \
  "${INSTALL_DIR}/rules/youtube" \
  "${DATA_DIR}" \
  "${HOST_DIR}"

cd "${ROOT}/engine"

go build -o "${INSTALL_DIR}/yt-adblocker" ./cmd/yt-adblocker
go build -o "${INSTALL_DIR}/yt-adblocker-native" ./cmd/native-host

chmod 755 \
  "${INSTALL_DIR}/yt-adblocker" \
  "${INSTALL_DIR}/yt-adblocker-native"

cp "${ROOT}/rules/youtube/ads.rules" \
  "${INSTALL_DIR}/rules/youtube/ads.rules"

chmod 644 "${INSTALL_DIR}/rules/youtube/ads.rules"

cat > "${HOST_DIR}/yt_adblocker.json" <<JSON
{
  "name": "yt_adblocker",
  "description": "YT-AdBlocker native engine host",
  "path": "${INSTALL_DIR}/yt-adblocker-native",
  "type": "stdio",
  "allowed_extensions": [
    "yt-adblocker@local"
  ]
}
JSON

chmod 644 "${HOST_DIR}/yt_adblocker.json"

echo "YT-AdBlocker native engine installed."
echo "Install directory: ${INSTALL_DIR}"
echo "Data directory: ${DATA_DIR}"
echo "Native host manifest: ${HOST_DIR}/yt_adblocker.json"
