#!/usr/bin/env bash
# Render a .pptx to per-slide images for visual QA, in a FRESH dir (LibreOffice locks dirs).
# Usage: ./render_and_check.sh /path/to/deck.pptx [/path/to/connected_folder/_review]
set -e

if [ -z "$1" ] || [ ! -f "$1" ]; then
  echo "Usage: $0 <deck.pptx> [view-dir]   (deck not found: '$1')" >&2
  exit 1
fi

# Resolve both paths to absolute BEFORE cd-ing into the fresh render dir,
# otherwise relative paths silently point inside the render dir.
DECK="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
VIEWDIR="${2:-_review}"            # a CONNECTED folder so file tools can open the images
mkdir -p "$VIEWDIR"
VIEWDIR="$(cd "$VIEWDIR" && pwd)"

D="rv_$(date +%s)"
mkdir -p "$D"
cp "$DECK" "$D/d.pptx"
cd "$D"
soffice --headless --convert-to pdf d.pptx >/dev/null    # keep stderr visible
if [ ! -f d.pdf ]; then
  echo "ERROR: LibreOffice did not produce d.pdf (is soffice installed?)" >&2
  exit 1
fi
pdftoppm -jpeg -r 110 d.pdf s                            # s-01.jpg, s-02.jpg, ...
cp s-*.jpg "$VIEWDIR"/
N=$(ls s-*.jpg | wc -l)
# soffice has exited by now, so its dir lock is gone -- clean up best-effort
cd ..
if rm -rf "$D" 2>/dev/null; then
  echo "Rendered $N slides into $VIEWDIR (temp render dir cleaned up)"
else
  echo "Rendered $N slides into $VIEWDIR (could not remove $D -- delete it manually later)"
fi
echo "Open the JPGs to inspect for overflow, overlap, broken icons, low contrast."
