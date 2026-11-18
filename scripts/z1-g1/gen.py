import json,numpy as np
T=json.load(open('trees_world.json'))
by={t['id']:t for t in T}
# dedupe: o2-1 == o3-9 ; o2-2 == o8-7 (average)
drop={'o2-1','o8-7'}
by['o2-2']['x']=round((by['o2-2']['x']+by['o8-7']['x'])/2);by['o2-2']['y']=round((by['o2-2']['y']+by['o8-7']['y'])/2);by['o2-2']['crownW']=round((by['o2-2']['crownW']+by['o8-7']['crownW'])/2)
move={'o5-7':'lava-tree-2','o7-3':'tree-11'}
out=[]
for t in T:
  if t['id'] in drop:continue
  biome={'green':'city','dkgreen':'city','pale':'city','orange':'lava','cyan':'ice','yellow':'heaven'}[t['cls']]
  w=t['crownW']/(0.99 if biome in('lava','ice') else 1.0)
  out.append(dict(id=t['id'],img=t['img'],biome=biome,x=t['x'],y=t['y'],w=round(w),note=t['note'],move=move.get(t['id'])))
json.dump(out,open('trees_final.json','w'),indent=1)
print(len(out))
for o in out:print(o)
