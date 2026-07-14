#!/usr/bin/env bash
# Render the generated HTML to exact-size PNGs (headless Chrome @2x -> downscale).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

python3 "$DIR/build.py"

render() {
  local name=$1 w=$2 h=$3
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 --window-size="$w,$h" \
    --screenshot="$DIR/$name@2x.png" "file://$DIR/$name.html" >/dev/null 2>&1
  sips -z "$h" "$w" "$DIR/$name@2x.png" --out "$DIR/$name.png" >/dev/null
  rm -f "$DIR/$name@2x.png"
  echo "  $name.png (${w}x${h})"
}

echo "Rendering:"
render screenshot-1 1280 800
render screenshot-2 1280 800
render screenshot-3 1280 800
render tile-marquee 1400 560
render tile-small   440 280
echo "Done."
