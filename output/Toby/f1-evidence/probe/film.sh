#!/bin/bash
# film.sh phase mode W H D zone key tag
cd "$(dirname "$0")"
phase=$1; mode=$2; W=$3; H=$4; D=$5; zone=$6; k=$7; tag=$8
[ $phase = before ] && export BASE=http://localhost:8793 || export BASE=http://localhost:8791
rm -rf film_$tag; mkdir film_$tag; export FILM=$PWD/film_$tag
if [ $mode = room ]; then out=$(python3 room_probe.py $W $H $D 1 $zone $k $tag); log=log_room_$tag.json; else out=$(python3 frontier_probe.py $W $H $D 1 $zone $tag); log=log_front_$tag.json; fi
walk=$(echo "$out" | grep WALK_AT | awk '{print $2}')
vid=$(ls film_$tag/*.webm | head -1)
python3 - "$log" "$W" "$H" "$D" "$walk" "$vid" "$tag" <<'P'
import sys,json,subprocess
log,W,H,D,walk,vid,tag=sys.argv[1:]; W=int(W);H=int(H);D=min(2,float(D))
L=json.load(open(log)); m=L[len(L)//2]
cx=int(m['dx']/D); cy=int(m['dy']/D)-60
cw,ch=420,260
x=max(0,min(W-cw,cx-cw//2)); y=max(0,min(H-ch,cy-ch//2))
ss=float(walk)+0.6
subprocess.run(['ffmpeg','-v','error','-y','-ss',str(ss),'-i',vid,'-vf',f"fps=12,crop={cw}:{ch}:{x}:{y},tile=6x2",'-frames:v','1',f'strip_{tag}.png'],check=True)
print('strip',tag)
P
