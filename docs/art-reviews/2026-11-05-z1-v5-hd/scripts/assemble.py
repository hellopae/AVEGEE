from pathlib import Path
import json,math
import numpy as np,cv2
from PIL import Image,ImageDraw,ImageFont
O=Path(__file__).resolve().parents[1];NAMES=['r2-c2','r2-c3','r3-c2','r3-c3'];S=4915/1600
records=[];acc=np.zeros((2304,2304,3),np.float32);weight=np.zeros((2304,2304),np.float32)
for name in NAMES:
 row,col=map(int,[name[1],name[4]]);x=(col-2)*1024;y=(row-2)*1024
 im=np.array(Image.open(O/f'evidence/{name}-registered.webp').convert('RGB'),dtype=np.float32)
 a=np.arange(1280)+.5;v=np.clip(np.minimum(a,1280-a)/128,0,1);v=v*v*(3-2*v);w=v[:,None]*v[None,:]
 acc[y:y+1280,x:x+1280]+=im*w[:,:,None];weight[y:y+1280,x:x+1280]+=w
 records.append(json.loads((O/f'evidence/{name}-registration.json').read_text()))
pilot=np.uint8(np.clip(acc/np.maximum(weight[:,:,None],1e-6),0,255))[128:2176,128:2176]
old=Image.open(O/'inputs/master-lossless.webp').convert('RGB');oldp=np.array(old.crop((1024,1024,3072,3072)))
# Match external original chunks with a 96px continuous feather. This intentionally retains old perimeter art.
a=np.arange(2048)+.5;v=np.clip((np.minimum(a,2048-a)-8)/88,0,1);v=v*v*(3-2*v);w=v[:,None]*v[None,:]
pilot=np.uint8(pilot.astype(np.float32)*w[:,:,None]+oldp*(1-w[:,:,None]))
base=Image.fromarray(pilot);base.save(O/'evidence/pilot-base-1x.jpg',quality=94)
up=base.resize((4096,4096),Image.Resampling.LANCZOS)
for name in NAMES:
 r,c=int(name[1]),int(name[4]);x=(c-2)*2048;y=(r-2)*2048;up.crop((x,y,x+2048,y+2048)).save(O/f'chunks-2x/{name}.webp',quality=95,method=4)
# Sprite data generated separately from full-size owner's originals and individually generated rails.
sprites=json.loads((O/'sprites.json').read_text()) if (O/'sprites.json').exists() else []
comp=up.convert('RGBA')
for a in sorted(sprites,key=lambda a:({'back':0,'sort':1,'front':2}[a['layer']],a['footWorld'][1])):
 x,y,w,h=a['rectWorld'];px=round(x*4915/3840*2-2048);py=round(y*3277/2560*2-2048);im=Image.open(O/a['src']).convert('RGBA').resize((round(w*4915/3840*2),round(h*3277/2560*2)),Image.Resampling.LANCZOS);comp.alpha_composite(im,(px,py))
comp.convert('RGB').resize((1600,1600)).save(O/'evidence/pilot-with-sprites.jpg',quality=92)
# Three equal-camera panels at 2.8 device px / world unit. No screenshot claim: offline composition.
regions=[('PLAZA',(2150,1050,2800,1450)),('STAIRS',(2280,1370,2750,1800)),('BRIDGE',(2300,1900,2650,2500))]
panels=[];ratio=2.8/(4915/3840)
for title,b in regions:
 ow,oh=round((b[2]-b[0])*ratio),round((b[3]-b[1])*ratio)
 before=old.crop(b).resize((ow,oh),Image.Resampling.LANCZOS);nb=((b[0]-1024)*2,(b[1]-1024)*2,(b[2]-1024)*2,(b[3]-1024)*2);after=comp.crop(nb).convert('RGB').resize((ow,oh),Image.Resampling.LANCZOS)
 panel=Image.new('RGB',(ow*2+24,oh+48),'#171820');panel.paste(before,(0,48));panel.paste(after,(ow+24,48));d=ImageDraw.Draw(panel);d.text((12,14),title+' OLD | 2.8 device px/world unit',fill='white');d.text((ow+36,14),'NEW + SEPARATE SPRITES',fill='white');panels.append(panel)
out=Image.new('RGB',(max(p.width for p in panels),sum(p.height for p in panels)+32),'#171820');y=0
for p in panels:out.paste(p,(0,y));y+=p.height
out.save(O/'compare-game-zoom.jpg',quality=95,subsampling=0)
# Seam sheet includes internal vertical/horizontal cuts and all four original outer neighbors.
full=old.copy();full.paste(base,(1024,1024));seams=[('INNER V',(1984,1024,2112,3072)),('INNER H',(1024,1984,3072,2112)),('OUTER N',(1024,960,3072,1088)),('OUTER S',(1024,3008,3072,3136)),('OUTER W',(960,1024,1088,3072)),('OUTER E',(3008,1024,3136,3072))]
sheet=Image.new('RGB',(1600,6*220),'#181b24');d=ImageDraw.Draw(sheet)
for i,(title,b) in enumerate(seams):
 a=full.crop(b)
 if a.height>a.width:a=a.transpose(Image.Transpose.ROTATE_90)
 a=a.resize((1536,160));sheet.paste(a,(32,i*220+42));d.text((32,i*220+10),title+' - center line is chunk boundary (strip resized)',fill='white');d.line([(32,i*220+122),(1568,i*220+122)],fill='#48bfc9',width=1)
sheet.save(O/'seam-check.jpg',quality=93)
# Manual terrain boundary polylines in original 1600px-overview coordinates. NOT inferred from the walkmask.
lines=[('central-stair-left',[(754,305),(755,333)]),('central-stair-right',[(790,305),(792,333)]),('plaza-south',[(676,447),(717,459),(754,463),(793,463),(837,454),(872,440)]),('middle-stair-left',[(778,633),(778,666)]),('middle-stair-right',[(821,633),(821,666)]),('north-bank',[(602,699),(657,711),(716,715),(765,712)]),('east-north-bank',[(839,710),(876,713),(906,712)]),('south-bank',[(673,809),(719,817),(767,817)]),('bridge-west-deck',[(781,668),(780,785)]),('bridge-east-deck',[(822,668),(822,785)]),('bridge-south-steps',[(780,789),(772,820),(824,820),(819,789)]),('pier-edge',[(907,748),(955,748),(957,763),(908,761)]),('south-plaza',[(667,882),(663,920),(695,946),(751,961),(819,961),(871,947),(912,920),(916,880)])]
g0=cv2.cvtColor(oldp,cv2.COLOR_RGB2GRAY);g1=cv2.cvtColor(pilot,cv2.COLOR_RGB2GRAY)
e0=cv2.Canny(g0,70,160);e1=cv2.Canny(g1,70,160)
dist0=cv2.distanceTransform(255-e0,cv2.DIST_L2,5);dist1=cv2.distanceTransform(255-e1,cv2.DIST_L2,5)
probes=[];canvas=base.convert('RGB');d=ImageDraw.Draw(canvas)
for label,pts in lines:
 pts=[(p[0]*S-1024,p[1]*S-1024) for p in pts];values=[]
 for a,b in zip(pts,pts[1:]):
  for t in np.linspace(0,1,max(2,int(math.dist(a,b)/6))):
   x,y=np.array(a)*(1-t)+np.array(b)*t;x=int(round(x));y=int(round(y))
   if 0<=x<2048 and 0<=y<2048 and dist0[y,x]<3:
    values.append(float(dist1[y,x]));d.ellipse((x-2,y-2,x+2,y+2),fill='#54f2d0' if dist1[y,x]<=4 else '#ff4d65')
 if values:probes.append(dict(id=label,samples=len(values),maxNearestEdgePx=max(values),p95NearestEdgePx=float(np.percentile(values,95))))
 d.line(pts,fill='#54a6ff',width=1)
canvas.resize((1600,1600)).save(O/'structure-check.jpg',quality=95)
metric={'thresholdPx1x':4,'method':'Manual contour polylines; source points within 3px of Canny edge; nearest new Canny edge distance, 6px sample spacing','limitation':'Stone texture also produces edges; this is a diagnostic, NOT proof of semantic boundary correspondence or whole walkmask compatibility. No QA pass claimed.','probes':probes,'registration':records,'semanticStructureVerified':False,'nativeResolutionMeetsMinimum1_5x':all(a['nativeSize'][0]>=1920 for a in records),'exportSize':[2048,2048]}
(O/'structure-metrics.json').write_text(json.dumps(metric,indent=2))
# Style comparison of new center terrain and full-resolution owner art, not repainted thumbnails.
style=Image.new('RGB',(1800,1050),'#24232b');d=ImageDraw.Draw(style);d.text((24,15),'NEW TERRAIN | OWNER ORIGINAL BUILDINGS (STYLE ONLY)',fill='white');a=comp.convert('RGB').crop((2000,0,3500,1900));a.thumbnail((870,950));style.paste(a,(15,60))
for j,i in enumerate([14,16,43]):
 a=Image.open(O/f'inputs/style-{i}.webp').convert('RGBA');a.thumbnail((425,470));style.paste(a,(900+j%2*440,60+j//2*480),a)
style.save(O/'style-compare.jpg',quality=93)
chunkdata=[]
for n in NAMES:
 r,c=int(n[1]),int(n[4]);chunkdata.append(dict(id=n,src='chunks-2x/'+n+'.webp',size=[2048,2048],rectWorld=[(c-1)*1024*3840/4915,(r-1)*1024*2560/3277,1024*3840/4915,1024*2560/3277],rectPx1x=[(c-1)*1024,(r-1)*1024,1024,1024]))
(O/'chunks.json').write_text(json.dumps(chunkdata,indent=2));print('Atlas exported. Diagnostic maximum',max((a['maxNearestEdgePx'] for a in probes),default=None))
