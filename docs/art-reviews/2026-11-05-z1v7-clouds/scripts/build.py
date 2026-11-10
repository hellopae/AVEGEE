from pathlib import Path
from PIL import Image,ImageDraw
import json,numpy as np,hashlib
R=Path(__file__).resolve().parents[1]; cfg=json.loads((R/'regions.json').read_text());W,H=cfg['fullPx'];mask=np.array(Image.open(R/'cloud-layer-mask.png'))
files=[]; registration=[]
for v in ['A','B']:
 for row in range(4):
  for col in range(5):
   x,y=col*2048,row*2048;w,h=min(2048,W-x),min(2048,H-y)
   accum=np.zeros((h,w,4),np.float32);weights=np.zeros((h,w),np.float32)
   for q in cfg['quarters']:
    l,t,r,b=q['contextBoxPx2x'];ql,qt,qw,qh=q['rectPx2x'];ix,iy,ir,ib=max(x,l),max(y,t),min(x+w,r),min(y+h,b)
    if ix>=ir or iy>=ib:continue
    src=Image.open(R/'sources'/f"{q['id']}-{v}.webp").convert('RGBA')
    # Some built-in outputs are 1536x1024. Keep the 1024px core; drop context only on that axis.
    if src.width<r-l:l,r=ql,ql+qw
    if src.height<b-t:t,b=qt,qt+qh
    ix,iy,ir,ib=max(x,l),max(y,t),min(x+w,r),min(y+h,b)
    if ix>=ir or iy>=ib:continue
    assert src.width>=r-l and src.height>=b-t,'No upscaling allowed'
    sourceSize=list(src.size);a=np.array(src.resize((r-l,b-t),Image.Resampling.LANCZOS),dtype=np.float32)/255
    a[:,:,:3]*=a[:,:,3:4]
    xx=np.arange(l,r);yy=np.arange(t,b);wx=np.ones(r-l,np.float32);wy=np.ones(b-t,np.float32)
    if l<ql:wx[xx<ql]=(xx[xx<ql]-l+1)/(ql-l+1)
    if r>ql+qw:wx[xx>=ql+qw]=(r-xx[xx>=ql+qw])/(r-ql-qw+1)
    if t<qt:wy[yy<qt]=(yy[yy<qt]-t+1)/(qt-t+1)
    if b>qt+qh:wy[yy>=qt+qh]=(b-yy[yy>=qt+qh])/(b-qt-qh+1)
    weight=wy[:,None]*wx[None,:];ss=np.s_[iy-t:ib-t,ix-l:ir-l];ds=np.s_[iy-y:ib-y,ix-x:ir-x]
    accum[ds]+=a[ss]*weight[ss][:,:,None];weights[ds]+=weight[ss]
    if row==int(qt//2048) and col==int(ql//2048): registration.append({'id':q['id']+'-'+v,'nativeSize':sourceSize,'mappedSize':[r-l,b-t],'contextBoxPx2x':[l,t,r,b],'quarterRectPx2x':q['rectPx2x'],'scale':[round((r-l)/sourceSize[0],6),round((b-t)/sourceSize[1],6)]})
   accum/=np.maximum(weights[:,:,None],1e-9)
   rgb=accum[:,:,:3]/np.maximum(accum[:,:,3:4],1e-9);alpha=accum[:,:,3]*mask[y:y+h,x:x+w]/255
   a=np.dstack((rgb,alpha));out=Image.fromarray(np.rint(np.clip(a,0,1)*255).astype('uint8'),'RGBA');p=R/f'layer-{v}'/f'r{row+1}-c{col+1}.webp';out.save(p,quality=94,method=4,exact=True)
   files.append({'variant':v,'file':str(p.relative_to(R)),'rectPx2x':[x,y,w,h],'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
puffs=[]
# Drawn individually. Downsample only; same pixel/world axes as base map.
shapes=['long-low','triple-lobe','split-wisp','round-turret','swept-crescent','flat-bank','tiny-curl','double-billow']
import cv2
small=cv2.resize(mask,(4915,3277),interpolation=cv2.INTER_AREA);dist=cv2.distanceTransform((small>100).astype('uint8'),cv2.DIST_L2,3);centers=[]
for _ in range(8):
 _,peak,_,pos=cv2.minMaxLoc(dist);px,py=pos;centers.append((px*3840/4915,py*2560/3277));cv2.circle(dist,(px,py),150,0,-1)
for i in range(8):
 src=Image.open(R/'sources'/f'puff-{i+1:02d}.webp').convert('RGBA');bbox=src.getchannel('A').getbbox();assert bbox
 p=src.crop(bbox);maxw=512
 if p.width>maxw:p=p.resize((maxw,round(p.height*maxw/p.width)),Image.Resampling.LANCZOS)
 path=R/'puffs'/f'puff-{i+1:02d}.png';p.save(path,optimize=True)
 widthWorld=100+(i%3)*10;heightWorld=widthWorld*p.height/p.width
 puffs.append({'id':f'puff-{i+1:02d}','file':str(path.relative_to(R)),'shape':shapes[i],'sizePx':list(p.size),'spriteWorld':[widthWorld,heightWorld],'pixelsPerWorldUnit':p.width/widthWorld,'originWorld':list(centers[i]),'driftWorldPerSecond':[.8+(i%3)*.25,(-1 if i%2 else 1)*.08],'opacity':.55,'nativeAlphaCrop':list(bbox),'clip':'cloud-layer-mask.png'})
json.dump(registration,open(R/'registration.json','w'),indent=2)
clouds={'schemaVersion':1,'fullPx':[W,H],'worldSize':[3840,2560],'pixelsPerWorldUnit':[W/3840,H/2560],'chunk':2048,'rows':4,'cols':5,'mask':'cloud-layer-mask.png','layers':files,'puffs':puffs,'animation':{'periodSeconds':24,'weightB':'0.5 - 0.5 * cos(2*pi*t/24)','blend':'premultiplied sRGB numeric RGBA interpolation before source-over; no linear-light conversion','layerDriftWorldAmplitude':[1.5,.3],'layerDriftPeriodSeconds':48,'driftFormula':'sin(2*pi*t/48) * amplitude; sample continuous global layer before mask','maskSpace':'fixed world; reapply mask AFTER drift and puff composition','opacity':.78,'cameraParallax':False},'regions':'regions.json','scope':'asset pack and offline preview only; game code unchanged','generationCount':len(json.loads((R/'generation-records.json').read_text()))}
json.dump(clouds,open(R/'clouds.json','w'),indent=2)
print('Built',len(files),'chunk layers and',len(puffs),'puffs')
