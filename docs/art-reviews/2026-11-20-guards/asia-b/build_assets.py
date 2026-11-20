"""Rebuild only asia-b artwork and measured review artifacts. Requires Pillow/numpy."""
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import json, hashlib
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[3]
GEN=ROOT/'generated'
THRESHOLD=127

def box(im):
 a=np.asarray(im.getchannel('A')); y,x=np.where(a>THRESHOLD)
 return [int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]
def foot(im,roi):
 x1,y1,x2,y2=map(int,roi); a=np.asarray(im.getchannel('A')); sub=a[max(0,y1):min(a.shape[0],y2),max(0,x1):min(a.shape[1],x2)]
 yy,xx=np.where(sub>THRESHOLD); bottom=int(yy.max())+max(0,y1)+1
 yy,xx=np.where(a[max(0,bottom-20):bottom,max(0,x1):min(a.shape[1],x2)]>THRESHOLD)
 return [round((int(xx.min())+int(xx.max()))/2+max(0,x1),2),bottom]
def head(im,roi):
 x1,x2=map(int,roi); a=np.asarray(im.getchannel('A')); yy,xx=np.where(a[:a.shape[0]//2,max(0,x1):min(a.shape[1],x2)]>THRESHOLD)
 return int(yy.min())
def clean(im):
 a=np.asarray(im).copy(); alpha=a[:,:,3]; alpha[alpha<16]=0;alpha[alpha>=240]=255;a[:,:,3]=alpha;a[alpha==0,:3]=0
 return Image.fromarray(a,'RGBA')
# Hand-selected anatomical regions exclude the staff and the original cross-cell debris.
# source head ROI, source boot ROI, generated head ROI, generated boot ROI, target width.
C=[
 ((80,190),(30,450,215,490),(330,650),(290,1180,748,1310),216,'combat-0'),
 ((40,200),(150,450,240,490),(420,680),(645,1040,865,1150),345,'combat-1'),
 ((50,210),(135,450,230,490),(490,780),(900,860,1140,1005),345,'combat-2'),
 ((40,210),(135,450,230,490),(400,650),(650,800,850,925),345,'combat-3'),
 ((40,260),(240,450,335,490),(400,700),(800,850,1040,980),345,'combat-4'),
 ((130,250),(85,450,270,490),(330,650),(290,1180,748,1310),216,'combat-0'),
 ((20,180),(265,450,358,490),(130,450),(780,1030,1005,1155),346,'combat-6'),
 ((90,250),(210,450,288,490),(530,850),(680,1080,900,1190),235,'combat-7'),
]
I=[((90,200),(75,325,230,365),(370,670),(200,1210,740,1340),190,'idle') for _ in range(4)]
W=[
 ((130,350),(0,650,160,700),(400,690),(100,1170,315,1335),428,'walk-0'),
 ((110,320),(130,650,300,705),(370,650),(375,1340,600,1470),437,'walk-1-fixed'),
 ((125,340),(0,650,160,700),(400,690),(100,1170,315,1335),452,'walk-0'),
 ((110,320),(100,650,265,705),(370,650),(280,1330,510,1455),437,'walk-3'),
]
meta=json.loads((ROOT/'source-metadata.json').read_text())
atlas=json.loads((ROOT/'walk-atlas-original.json').read_text())
records=[]; previews=[]; comparison=[]

def transform(src,size,spec,blink=False):
 shr,sfr,ghr,gfr,target_width,name=spec
 gen=clean(Image.open(GEN/(name+'.webp')).convert('RGBA'))
 if blink:
  # Minor blink uses only skin/upper-lash pixels from this painted frame.
  original_face=gen.copy()
  for eye,skin,poly,lash in [
   ((418,486,490,517),(418,520,490,545),[(0,9),(69,0),(57,26),(16,31),(0,22)],(420,486,490,491)),
   ((349,494,385,518),(350,520,386,544),[(1,0),(35,7),(32,23),(3,18)],(350,493,385,498))]:
   x1,y1,x2,y2=eye;mask=Image.new('L',(x2-x1,y2-y1));ImageDraw.Draw(mask).polygon(poly,fill=255)
   patch=original_face.crop(skin).resize(mask.size,Image.Resampling.LANCZOS);gen.paste(patch,(x1,y1),mask)
   line=original_face.crop(lash).resize((x2-x1,3),Image.Resampling.LANCZOS);gen.alpha_composite(line,(x1,y1+11))
 if name=='combat-4':
  # Keep torso/boots broad; shorten only the part of the guandao beyond the front hand.
  part=gen.crop((950,0,gen.width,700)); gen.paste((0,0,0,0),(950,0,gen.width,700)); gen.alpha_composite(part.resize((300,700),Image.Resampling.LANCZOS),(950,0))
 sb=box(src);gb=box(gen); sf=foot(src,sfr); gf=foot(gen,gfr); sh=head(src,shr); gh=head(gen,ghr)
 sy=(sf[1]-sh)/(gf[1]-gh)
 sx=target_width/(gb[2]-gb[0])
 # Anchor the contact boot and keep every new sprite inside its original cell/atlas rect.
 # Width can shrink when the original boot sits close to the edge.
 if gf[0]>gb[0]:sx=min(sx,(sf[0]-1)/(gf[0]-gb[0]))
 if gb[2]>gf[0]:sx=min(sx,(size[0]-2-sf[0])/(gb[2]-gf[0]))
 if name=='combat-2':sx=.26  # Original pose crops its rear leg; keep body width instead of squeezing it.
 target_top=min(sh,sb[1]); top_h=max(0,sh-target_top)
 width=max(1,round(gen.width*sx));body_h=sf[1]-sh
 result=Image.new('RGBA',(width,top_h+body_h))
 weapon_regions={'combat-0':(710,930,650),'walk-0':(110,350,560),'walk-1-fixed':(0,280,610),'walk-3':(0,280,610)}
 if name in weapon_regions and top_h:
  wx1,wx2,base=weapon_regions[name]
  blade=gen.crop((wx1,gb[1],wx2,base))
  gen.paste((0,0,0,0),(wx1,gb[1],wx2,base))
  result.alpha_composite(gen.crop((0,gh,gen.width,gf[1])).resize((width,body_h),Image.Resampling.LANCZOS),(0,top_h))
  blade_h=top_h+round((base-gh)*sy)
  result.alpha_composite(blade.resize((max(1,round((wx2-wx1)*sx)),blade_h),Image.Resampling.LANCZOS),(round(wx1*sx),0))
 else:
  if top_h and gh>gb[1]:
   result.alpha_composite(gen.crop((0,gb[1],gen.width,gh)).resize((width,top_h),Image.Resampling.LANCZOS),(0,0))
  result.alpha_composite(gen.crop((0,gh,gen.width,gf[1])).resize((width,body_h),Image.Resampling.LANCZOS),(0,top_h))
 lean=60 if name=='combat-2' else 0
 if lean:
  result=result.transform((result.width+lean,result.height),Image.Transform.AFFINE,(1,lean/body_h,-lean,0,1,0),Image.Resampling.BICUBIC)
 def maproi(roi):
  x1,y1,x2,y2=roi
  return (int(x1*sx),max(0,round((y1-gh)*sy+top_h)),int(x2*sx)+2,min(result.height,round((y2-gh)*sy+top_h)+2))
 localfr=maproi(gfr); nf=foot(result,localfr)
 dx=round(sf[0]-nf[0]);dy=sf[1]-nf[1]
 out=Image.new('RGBA',size);out.alpha_composite(result,(dx,dy))
 newfr=[localfr[0]+dx,localfr[1]+dy,localfr[2]+dx,localfr[3]+dy]
 newhr=[round(ghr[0]*sx)+dx+lean,round(ghr[1]*sx)+dx+lean]
 return out,{'source_head_roi':shr,'source_boot_roi':sfr,'new_head_roi':newhr,'new_boot_roi':newfr,'source_body_top':sh,'source_foot':sf,'generated':name,'horizontal_scale':round(sx,6),'body_vertical_scale':round(sy,6),'upper_weapon_compressed':bool(top_h),'offset':[dx,dy]}

for m,specs in zip(meta,[C,I,W]):
 original=Image.open(ROOT/'originals'/(m['name']+'.webp')); output=Image.new('RGBA',original.size);oldframes=[];newframes=[];landmarks=[]
 for i,spec in enumerate(specs):
  if m['name']=='walk':
   f=atlas['frames'][i];rect=(f['x'],f['y'],f['x']+f['w'],f['y']+f['h'])
  else:
   cw,ch=m['cell']; x=i%m['grid'][0]*cw;y=i//m['grid'][0]*ch;rect=(x,y,x+cw,y+ch)
  src=original.crop(rect);new,lm=transform(src,src.size,spec,blink=(m['name']=='idle' and i==2));output.alpha_composite(new,rect[:2]);lm['frame']=i;lm['rect']=rect;landmarks.append(lm);oldframes.append(src);newframes.append(new)
 path=REPO/m['path']; output.save(path,'WEBP',lossless=True,method=6)
 # Reopen the actual encoded game asset; measure, compare and animate this decoded result.
 reopened=Image.open(path); frame_results=[]
 for i,lm in enumerate(landmarks):
  fr=reopened.crop(lm['rect']); old=oldframes[i];nf=foot(fr,lm['new_boot_roi']);nh=head(fr,lm['new_head_roi']);sf=lm['source_foot'];sh=lm['source_body_top']
  dh=(nf[1]-nh)/(sf[1]-sh)-1; delta=[round(nf[0]-sf[0],2),nf[1]-sf[1]]
  frame_results.append({**lm,'old_alpha_bbox':box(old),'new_alpha_bbox':box(fr),'new_body_top':nh,'new_foot':nf,'old_body_height':sf[1]-sh,'new_body_height':nf[1]-nh,'body_height_delta_percent':round(dh*100,4),'foot_delta_px':delta,'within_foot_tolerance':all(abs(v)<=2 for v in delta),'within_height_tolerance':abs(dh)<=.03})
  newframes[i]=fr
 record={**m,'saved_size':list(reopened.size),'saved_mode':reopened.mode,'metadata_equal':reopened.size==original.size and reopened.mode==original.mode,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'frames_measured':frame_results}
 records.append(record)
 # GIF side by side before/after, with stable cell origins; walk uses runtime atlas offsets.
 frames=[]
 for i,(old,new) in enumerate(zip(oldframes,newframes)):
  if m['name']=='walk':
   canvas_size=(454,700); ox=atlas['frames'][i]['ox']; oy=atlas['frames'][i]['oy']
  else:canvas_size=old.size;ox=oy=0
  ratio=min(1,500/canvas_size[1]);ww=round(canvas_size[0]*ratio);hh=round(canvas_size[1]*ratio)
  panel=Image.new('RGB',(ww*2+12,hh+32),'#d8d8d8');d=ImageDraw.Draw(panel);d.text((6,8),'BEFORE',fill='black');d.text((ww+18,8),'AFTER',fill='black')
  for j,im in enumerate((old,new)):
   bg=Image.new('RGBA',canvas_size,'#e5e0d7');bg.alpha_composite(im,(ox,oy));bg=bg.convert('RGB').resize((ww,hh),Image.Resampling.LANCZOS);panel.paste(bg,(j*(ww+12),32))
  frames.append(panel)
 frames[0].save(ROOT/(m['name']+'.gif'),save_all=True,append_images=frames[1:],duration=140 if m['name']=='walk' else 190,loop=0,optimize=False)
 # Whole-sheet review panels, without changing grid.
 strip=Image.new('RGB',(1600,round(original.height*780/original.width)+44),'#ddd8ce');d=ImageDraw.Draw(strip);d.text((10,10),m['name'].upper()+' / BEFORE',fill='black');d.text((810,10),m['name'].upper()+' / AFTER',fill='black')
 for j,im in enumerate((original,reopened)):
  bg=Image.new('RGBA',im.size,'#e5e0d7');bg.alpha_composite(im);bg=bg.convert('RGB');bg.thumbnail((780,1000));strip.paste(bg,(j*800+10,36))
 comparison.append(strip)
 # Larger separate frame review, so hands/weapon/pose can actually be inspected.
 cellw,cellh=(384,512) if m['name']=='combat' else ((256,384) if m['name']=='idle' else (454,724))
 contact=Image.new('RGB',(cellw*4,cellh*((len(newframes)+3)//4)),'#e5e0d7')
 for i,fr in enumerate(newframes):
  bg=Image.new('RGBA',(cellw,cellh),'#e5e0d7');fr=fr.copy();fr.thumbnail((cellw,cellh));bg.alpha_composite(fr,((cellw-fr.width)//2,cellh-fr.height));contact.paste(bg.convert('RGB'),((i%4)*cellw,(i//4)*cellh))
 contact.save(ROOT/(m['name']+'-frames.jpg'),quality=94)

compare=Image.new('RGB',(1600,sum(p.height for p in comparison)+20*(len(comparison)-1)),'#b8b2a8');y=0
for p in comparison:compare.paste(p,(0,y));y+=p.height+20
compare.save(ROOT/'compare.jpg',quality=94)
validation={'scope':'asia-b only','alpha_threshold':THRESHOLD,'foot_definition':'Center x of bottom twenty opaque rows inside annotated contact-boot ROI; y is exclusive boot bottom. Anatomical head ROI excludes weapon/cross-frame debris. Coordinates are local to original cell or runtime atlas rectangle.','generation_calls':12,'files':records,'automated_numeric_checks_ok':all(r['metadata_equal'] and all(f['within_foot_tolerance'] and f['within_height_tolerance'] for f in r['frames_measured']) for r in records),'runtime_playtest':'not run; art-only task, no source/test edits','visual_review':'manual review of decoded sheets, contact sheets and GIF frames; see README for limitations'}
(ROOT/'validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'numeric_checks':validation['automated_numeric_checks_ok'],'files':[{'name':r['name'],'max_foot_delta':max(max(abs(v) for v in f['foot_delta_px']) for f in r['frames_measured']),'max_height_delta_percent':max(abs(f['body_height_delta_percent']) for f in r['frames_measured'])} for r in records]},indent=2))

# Anatomical measurement overlay, regenerated from the exact saved assets.
rows=[]
for item in records:
 old=Image.open(ROOT/'originals'/(item['name']+'.webp'));new=Image.open(REPO/item['path'])
 for f in item['frames_measured']:
  src=old.crop(f['rect']);dst=new.crop(f['rect']);panel=Image.new('RGB',(src.width*2+16,src.height+32),'#e5e0d7')
  ImageDraw.Draw(panel).text((5,8),item['name']+' '+str(f['frame'])+' BEFORE | AFTER',fill='black')
  for j,(im,point,top,hr,roi) in enumerate([(src,f['source_foot'],f['source_body_top'],f['source_head_roi'],f['source_boot_roi']),(dst,f['new_foot'],f['new_body_top'],f['new_head_roi'],f['new_boot_roi'])]):
   bg=Image.new('RGBA',im.size,'#e5e0d7');bg.alpha_composite(im);d=ImageDraw.Draw(bg);d.line((hr[0],top,hr[1],top),fill='#d000ff',width=2);x,y=point;d.line((x-10,y,x+10,y),fill='#0080ff',width=2);d.line((x,y-10,x,y+3),fill='#0080ff',width=2);d.rectangle(roi,outline='#009933');panel.paste(bg.convert('RGB'),(j*(im.width+16),32))
  panel.thumbnail((780,630));rows.append(panel)
height=sum(max(rows[i].height,rows[i+1].height if i+1<len(rows) else 0) for i in range(0,len(rows),2));overlay=Image.new('RGB',(1560,height),'#bbb5ab');y=0
for i in range(0,len(rows),2):
 overlay.paste(rows[i],(0,y))
 if i+1<len(rows):overlay.paste(rows[i+1],(780,y))
 y+=max(rows[i].height,rows[i+1].height if i+1<len(rows) else 0)
overlay.save(ROOT/'landmarks.jpg',quality=90)
