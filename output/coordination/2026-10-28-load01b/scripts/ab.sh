#!/bin/bash
# interleaved A/B so background CPU load hits both builds equally
OUT=ab; mkdir -p $OUT
run(){ # build url scene prof thr dir
  mkdir -p $OUT/$1/$6
  for try in 1 2; do
    BASE=$2 node run1.cjs $3 $4 $5 $OUT/$1/$6 noprofile >> $OUT/log.txt 2>&1 && break
    echo "RETRY $1 $3 $4" >> $OUT/log.txt
  done
  echo "LOAD $(sysctl -n vm.loadavg)" >> $OUT/log.txt
}
for s in battle town-th town-west town-asia town-cyberhell border-1-2 border-2-3 trial; do
  for r in 1 2 3; do
    echo "== $s rep $r base" >> $OUT/log.txt; run base http://localhost:8792 $s mobile 4 r$r
    echo "== $s rep $r new"  >> $OUT/log.txt; run new  http://localhost:8791 $s mobile 4 r$r
  done
  echo "== $s desktop base" >> $OUT/log.txt; run base http://localhost:8792 $s desktop 1 d
  echo "== $s desktop new"  >> $OUT/log.txt; run new  http://localhost:8791 $s desktop 1 d
done
echo AB-DONE >> $OUT/log.txt
