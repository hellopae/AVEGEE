#!/bin/bash
cd "$(dirname "$0")"
for phase in before after; do for vp in "1758 964 2" "1280 800 1" "844 390 3" "390 844 3"; do set -- $vp; export VW=$1 VH=$2; for z in cyberhell th; do echo "$phase ${1}x${2} $z: $(python3 analyze.py log_front_${phase}_${1}_$z.json $(python3 -c "print(min(2,$3))") 2>&1 | tail -1)"; done; done; done
