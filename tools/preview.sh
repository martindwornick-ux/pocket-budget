#!/bin/sh
# Move the app between the live copy (repo root) and the preview copy (preview/).
#   tools/preview.sh promote   preview -> live   (the owner approved the preview)
#   tools/preview.sh reset     live -> preview   (throw the preview change away / start the next one clean)
#   tools/preview.sh status    show which app files differ
# After either copy changes, bump that copy's PB_BUILD and sw.js VERSION (see HANDOFF.md) and run tools/check.py.
set -e
cd "$(dirname "$0")/.."
FILES="index.html sw.js platform.js config.js manifest.webmanifest icon-180.png icon-192.png icon-512.png hanken-grotesk.woff2"
case "$1" in
  promote) for f in $FILES; do cp "preview/$f" "$f"; done; echo "Preview copied to live. Now set the live PB_BUILD and sw.js VERSION, then run: python3 tools/check.py" ;;
  reset)   mkdir -p preview; for f in $FILES; do cp "$f" "preview/$f"; done; echo "Preview now matches live." ;;
  status)  for f in $FILES; do cmp -s "$f" "preview/$f" || echo "differs: $f"; done ;;
  *) echo "usage: tools/preview.sh promote|reset|status"; exit 2 ;;
esac
