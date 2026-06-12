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
echo "Rendered $(ls s-*.jpg | wc -l) slides into $VIEWDIR (working dir: $D)"
echo "Open the JPGs to inspect for overflow, overlap, broken icons, low contrast."
