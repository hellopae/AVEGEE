import json,numpy as np,cv2,sys
sys.path.insert(0,'.')
import frames as Fm,strokes
from frames import *
F={1:[[1173,184,1523,431],[1628,232,1953,595],[143,263,649,625],[1719,677,2008,964],[347,738,691,1083]],
2:[[1158,39,1456,338],[1433,240,1717,459],[445,45,790,288],[1639,676,1970,885],[388,795,698,1006]],
3:[[1086,741,1474,1043],[1830,743,2111,1045]],4:[[861,62,1187,255]],5:[[992,512,1279,734]],7:[[1576,416,2014,847]],8:[[931,89,1262,521]]}
rows=[]
for i,fl in F.items():
  for f in fl:
    p0=w(i,f[0],f[1]);p1=w(i,f[2],f[3]);fb=[p0[0],p0[1],p1[0],p1[1]]
    best=sorted(((iou(fb,b),n) for n,b in ents.items()),reverse=True)[0]
    n=best[1];e=ents[n];fw=fb[2]-fb[0];fh=fb[3]-fb[1];sw=e[2]-e[0];sh=e[3]-e[1]
    foot=e[3]
    kh=(foot-fb[1])/sh;kw=fw/sw;kframe=fh/sh
    print(f'img{i} {n:9s} iou{best[0]:.2f} sprite[{e[0]:.0f},{e[1]:.0f},{e[2]:.0f},{e[3]:.0f}] {sw:.0f}x{sh:.0f} | frame[{fb[0]:.0f},{fb[1]:.0f},{fb[2]:.0f},{fb[3]:.0f}] {fw:.0f}x{fh:.0f} | foot {foot:.0f} frameBottom {fb[3]:.0f} | kh(top-to-foot) {kh:.2f} kw(flare) {kw:.2f} kframeH {kframe:.2f}')
