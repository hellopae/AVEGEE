"""B12 adaptation of Zone 1 export-seamless-terrain.py (read-only source).
Fuse two registered detail studies under fixed common alpha; export exact guttered tiles.
Dependencies: Pillow, numpy, opencv-python.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np,cv2,json,hashlib,sys

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/(sys.argv[1] if len(sys.argv)>1 else 'docs/art-reviews/2026-11-05-border12-redraw')
layout=json.loads((OUT/'detail-layout.json').read_text());W,H=layout['finalSize'];MW,MH=layout['masterSize'];SX,SY=W/MW,H/MH
base=Image.open(OUT/'source-images/terrain-base.png').convert('RGBA').resize((W,H),Image.Resampling.LANCZOS)
rgba=np.asarray(base);rgb=rgba[:,:,:3].astype('float32');total=rgb.copy();weights=np.ones((H,W),dtype='float32');reports=[]
# Keep all coastlines and the walkable stair/bridge geometry from the common atlas.
safe=Image.fromarray(np.uint8(rgba[:,:,3]>=250)*255).filter(ImageFilter.MinFilter(17))
features=Image.new('L',(W,H));draw=ImageDraw.Draw(features)
RW,RH=layout.get('referenceSize',[1100,774])
rects=layout.get('protectRects',[(350,260,477,373),(50,220,132,290),(108,267,190,334),(112,373,202,435),(990,220,1099,293),(955,272,1070,350),(946,370,1048,452)])
for box in rects:draw.rectangle(tuple(v*(W/RW if i%2==0 else H/RH) for i,v in enumerate(box)),fill=255)
polys=layout.get('protectPolys',[[(85,409),(353,403),(390,454),(338,516),(143,518),(72,482)],[(665,402),(1005,399),(1040,452),(990,543),(688,543)],[(413,477),(679,472),(744,535),(714,611),(568,672),(414,671)]])
for poly in polys:draw.polygon([(x*W/RW,y*H/RH) for x,y in poly],fill=255)
features=features.filter(ImageFilter.GaussianBlur(12))
detail_allowed=np.asarray(safe).astype('float32')/255*(1-np.asarray(features).astype('float32')/255)
if layout.get('protectCoarseEdges',False):
 coarse=cv2.GaussianBlur(cv2.cvtColor(np.uint8(rgb),cv2.COLOR_RGB2GRAY),(0,0),4)
 edges=cv2.dilate(cv2.Canny(coarse,12,35),np.ones((9,9),dtype='uint8'))
 detail_allowed*=1-edges.astype('float32')/255
master=Image.open(OUT/'source-images/terrain-base.png').convert('RGBA')
for name,box in layout['crops'].items():
 source=master.crop(box);generated=Image.open(OUT/'detail-masters'/f'{name}.webp').convert('RGBA')
 sm=np.asarray(source);small=np.asarray(generated.resize(source.size,Image.Resampling.LANCZOS));mask=np.uint8(sm[:,:,3]>220)*255
 sift=cv2.SIFT_create(nfeatures=6000);a,ad=sift.detectAndCompute(cv2.cvtColor(small[:,:,:3],cv2.COLOR_RGB2GRAY),mask);b,bd=sift.detectAndCompute(cv2.cvtColor(sm[:,:,:3],cv2.COLOR_RGB2GRAY),mask)
 good=[];M=None;inliers=0
 if ad is not None and bd is not None:good=[m for pair in cv2.BFMatcher().knnMatch(ad,bd,k=2) if len(pair)==2 for m,n in [pair] if m.distance<.74*n.distance]
 if len(good)>=10:
  candidate,valid=cv2.estimateAffinePartial2D(np.float32([a[m.queryIdx].pt for m in good]),np.float32([b[m.trainIdx].pt for m in good]),method=cv2.RANSAC,ransacReprojThreshold=2.5)
  if candidate is not None:
   inliers=int(valid.sum());scale=np.hypot(candidate[0,0],candidate[1,0])
   if inliers>=12 and .96<scale<1.04 and np.linalg.norm(candidate[:,2])<30:M=candidate
 x0,y0,x1,y1=round(box[0]*SX),round(box[1]*SY),round(box[2]*SX),round(box[3]*SY);cw,ch=x1-x0,y1-y0
 detail=np.asarray(generated.resize((cw,ch),Image.Resampling.LANCZOS))[:,:,:3].astype('float32')
 if M is not None:
  transform=M.copy();transform[0,2]*=cw/source.width;transform[1,2]*=ch/source.height
  detail=cv2.warpAffine(detail,transform,(cw,ch),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT_101)
 original=rgb[y0:y1,x0:x1]
 # Match the shared atlas's broad light/color; preserve the finer generated detail.
 detail=np.clip(detail+cv2.GaussianBlur(original,(0,0),32)-cv2.GaussianBlur(detail,(0,0),32),0,255)
 yy,xx=np.mgrid[:ch,:cw];fade=np.ones((ch,cw),dtype='float32')
 for distance,boundary in [(xx,box[0]>0),(cw-1-xx,box[2]<MW),(yy,box[1]>0),(ch-1-yy,box[3]<MH)]:
  if boundary:fade*=np.clip(distance/150,0,1)
 weight=fade*detail_allowed[y0:y1,x0:x1]*4.0
 total[y0:y1,x0:x1]+=detail*weight[:,:,None];weights[y0:y1,x0:x1]+=weight
 reports.append({'crop':name,'sourceRectangle':box,'inliers':inliers,'registrationMatrix':None if M is None else M.tolist(),'generatedSize':list(generated.size),'fallback':None if M is not None else 'identity with protected stairs and silhouette','alphaSource':'common terrain master, never independent detail alpha'})
final=np.zeros((H,W,4),dtype='uint8');final[:,:,:3]=np.uint8(np.clip(total/weights[:,:,None],0,255));final[:,:,3]=rgba[:,:,3]
final[final[:,:,3]==0]=0
atlas=Image.fromarray(final);atlas.save(OUT/'terrain-atlas.png');preview=atlas.copy();preview.thumbnail((1100,800));preview.save(OUT/'terrain-alpha-preview.png')
(OUT/'detail-registration.json').write_text(json.dumps(reports,indent=2)+'\n')
for folder in ['terrain-png','terrain-webp']:(OUT/folder).mkdir(exist_ok=True)
tiles=[];reassembled=Image.new('RGBA',(W,H))
for y in range(0,H,512):
 for x in range(0,W,512):
  w,h=min(512,W-x),min(512,H-y);cell=atlas.crop((x,y,x+w,y+h))
  if not cell.getchannel('A').getbbox():continue
  key=f'{x//512}-{y//512}';png=f'terrain-png/{key}.png'
  g=2;ext=atlas.crop((max(0,x-g),max(0,y-g),min(W,x+w+g),min(H,y+h+g)));ext.save(OUT/png)
  reassembled.paste(Image.open(OUT/png).crop((min(x,g),min(y,g),min(x,g)+w,min(y,g)+h)),(x,y))
  webp=f'terrain-webp/{key}.webp';ext.save(OUT/webp,lossless=True,exact=True,method=4)
  tiles.append({'id':key,'png':png,'src':webp,'rect':[x,y,w,h],'crop':[min(x,g),min(y,g),w,h],'size':list(ext.size),'decodedBytes':ext.width*ext.height*4,'fileBytes':(OUT/webp).stat().st_size})
equal=np.array_equal(np.asarray(reassembled),final);assert equal,'Exported PNG cells do not reconstruct the atlas'
runtime=Image.new('RGBA',(W,H))
for tile in tiles:
 x,y,w,h=tile['rect'];u,v,cw,ch=tile['crop'];im=Image.open(OUT/tile['src']).convert('RGBA');runtime.paste(im.crop((u,v,u+cw,v+ch)),(x,y))
runtime_equal=np.array_equal(np.asarray(runtime),final);assert runtime_equal,'WebP inner cells differ from the atlas'
manifest={'world':[W,H],'tiles':tiles,'tileSize':512,'gutter':2,'sourceGuideSize':[MW,MH],'terrainMaster':'terrain-atlas.png','background':None,'liquids':[]}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
report={'atlasSize':[W,H],'tileCount':len(tiles),'pngReassemblyPixelExact':equal,'webpReassemblyPixelExact':runtime_equal,'maxDecodedTileBytes':max(t['decodedBytes'] for t in tiles),'webpTotalFileBytes':sum(t['fileBytes'] for t in tiles),'alphaUnchangedFromSharedGuide':bool(np.array_equal(final[:,:,3],rgba[:,:,3])),'independentTileGenerations':False,'atlasSha256':hashlib.sha256((OUT/'terrain-atlas.png').read_bytes()).hexdigest()}
(OUT/'tile-review.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
