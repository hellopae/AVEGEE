"""Recheck delivered sprites and produce native-resolution terrain inspection crops."""
from pathlib import Path
from PIL import Image
import numpy as np
import hashlib, json, subprocess, sys
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/m3'
script="import {PLANNED_ART,ZONE1_TOWN_ART,ZONE_SKIN} from './src/zone-skin.js'; console.log(JSON.stringify({groups:PLANNED_ART('asia','map-zone2'),reference:ZONE1_TOWN_ART,use:ZONE_SKIN.asia.use}));"
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True))
rows=[]
for group,entries in data['groups'].items():
 for key,file in entries.items():
  p=ROOT/file
  if not p.exists(): p=OUT/'review/s2/rejected'/Path(file).name
  im=Image.open(p); ref=Image.open(ROOT/data['reference'][key])
  a=np.asarray(im).astype(np.int16);visible=a[:,:,3]>0
  cyan=key in ['town-tree-red-th','town-prop-lamp-gold','town-prop-torch-pillar']
  residue=(np.minimum(a[:,:,1],a[:,:,2])-a[:,:,0]>45) if cyan else (np.minimum(a[:,:,0],a[:,:,2])-a[:,:,1]>45)
  bbox=im.getbbox(); rb=ref.getbbox();delta=[abs(v-r)/(im.width if i%2==0 else im.height) for i,(v,r) in enumerate(zip(bbox,rb))]
  row={'group':group,'file':file,'inspected_path':str(p.relative_to(ROOT)),'size':list(im.size),'mode':im.mode,'reference_size':list(ref.size),'bbox':bbox,'reference_bbox':rb,'max_bbox_delta_fraction':max(delta),'key_residue_visible_pixels':int((residue&visible).sum()),'lossless_vp8l':b'VP8L' in p.read_bytes(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
  row['structural_checks_ok']=im.size==ref.size and im.mode=='RGBA' and max(delta)<=.02 and row['key_residue_visible_pixels']==0 and row['lossless_vp8l']
  row['enabled_in_skin']=group in data['use']
  if row['enabled_in_skin']: assert row['structural_checks_ok'], row
  rows.append(row)
json.dump({'note':'Structural checks only; visual edges and semantic content require separate inspection. Key excess threshold = 45/255 on visible pixels.','sprites':rows},open(OUT/'asset-audit.json','w'),indent=2)
sys.path.insert(0,str(ROOT/'scripts'))
import town_terrain_lib as T
full=Image.fromarray(T.stitch({q:Image.open(OUT/f'review/q{i}/q-{q}-srgb.png') for i,q in enumerate(T.QUADS,1)}))
# Coordinates here are on the 1536x1024 preview. Crops are kept at final native pixels.
centres={'paving':(745,395),'lava-bridge':(365,387),'pier-real':(898,710),'pier-extra':(670,697),'ne-se-seam':(1100,510),'maple-rock':(580,720)}
for name,(x,y) in centres.items():
 cx=round(x*full.width/1536);cy=round(y*full.height/1024)
 box=(max(0,cx-256),max(0,cy-256),min(full.width,cx+256),min(full.height,cy+256))
 full.crop(box).save(OUT/f'native-100pct-{name}.png')
print(f'{len(rows)} sprites audited; six native 100% crops written')
