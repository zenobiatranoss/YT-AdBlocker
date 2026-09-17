#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$(dirname "$0")")"

mkdir -p rules/general

fetch() {
    local url="$1"
    local destination="$2"
    local temporary="${destination}.tmp"

    curl \
        -fsSL \
        --retry 3 \
        --retry-delay 2 \
        --connect-timeout 15 \
        --max-time 120 \
        "$url" \
        -o "$temporary"

    if [ ! -s "$temporary" ]; then
        rm -f "$temporary"
        echo "Failed to download $destination" >&2
        exit 1
    fi

    mv "$temporary" "$destination"
}

fetch \
    "https://easylist.to/easylist/easylist.txt" \
    "rules/general/easylist.rules"

fetch \
    "https://easylist.to/easylist/easyprivacy.txt" \
    "rules/general/easyprivacy.rules"

fetch \
    "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1" \
    "rules/general/peter-lowe.rules"

npm run build
