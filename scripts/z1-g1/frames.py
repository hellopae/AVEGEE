import json,numpy as np
A=json.load(open('affine.json'));E=json.load(open('entities.json'))
def vis(e):
  bx,by,bw,bh=e['box'];nw,nh=e['nat'];a=e['alpha']
  x0=bx+a[0]/nw*bw;x1=bx+a[2]/nw*bw;y0=by+a[1]/nh*bh;y1=by+a[3]/nh*bh
  if e.get('flip'):
    cx=bx+bw/2;x0,x1=2*cx-x1,2*cx-x0
  return [x0,y0,x1,y1]
ents={}
for s in E['stations']:
  if s.get('file'):ents['st-'+s['k']]=vis(s)
for h in E['houses']:ents[f"h{h['i']}"]=vis(h)
def w(i,x,y):
  a=np.array(A[str(i)]);g=a@np.array([x,y,1.0]);return [g[0]/1.28,g[1]/1.28]
F={1:[[1173,184,1523,431],[1628,232,1953,595],[143,263,649,636],[1719,677,2008,958],[347,738,691,1083]],
2:[[1158,39,1456,338],[1433,240,1717,459],[445,45,790,288],[1639,676,1970,885],[388,795,698,1006]],
3:[[1086,741,1474,1043],[1830,743,2074,954]],4:[[861,62,1187,255]],5:[[992,512,1279,734]],7:[[1576,416,2014,908]],8:[[929,88,1262,522]]}
def iou(a,b):
  ix=max(0,min(a[2],b[2])-max(a[0],b[0]));iy=max(0,min(a[3],b[3])-max(a[1],b[1]));i=ix*iy
  return i/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-i)
if __name__=='__main__':
 for i,fl in F.items():
  for f in fl:
    p0=w(i,f[0],f[1]);p1=w(i,f[2],f[3]);fb=[p0[0],p0[1],p1[0],p1[1]]
    best=sorted(((iou(fb,b),n) for n,b in ents.items()),reverse=True)[:2]
    print(i,[round(x) for x in fb],'->',[(n,round(s,2),[round(v) for v in ents[n]]) for s,n in best])
