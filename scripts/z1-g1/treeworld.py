import json,numpy as np
from trees_in import T
A=json.load(open('affine.json'));E=json.load(open('entities.json'))
out=[]
for id,i,cl,fx,fy,w,note in T:
  a=np.array(A[str(i)]);g=a@np.array([fx,fy,1.0]);x,y=g[0]/1.28,g[1]/1.28;s=np.hypot(a[0,0],a[1,0])
  ww=w*s/1.28
  # nearest existing tree
  best=min(((np.hypot(x-p['x'],y-p['y']),p['id']) for p in E['props'] if p['kind']=='tree'))
  out.append(dict(id=id,img=i,cls=cl,x=round(x),y=round(y),crownW=round(ww),note=note,near=best[1],nearD=round(best[0])))
  print(id,cl,'foot',round(x),round(y),'crownW',round(ww),note,'| nearest',best[1],round(best[0]))
json.dump(out,open('trees_world.json','w'),indent=1)
