#!/bin/bash
cd "$(dirname "$0")"
for phase in before after; do
  [ $phase = before ] && B=http://localhost:8793 || B=http://localhost:8791
  export BASE=$B
  for vp in "1280 800 1" "844 390 3"; do
    set -- $vp; W=$1; H=$2; D=$3
    echo "== $phase ${W}x${H} @${D}x frontier cyberhell"
    python3 frontier_probe.py $W $H $D 1 cyberhell ${phase}_${W}_cyberhell | grep -E "idle|bg" ; python3 analyze.py log_front_${phase}_${W}_cyberhell.json $D
    echo "== $phase ${W}x${H} @${D}x frontier th"
    python3 frontier_probe.py $W $H $D 1 th ${phase}_${W}_th | grep -E "idle"; python3 analyze.py log_front_${phase}_${W}_th.json $D
    for z in "cyberhell krata" "west lokan" "th dab"; do
      set -- $z
      echo "== $phase ${W}x${H} @${D}x room $1/$2"
      python3 room_probe.py $W $H $D 1 $1 $2 ${phase}_${W}_$1_$2 | grep -E "room|errs"; python3 analyze.py log_room_${phase}_${W}_$1_$2.json $D
    done
  done
done
