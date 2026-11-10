#!/bin/sh
# Downloads an 8-direction Pixel Lab object as <outdir>/<name>_<dir>.png:  sh tests/pl-dl8.sh <outdir> <name> <objectId>
out=$1; name=$2; id=$3; tmp=$(mktemp -d)
curl -sSL -o "$tmp/o.zip" "https://api.pixellab.ai/mcp/objects/$id/download" && (cd "$tmp" && unzip -oq o.zip)
for f in "$tmp"/rotations/*.png; do d=$(basename "$f" .png); cp "$f" "$out/${name}_$d.png"; done
rm -rf "$tmp"; echo "$name ok"
