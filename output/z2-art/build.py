"""Bounded art delivery: normalize generated alpha sprites and assemble review evidence.
Run from repository root: python3 output/z2-art/build.py
No runtime files or original assets are written.
"""
from PIL import Image, ImageDraw, ImageOps
from pathlib import Path
import json, hashlib
ROOT=Path('output/z2-art'); QA=ROOT/'qa'
rows=json.loads((ROOT/'manifest.json').read_text()); layout=json.loads((ROOT/'layout.json').read_text())
def measure(im):
 a=im.getchannel('A'); b=a.getbbox(); visible=a.point(lambda v:255 if v>=128 else 0); vb=visible.getbbox(); bb=visible.crop((0,max(0,vb[3]-8),im.width,vb[3])).getbbox()
 return b,((bb[0]+bb[2]-1)/2,vb[3]-1)
def normalize(r):
 im=Image.open(ROOT/'generated'/f"{r['key']}.png").convert('RGBA'); b,_=measure(im); im=im.crop(b)
 # Preserve the generated alpha; no colour-key replacement or painted replacement art.
 tw,th=r['size']; bx,by=r['base']; ob=r['bbox']
 scale=min((ob[2]-ob[0])/im.width,(ob[3]-ob[1])/im.height)
 for _ in range(100):
  piece=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
  _,pb=measure(piece); px=round(bx-pb[0]); py=round(by-pb[1])
  if px>=0 and py>=0 and px+piece.width<=tw+2 and py+piece.height<=th+2:break
  scale*=.97
 canvas=Image.new('RGBA',(tw,th)); canvas.alpha_composite(piece,(px,py)); canvas.save(r['new'],lossless=True,exact=True)
 return canvas
report=[]; images={}
for r in rows:
 new=normalize(r); images[r['key']]=new; b,base=measure(new)
 old=Image.open(r['old']).convert('RGBA')
 assert new.size==old.size
 assert hashlib.sha256(Path(r['old']).read_bytes()).hexdigest()==r['sha256']
 delta=[base[i]-r['base'][i] for i in range(2)]
 assert abs(delta[0])<=1 and delta[1]==0,(r['key'],delta)
 a=new.getchannel('A');hist=a.histogram()
 report.append(dict(key=r['key'],size=list(new.size),alpha_bbox=list(b),base=list(base),base_delta=delta,transparent_pixels=hist[0],partial_alpha_pixels=sum(hist[1:255]),original_unchanged=True))
 # Native-size edge review on dark, white and magenta; no resampling.
 edge=Image.new('RGB',(new.width*3,new.height+24));d=ImageDraw.Draw(edge)
 for j,c in enumerate(['#14251e','#ffffff','#ee37b7']):
  edge.paste(c,(j*new.width,24,(j+1)*new.width,new.height+24));edge.paste(new,(j*new.width,24),new);d.text((j*new.width+5,5),r['key']+' '+c,fill='white')
 edge.save(QA/f"edges-{r['key']}.webp",lossless=True)
# Contact sheet: equal canvas scale within each old/new pair, no separate fit-to-subject.
sheet=Image.new('RGB',(1200,((len(rows)+2)//3)*310),'#46534e');d=ImageDraw.Draw(sheet)
for i,r in enumerate(rows):
 x=(i%3)*400;y=(i//3)*310;d.text((x+8,y+5),r['key']+'  OLD | NEW',fill='white')
 for j,p in enumerate([r['old'],r['new']]):
  im=Image.open(p).convert('RGBA');im.thumbnail((190,265));sheet.paste(im,(x+j*200+(200-im.width)//2,y+30),im)
sheet.save(QA/'old-new-contact.webp',lossless=True)
# Full terrain pixels: 4915x3277; world 3840x2560. Tile edges are cropped to fullPx.
ground=Image.new('RGBA',(4915,3277))
for p in Path('img/map-zone2/v1').glob('r*-c*.webp'):
 import re
 rr,cc=map(int,re.match(r'r(\d+)-c(\d+)',p.name).groups());ground.paste(Image.open(p).convert('RGBA'),((cc-1)*1024,(rr-1)*1024))
placements=[]
def place(k,x,y,w,h=None,flip=False,tag='layout'):
 im=images[k];h=h or w*im.height/im.width;placements.append(dict(key=k,x=x,y=y,w=w,h=h,flip=flip,tag=tag))
place('judgment',layout['dais']['x'],layout['dais']['y'],layout['dais']['w'])
for h in layout['houses']:place('house-'+h['key'],h['x'],h['y'],h['w'],h['h'],h['flip'])
limits={'sala':(280,330),'tea':(260,270),'sawan':(260,300),'krajok':(280,340)}
for k,(mw,mh) in limits.items():
 s=layout['stations'][k];im=images[k];sc=min(mw/im.width,mh/im.height)*s['mapScale'];place(k,s['bx'],s['by'],im.width*sc,im.height*sc)
for p in layout['props']:
 k=None
 if p['kind'] in ['lamp','torch']:k=p['kind']
 elif p['kind']=='tree' and p['biome']=='ice':k='sakura'
 elif p['id']=='banyan':k='willow'
 if k:place(k,p['x'],p['y'],p['w'],tag='species preview at existing Z1 site' if k in ['sakura','willow'] else 'layout')
# Existing original props remain at the inherited Z1 positions for context.
for p in layout['props']:
 if p['kind'] not in ['tree','palm','rock'] or p['id']=='banyan' or p['biome']=='ice' and p['kind']=='tree':continue
 path= ('img/map-zone2/prop-rock-v1.webp' if p['kind']=='rock' else 'img/theme-v4/town-landmark-asia-v1.webp' if p['kind']=='palm' else 'img/theme-v4/town-tree-b-asia-v1.webp' if p['biome']=='lava' else 'img/theme-v4/town-tree-asia-v1.webp')
 key='context-'+p['id'];images[key]=Image.open(path).convert('RGBA');place(key,p['x'],p['y'],p['w'],tag='retained context')
for p in sorted(placements,key=lambda p:p['y']):
 im=images[p['key']];im=ImageOps.mirror(im) if p['flip'] else im
 w=round(p['w']*4915/3840);h=round(p['h']*3277/2560);im=im.resize((w,h),Image.Resampling.LANCZOS)
 ground.alpha_composite(im,(round(p['x']*4915/3840-w/2),round(p['y']*3277/2560-h)))
ground.convert('RGB').save(QA/'zone2-composite-native.webp',quality=95)
preview=ground.convert('RGB');preview.thumbnail((1536,1024));preview.save(QA/'zone2-composite-preview.webp',quality=95)
(QA/'placements.json').write_text(json.dumps(placements,indent=2));(QA/'measurements.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'asset_count':len(rows),'dimensions_equal':len(rows),'alpha_base_y_equal':len(rows),'max_base_x_error_px':max(abs(r['base_delta'][0]) for r in report),'original_hashes_unchanged':len(rows),'composite_px':list(ground.size)},indent=2))
