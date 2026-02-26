#!/usr/bin/env bash
# update.sh — fetch canonical robots.txt and merge project override
#
# Usage: bash scripts/update.sh
#
# Fetches the base robots.txt from the canonical GitHub source and writes it
# to static/robots.txt. If static/robots.override.txt exists, its contents
# are appended after a blank line.

set -euo pipefail

BASE_URL="https://raw.githubusercontent.com/Leftium/robots-txt/main/robots.txt"
DEST="static/robots.txt"
OVERRIDE="static/robots.override.txt"

if [ ! -d "static" ]; then
    echo "Error: no 'static' directory found. Run this from the project root." >&2
    exit 1
fi

echo "Fetching $BASE_URL..."
curl -fsSL "$BASE_URL" -o "$DEST"

if [ -f "$OVERRIDE" ]; then
    echo "Appending $OVERRIDE..."
    echo "" >> "$DEST"
    cat "$OVERRIDE" >> "$DEST"
fi

echo "Done: $DEST"
