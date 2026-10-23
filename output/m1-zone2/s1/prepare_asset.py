"""S1-only reproducible key extraction, framing and review evidence; no runtime edits."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
import json, shutil, hashlib
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/m1-zone2/s1'
RAW=ROOT/'output/m1-zone2/raw'
RAW.mkdir(exist_ok=True)
source=Path('/Users/agapae/.codex/generated_images/01a1672c-7227-7420-b716-b1487ca88676/exec-c17b7f70-04c6-443f-a4eb-cde5660b31d3.png')
raw=RAW/'town-judgment-asia-v2-generated.png'
if not raw.exists(): shutil.copyfile(source,raw)
im=Image.open(raw).convert('RGB')
rgb=np.asarray(im).astype(np.float32)
# Chroma key: saturated magenta only, preserving red lacquer and orange flames.
key=np.clip((np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]-30)/120,0,1)
a=1-key
# Remove the magenta spill channel, without removing red lacquer.
spill=np.maximum(0,np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1])
rgb[:,:,0]-=spill; rgb[:,:,2]-=spill
alpha=Image.fromarray(np.uint8(np.round(a*255)))
rgba=Image.fromarray(np.uint8(np.clip(rgb,0,255))).convert('RGBA');rgba.putalpha(alpha)
raw_bbox=rgba.getbbox()
# Small framing correction, recorded explicitly; do not repaint any object.
frame=(20,10,1492,1008)
obj=rgba.crop(raw_bbox).resize((frame[2]-frame[0],frame[3]-frame[1]),Image.Resampling.LANCZOS)
final=Image.new('RGBA',(1536,1024));final.paste(obj,frame[:2])
final.putalpha(final.getchannel('A').filter(ImageFilter.MinFilter(3)))
target=ROOT/'img/theme-v4/town-judgment-asia-v2.webp'
assert not target.exists(), 'Refusing to overwrite an existing asset'
final.save(target,'WEBP',lossless=True,quality=100,method=6,exact=True)
final.save(OUT/'town-judgment-asia-v2-cutout.png')
ref=Image.open(ROOT/'img/theme-v4/town-judgment-th-v2.webp').convert('RGBA')
ref_bbox=ref.getchannel('A').getbbox(); new_bbox=final.getchannel('A').getbbox()
deltas=[abs(x-y) for x,y in zip(ref_bbox,new_bbox)]
limits=[1536*.02,1024*.02,1536*.02,1024*.02]
record={'reference':{'path':'img/theme-v4/town-judgment-th-v2.webp','size':ref.size,'mode':ref.mode,'alpha_bbox':ref_bbox,'alpha_gt8_bbox':ref.getchannel('A').point(lambda x:255 if x>8 else 0).getbbox()},'generated':{'raw_path':str(raw.relative_to(ROOT)),'size':im.size,'key':'#FF00FF','keyed_bbox_before_framing':raw_bbox},'final':{'path':str(target.relative_to(ROOT)),'size':final.size,'mode':final.mode,'alpha_bbox':new_bbox,'bbox_delta_px':deltas,'bbox_tolerance_px':limits,'alpha_inset_px':1,'framing_target_before_inset':frame},'note':'Reference low-alpha spill extends beyond the visible object. Bbox uses all nonzero alpha, exactly as requested.'}
(ROOT/'output/m1-zone2/sprite-bbox.json').write_text(json.dumps({'S1':record},indent=2)+'\n')
# Same-scale side by side comparison and material reference.
sheet=Image.new('RGB',(1536,1170),'#202020');draw=ImageDraw.Draw(sheet)
for i,(label,pic) in enumerate([('ZONE 1 STRUCTURE',ref),('ZONE 2 S1',final)]):
 thumb=pic.resize((768,512),Image.Resampling.LANCZOS)
 sheet.paste(thumb,(i*768,30),thumb);draw.text((i*768+16,10),label,fill='white')
mat=Image.open(ROOT/'img/map-v5/st-sala-asia.webp').convert('RGBA');mat.thumbnail((600,600))
sheet.paste(mat,(50,560),mat);draw.text((680,580),'SALA MATERIAL REFERENCE',fill='white')
small=final.resize((307,205),Image.Resampling.LANCZOS);sheet.paste(small,(780,650),small)
draw.text((780,625),'S1 at 307 px width (review aid)',fill='white')
sheet.save(OUT/'contact-sheet.png')
for color,name in [('#202020','dark'),('#E0E0E0','light')]:
 bg=Image.new('RGBA',final.size,color); bg.alpha_composite(final);bg.convert('RGB').save(OUT/f'composite-{name}.png')
 crops=[(400,30,528,158),(700,0,828,128),(460,570,588,698),(470,880,598,1008)]
 edge=Image.new('RGB',(1024,1064),color);d=ImageDraw.Draw(edge)
 for i,box in enumerate(crops):
  edge.paste(bg.crop(box).resize((512,512),Image.Resampling.NEAREST).convert('RGB'),((i%2)*512,40+(i//2)*512))
 d.text((12,10),f'400% edges on {color}: flame / crest / lion / lower stair',fill='white' if name=='dark' else 'black')
 edge.save(OUT/f'edges-400-{name}.png')
# Quantitative format, transparency, geometry and key-residue checks.
reopened=Image.open(target); arr=np.asarray(reopened); visible=arr[:,:,3]>0
# Use float to avoid uint8 overflow in actual residue metric.
f=arr.astype(float);magenta=(f[:,:,0]>f[:,:,1]+40)&(f[:,:,2]>f[:,:,1]+40)&visible
checks={'size':list(reopened.size),'mode':reopened.mode,'lossless_roundtrip_equal':bool(np.array_equal(np.asarray(final),arr)),'bbox_delta_px':deltas,'bbox_within_2_percent':all(d<=lim for d,lim in zip(deltas,limits)),'visible_magenta_pixels':int(magenta.sum()),'transparent_pixels':int((arr[:,:,3]==0).sum()),'partial_alpha_pixels':int(((arr[:,:,3]>0)&(arr[:,:,3]<255)).sum()),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'scope':'Asset-only inspection; no game integration, culture approval or QA verdict.'}
(OUT/'verification.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(record,indent=2));print(json.dumps(checks,indent=2))
