#!/bin/sh
# The app has two copies on the same site: live (repo root) and preview (preview/, at …/pocket-budget/preview/).
# preview/index.html is BUILT from src/ (python3 tools/build.py). Edit src/, never preview/index.html.
#   tools/preview.sh promote   preview -> live (after the owner approved the preview)
#   tools/preview.sh status    which app files differ between the copies
# To throw a preview change away, revert its commit(s) with `git revert` (that restores src/ and preview/ together).
# After any change: bump that copy's PB_BUILD (src/index.html for preview, index.html for live) and sw.js VERSION,
# then run python3 tools/check.py and python3 tools/check.py preview.
set -e
cd "$(dirname "$0")/.."
FILES="index.html sw.js platform.js config.js manifest.webmanifest icon-180.png icon-192.png icon-512.png hanken-grotesk.woff2"
case "$1" in
  promote) python3 tools/build.py --check
           for f in $FILES; do cp "preview/$f" "$f"; done
           echo "Preview copied to live. Now set the live PB_BUILD (index.html) and sw.js VERSION, then run: python3 tools/check.py" ;;
  status)  for f in $FILES; do cmp -s "$f" "preview/$f" || echo "differs: $f"; done ;;
  *) echo "usage: tools/preview.sh promote|status"; exit 2 ;;
esac
