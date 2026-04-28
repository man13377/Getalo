#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_LOGO="${1:-$ROOT_DIR/../getalo-logo.png}"
ICONSET_DIR="$ROOT_DIR/Resources/Assets.xcassets/AppIcon.appiconset"

if [[ ! -f "$SRC_LOGO" ]]; then
  echo "Source logo not found: $SRC_LOGO"
  exit 1
fi

mkdir -p "$ICONSET_DIR"

# filename,size
while IFS=',' read -r filename size; do
  [[ -z "$filename" ]] && continue
  sips -s format png -z "$size" "$size" "$SRC_LOGO" --out "$ICONSET_DIR/$filename" >/dev/null
  echo "Generated $filename ($size x $size)"
done <<'MAP'
icon-20@2x.png,40
icon-20@3x.png,60
icon-29@1x.png,29
icon-29@2x.png,58
icon-29@3x.png,87
icon-40@1x.png,40
icon-40@2x.png,80
icon-40@3x.png,120
icon-60@2x.png,120
icon-60@3x.png,180
icon-76@1x.png,76
icon-76@2x.png,152
icon-83.5@2x.png,167
icon-1024.png,1024
MAP

echo "Done: $ICONSET_DIR"
