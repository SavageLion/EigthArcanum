#!/bin/sh
# Downloads a boss's idle + attack animation frames from Pixel Lab and packs them.
# Usage: tools/fetch-boss.sh <bossIndex> <slug> <idleJobId> <attackJobId>
idx=$1; slug=$2; ij=$3; aj=$4
for k in idle:$ij attack:$aj; do
  kind=${k%%:*}; job=${k##*:}; mkdir -p art-source/boss-$slug/$kind
  for i in 0 1 2 3 4 5 6 7 8; do curl -sf -o art-source/boss-$slug/$kind/$i.png "https://api.pixellab.ai/mcp/images/$job/download?index=$i" || echo "fail $slug $kind $i"; done
done
node tools/pack-boss.mjs $idx $slug 0,1,2,3,2,1 1,2,3,4,5
