from pathlib import Path
import json, hashlib
import numpy as np, cv2
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1]; W,H=9830,6554
src=Path('/Users/agapae/agapae-work/.codex-worktrees/20261110T115811Z-6ad6e037/docs/art-reviews/2026-11-05-z1-v5-hd-assemble/v7')
manifest=json.loads((R/'input/v7-manifest.json').read_text()); base=Image.new('RGB',(W,H))
for f in manifest['files']:
 if 'rectPx2x' in f:
  x,y,w,h=f['rectPx2x'];base.paste(Image.open(src/f['file']),(x,y))
# Local reference only, sufficient for preview; final cloud pixels never come from this image.
for vid,box in [('heaven',(6900,410,8180,1130)),('left-edge',(0,2600,1280,3320)),('central-valley',(5100,400,6380,1120))]:
 base.crop(box).save(R/'input'/f'{vid}-base.webp',quality=94)
im=np.array(base.resize((4915,3277),Image.Resampling.LANCZOS));h,w=im.shape[:2]
# Traced on review proxy 1500x1000. Gate selects pale/lavender cloud, not warm rock/foliage.
regions=[
 ('western-ridge-mist',[(350,73),(397,55),(430,65),(460,54),(495,66),(531,56),(555,77),(552,102),(512,110),(476,97),(437,116),(400,97),(372,122),(350,104)]),
 ('central-cloud-deck',[(555,47),(616,38),(659,41),(709,29),(751,39),(782,53),(775,91),(748,124),(721,139),(704,102),(676,100),(660,87),(636,106),(604,92),(585,89)]),
 ('heaven-west-valley',[(748,87),(787,63),(819,58),(850,48),(871,53),(858,76),(841,95),(831,128),(846,161),(871,179),(872,208),(894,219),(896,247),(870,243),(843,231),(825,204),(811,186),(797,159),(790,130),(769,125)]),
 ('heaven-east-cloud-deck',[(1004,38),(1055,34),(1106,47),(1148,55),(1193,69),(1233,52),(1254,65),(1237,107),(1210,131),(1190,152),(1155,142),(1138,110),(1104,103),(1080,90),(1045,79)]),
 ('central-cliff-hollow',[(961,260),(977,254),(994,270),(1016,276),(1026,300),(1005,312),(980,307),(968,287)]),
 ('west-border-upper',[(0,281),(22,287),(37,311),(51,323),(41,350),(16,358),(0,345)]),
]
hsv=cv2.cvtColor(im,cv2.COLOR_RGB2HSV); rr,gg,bb=im.transpose(2,0,1).astype(float)
gray=cv2.cvtColor(im,cv2.COLOR_RGB2GRAY).astype('float32'); localstd=np.sqrt(np.maximum(0,cv2.blur(gray*gray,(15,15))-cv2.blur(gray,(15,15))**2))
gate=((hsv[:,:,1]<78)&(rr>160)&(gg>148)&(bb>rr*.86)&(localstd<24)).astype('uint8')*255
m=np.maximum(np.array(Image.open(R/'input/legacy-fog-1x.png')),np.array(Image.open(R/'input/legacy-cloud-sea-1x.png')))
items=[]
for ident,poly in regions:
 roi=np.zeros((h,w),np.uint8); cv2.fillPoly(roi,[np.rint(np.array(poly)*[w/1500,h/1000]).astype('int32')],255)
 sel=cv2.bitwise_and(roi,gate);sel=cv2.morphologyEx(sel,cv2.MORPH_CLOSE,np.ones((13,13),np.uint8));sel=cv2.GaussianBlur(sel,(0,0),3);sel[roi==0]=0
 m=np.maximum(m,sel); items.append({'id':ident,'polygonProxy1500':poly})
# Exclude whole conservative source bounding boxes + 8 master-px guard.
ex=np.zeros((h,w),np.uint8); excluded=[]
for a in json.loads((R/'input/white-lumps.json').read_text())['lumps']:
 if 'delete' in a['review']:
  x,y,bw,bh=a['masterPx'];ex[max(0,y-8):y+bh+8,max(0,x-8):x+bw+8]=255;excluded.append(a['id'])
# Ice snow is outside all added ROIs. Legacy mist there is also protected by exclusions.
m[ex>0]=0
# Distance feather stays inside support and does not leak into exclusions.
d=cv2.distanceTransform((m>0).astype('uint8'),cv2.DIST_L2,3); m=np.rint(m*np.clip(d/12,0,1)).astype('uint8')
m2=cv2.resize(m,(W,H),interpolation=cv2.INTER_LINEAR);ex2=cv2.resize(ex,(W,H),interpolation=cv2.INTER_NEAREST);m2[ex2>0]=0
Image.fromarray(m2).save(R/'cloud-layer-mask.png');Image.fromarray(ex2).save(R/'input/exclusion-mask.png')
quarters=[]
for row in range(4):
 for col in range(5):
  cw,ch=min(2048,W-col*2048),min(2048,H-row*2048)
  for qy in range(2):
   for qx in range(2):
    x,y=col*2048+qx*1024,row*2048+qy*1024;qw,qh=min(1024,W-x),min(1024,H-y, ch-qy*1024)
    if qw<=0 or qh<=0:continue
    a=m2[y:y+qh,x:x+qw]; count=int(np.count_nonzero(a))
    if count<100:continue
    ident=f'r{row+1}-c{col+1}-q{qy*2+qx+1}'
    # 32px context for assembly seams; output quarter footprint remains exact.
    rect=[max(0,x-32),max(0,y-32),min(W,x+qw+32),min(H,y+qh+32)]
    quarters.append({'id':ident,'rectPx2x':[x,y,qw,qh],'contextBoxPx2x':rect,'coveredPixels':count})
    ref=base.crop(tuple(rect)); ref.thumbnail((1088,1088));ref.save(R/'input'/f'{ident}-reference.jpg',quality=88)
json.dump({'fullPx':[W,H],'worldSize':[3840,2560],'chunk':2048,'regions':items,'excludedLumps':excluded,'quarters':quarters},open(R/'regions.json','w'),indent=2)
review=im.copy();a=m.astype(float)/255*.7;review=np.rint(review*(1-a[:,:,None])+np.array([235,40,225])*a[:,:,None]).astype('uint8'); Image.fromarray(review).resize((1500,1000)).save(R/'previews/mask-review.jpg',quality=91)
print('quarters',len(quarters),[(q['id'],q['coveredPixels']) for q in quarters]);print('mask pixels',np.count_nonzero(m2),'excluded',len(excluded))
