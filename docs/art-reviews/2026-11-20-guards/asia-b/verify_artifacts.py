"""Read-only check of saved sheets, metric evidence, GIFs, scope and atlas metadata."""
from pathlib import Path
from PIL import Image, ImageDraw
import json,hashlib,re
P=Path(__file__).resolve().parent
R=P.parents[3]
v=json.loads((P/'validation.json').read_text())
checks=0
for item in v['files']:
 new=Image.open(R/item['path']);old=Image.open(P/'originals'/(item['name']+'.webp'))
 assert new.size==old.size==tuple(item['size']);assert new.mode==old.mode==item['mode'];checks+=2
 assert hashlib.sha256((R/item['path']).read_bytes()).hexdigest()==item['sha256'];checks+=1
 assert len(item['frames_measured'])==item['frames'];checks+=1
 for f in item['frames_measured']:
  contact=[];tops=[]
  for im,fr,hr in [(old.crop(f['rect']),f['source_boot_roi'],f['source_head_roi']),(new.crop(f['rect']),f['new_boot_roi'],f['new_head_roi'])]:
   alpha=im.getchannel('A');pix=alpha.load();x1,y1,x2,y2=map(int,fr)
   pts=[(x,y) for y in range(max(0,y1),min(im.height,y2)) for x in range(max(0,x1),min(im.width,x2)) if pix[x,y]>127]
   assert pts;bottom=max(y for x,y in pts)+1
   xs=[x for y in range(max(0,bottom-20),bottom) for x in range(max(0,x1),min(im.width,x2)) if pix[x,y]>127]
   contact.append(((min(xs)+max(xs))/2,bottom))
   hx1,hx2=map(int,hr)
   top=min(y for y in range(im.height//2) for x in range(max(0,hx1),min(im.width,hx2)) if pix[x,y]>127);tops.append(top)
  assert all(abs(contact[0][j]-contact[1][j])<=2 for j in range(2));checks+=1
  heights=[contact[j][1]-tops[j] for j in range(2)];assert abs(heights[1]/heights[0]-1)<=.03;checks+=1
  assert list(contact[1])==f['new_foot'];assert tops[1]==f['new_body_top'];checks+=2
 gif=Image.open(P/(item['name']+'.gif'));assert gif.n_frames==item['frames'];checks+=1
 for j in range(gif.n_frames):gif.seek(j);gif.load()
 assert (P/(item['name']+'-frames.jpg')).is_file();checks+=1
atlas=json.loads((P/'walk-atlas-original.json').read_text())
s=(R/'src/crew-walk-assets.js').read_text();start=s.index('  "asia:guard": ')+len('  "asia:guard": ')
assert json.JSONDecoder().raw_decode(s[start:])[0]==atlas;checks+=1
for f in ['compare.jpg','README.md','prompts.json','source-metadata.json']:assert (P/f).is_file();checks+=1
assert json.loads((P/'prompts.json').read_text())['generation_calls']==12;checks+=1
print(json.dumps({'checks_completed':checks,'sheets':3,'frames':16,'gifs':3,'max_foot_delta_px':max(abs(d) for m in v['files'] for f in m['frames_measured'] for d in f['foot_delta_px']),'max_body_height_delta_percent':max(abs(f['body_height_delta_percent']) for m in v['files'] for f in m['frames_measured']),'atlas_metadata_unchanged':True,'runtime_playtest':'not run'},indent=2))
