#!/bin/bash
cd "$(dirname "$0")"
for phase in before after; do
  [ $phase = before ] && B=http://localhost:8793 || B=http://localhost:8791
  export BASE=$B
  for vp in "1758 964 2" "1280 800 1" "844 390 3" "390 844 3"; do
    set -- $vp; W=$1; H=$2; D=$3; export VW=$W VH=$H
    for z in cyberhell th; do
      echo "== $phase ${W}x${H} @${D}x frontier $z"
      python3 frontier_probe.py $W $H $D 1 $z ${phase}_${W}_$z | grep -E "idle"; python3 analyze.py log_front_${phase}_${W}_$z.json $D
    done
  done
done
